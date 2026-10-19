#!/usr/bin/env node
// The free offline gate: asks the real `proof find` every question and checks
// whether its top hits hold the evidence, before any paid agent run.
//
//   node scripts/find-recall.mjs [--graph <built-graph-dir>] [--ids a,b]
//        [--out <json>] [--jobs 8]
//
// The gate verdict that counts is the one on the 10x graph, given with
// `--graph <x10 build>`. The default, the committed 1x graph, is a quick
// check; the script says so when the graph holds fewer than 1000 records.
//
// Three query sets, each one `find` per question:
//   raw       the question text, with --all
//   stripped  the question text without Effort titles, the words just before
//             "Effort" that name one ("the co-op netcode Effort"), Effort code
//             names, or platform names, with --all. Topic words that an
//             Effort title also uses, such as "build farm", stay elsewhere.
//   scoped    the question text, with --effort set to the question's Effort
//             (cross-Effort questions are skipped)
// The plan asked for a third set of queries taken from pilot transcripts.
// No pilot ran `proof find`, so none exist; `scoped` stands in until a find
// pilot gives real agent queries.
//
// Per question and set it records:
//   evidence_top5       a top-5 hit's id or matched_id is one of the
//                       question's evidence records or answer records. Only
//                       the hit itself and the version `find` matched count,
//                       not older versions in its chain, because a card may
//                       elide those ("(2 more)").
//   answer_on_card      record answers: every answer id appears in the
//                       cards. Value answers: the gold value or an accepted
//                       alternative appears as a whole token, ignoring case;
//                       an alternative that is the gold's number without its
//                       unit ("61" for "61 MB/s") is dropped. Null for count,
//                       boolean, text, and "unknown" answers, which no card
//                       can show, and for value answers that match more than
//                       10% of the other questions' cards in the same set
//                       (`chance_rate`), since a card shows those by
//                       accident: "2", "6", "accepted". With --ids, the
//                       rates come from the chosen questions only.
//   right_effort_first  the top Effort in `efforts by match` is the
//                       question's own (single-Effort questions, --all sets)
//   reply_chars, cards_chars
//
// The gate passes when, on the stripped set, evidence_top5 holds for at least
// 75% of questions and answer_on_card for at least 60% of those it applies
// to. Questions are read only to score; nothing here tunes `find`. The output
// records `find_hash`, a hash of the `find` source, so a later run file can
// be checked against the search this gate measured.
//
// The graph is copied, without its key map, into a temporary folder, and one
// `proof serve` there answers every query. The folder is removed at the end.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQuestions } from './check.mjs';
import { findHash } from './collect.mjs';
import { loadGraph, qualify } from './graph.mjs';
import { prepareFolder } from './prepare-run.mjs';

const BENCH = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SETS = ['raw', 'stripped', 'scoped'];
// Names that point at one Effort or platform without its full title. The
// Effort titles themselves come from the graph.
const NAMES = ['Kestrel', 'Lantern', 'PC', 'Meridian', 'Skiff'];
// Words that name an Effort when they stand right before "Effort", besides
// the words of its title: "the render Effort", "the world Effort".
const EFFORT_WORDS = ['render', 'world', 'ports', 'netcode', 'tools'];
const GATE = { evidence_top5: 0.75, answer_on_card: 0.6 };
// A value answer that matches more than this share of other questions' cards
// is set aside: a card shows it by accident.
const CHANCE_CUTOFF = 0.1;

function args(argv) {
  const out = {
    graph: join(BENCH, '.flatbread-proof'),
    ids: [],
    out: join(BENCH, 'runs', 'find-recall.json'),
    jobs: 8,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--graph') out.graph = resolve(argv[++i]);
    else if (flag === '--ids') out.ids = argv[++i].split(',');
    else if (flag === '--out') out.out = resolve(argv[++i]);
    else if (flag === '--jobs') out.jobs = Number(argv[++i]);
    else throw new Error(`Unknown argument ${flag}`);
  }
  return out;
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function serverAnswers(socket) {
  return new Promise((answer) => {
    const req = request({ socketPath: socket, path: '/' }, (res) => {
      res.resume();
      answer(true);
    });
    req.on('error', () => answer(false));
    req.end();
  });
}

/** Runs `./flatbread` in `folder`; resolves with stdout. */
function flatbread(folder, argv, env = {}) {
  return new Promise((done, fail) => {
    const child = spawn(join(folder, 'flatbread'), argv, {
      cwd: folder,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code) =>
      code === 0
        ? done(stdout)
        : fail(new Error(`flatbread ${argv.join(' ')}: ${stderr}`))
    );
  });
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Question text with every Effort title and short name taken out. */
export function stripNames(text, titles) {
  const nameWords = new Set([
    ...titles.flatMap((title) => title.toLowerCase().split(/\s+/)),
    ...EFFORT_WORDS,
  ]);
  // "the co-op netcode Effort" becomes "the Effort".
  let out = text.replace(/(?:[\w-]+ )+(?=Effort\b)/g, (run) => {
    const words = run.trim().split(' ');
    while (words.length && nameWords.has(words.at(-1).toLowerCase()))
      words.pop();
    return words.length ? `${words.join(' ')} ` : '';
  });
  for (const name of [...titles, ...NAMES])
    out = out.replace(new RegExp(`\\b${escape(name)}(?:'s)?\\b`, 'gi'), ' ');
  return out
    .replace(/"\s*"/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/ ([?.,;:!])/g, '$1')
    .trim();
}

const list = (value) =>
  Array.isArray(value) ? value : value === undefined ? [] : [value];

/** Record ids that count as evidence, and the answer ids, for a question. */
function targets(graph, effort, q) {
  const id = (key) => graph.keymap[qualify(effort, key)];
  const answers = ['record', 'records'].includes(q.answer.kind)
    ? list(q.answer.value).map(id)
    : [];
  return {
    evidence: new Set([...(q.evidence ?? []).map(id), ...answers]),
    answers,
  };
}

const bareNumber = (text) => /^[\d.,]+$/.test(text);
const number = (text) => Number(text.replace(/,/g, ''));

/**
 * Patterns for the forms of a value answer a card may show: the gold and its
 * accepted alternatives, each as a whole token, so "6" does not match "16"
 * or "6.2". Null when no card can show the answer.
 */
function valueForms(q) {
  const { kind, value, accept } = q.answer;
  if (kind !== 'value' || String(value).toLowerCase() === 'unknown')
    return null;
  const gold = String(value);
  // "61" for "61 MB/s" is the gold without its unit, and too easy to match;
  // "0.52" for "52 percent" is another way to write it, and stays.
  const lead = bareNumber(gold) ? null : gold.match(/^[\d.,]+/)?.[0];
  const unitless = (form) =>
    Boolean(lead) && bareNumber(form) && number(form) === number(lead);
  const forms = [gold, ...(accept ?? []).map(String)].filter(
    (form) => !unitless(form)
  );
  return forms.map(
    (form) => new RegExp(`(?<![\\w.-])${escape(form)}(?![\\w-]|\\.\\d)`, 'i')
  );
}

/** True, false, or null (no card can show it) for one question's cards. */
function answerOnCard(q, answers, cards) {
  const { kind } = q.answer;
  if (kind === 'record' || kind === 'records')
    return answers.every((id) => cards.includes(id));
  const forms = valueForms(q);
  return forms ? forms.some((form) => form.test(cards)) : null;
}

/**
 * For each value answer, the share of the other questions' cards in the same
 * set that it matches. Above CHANCE_CUTOFF, its answer_on_card becomes null.
 */
function setAsideChance(rows) {
  for (const row of rows) {
    const forms = valueForms(row.q);
    if (!forms) continue;
    const others = rows.filter((r) => r.set === row.set && r.id !== row.id);
    if (!others.length) continue;
    const hits = others.filter((r) =>
      forms.some((form) => form.test(r.cards))
    ).length;
    row.chance_rate = +(hits / others.length).toFixed(3);
    if (row.chance_rate > CHANCE_CUTOFF) row.answer_on_card = null;
  }
  for (const row of rows) {
    delete row.q;
    delete row.cards;
  }
}

function scoreReply(graph, effortIds, row, stdout) {
  const reply = JSON.parse(stdout);
  const top5 = reply.find.hits.slice(0, 5);
  const { evidence, answers } = targets(graph, row.effort, row.q);
  return {
    id: row.q.id,
    set: row.set,
    effort: row.effort,
    categories: row.q.categories,
    query: row.query,
    evidence_top5: top5.some(
      (hit) => evidence.has(hit.id) || evidence.has(hit.matched_id)
    ),
    answer_on_card: answerOnCard(row.q, answers, reply.cards),
    right_effort_first:
      row.set === 'scoped' || row.effort === 'cross'
        ? null
        : reply.find.efforts?.[0]?.id === effortIds[row.effort],
    reply_chars: stdout.length,
    cards_chars: reply.cards.length,
    hits: top5.map((hit) => hit.matched_id ?? hit.id),
    chance_rate: null,
    // Kept until every reply is in, to measure chance matches; then dropped.
    q: row.q,
    cards: reply.cards,
  };
}

function rate(rows, field) {
  const known = rows.filter((r) => r[field] !== null);
  if (!known.length) return { n: 0, rate: null };
  const yes = known.filter((r) => r[field]).length;
  return { n: known.length, yes, rate: +(yes / known.length).toFixed(3) };
}

function tally(rows) {
  const chars = rows.map((r) => r.reply_chars);
  return {
    n: rows.length,
    evidence_top5: rate(rows, 'evidence_top5'),
    answer_on_card: rate(rows, 'answer_on_card'),
    set_aside_by_chance: rows.filter((r) => r.chance_rate > CHANCE_CUTOFF)
      .length,
    right_effort_first: rate(rows, 'right_effort_first'),
    mean_reply_chars: Math.round(
      chars.reduce((a, b) => a + b, 0) / (chars.length || 1)
    ),
  };
}

const pct = (r) => (r.rate === null ? '   -' : `${Math.round(r.rate * 100)}%`);

function printTable(label, groups) {
  console.log(`\n${label}`);
  console.log(
    'group'.padEnd(24) +
      'n'.padStart(5) +
      'ev@5'.padStart(7) +
      'card'.padStart(7) +
      'effort1'.padStart(9) +
      'chars'.padStart(8)
  );
  for (const [name, t] of Object.entries(groups))
    console.log(
      name.padEnd(24) +
        String(t.n).padStart(5) +
        pct(t.evidence_top5).padStart(7) +
        pct(t.answer_on_card).padStart(7) +
        pct(t.right_effort_first).padStart(9) +
        String(t.mean_reply_chars).padStart(8)
    );
}

async function main() {
  const options = args(process.argv.slice(2));
  const graph = await loadGraph(options.graph);
  const effortIds = Object.fromEntries(
    Object.entries(graph.keymap)
      .filter(([key]) => key.endsWith('.effort'))
      .map(([key, id]) => [key.split('.')[0], id])
  );
  const titles = Object.values(effortIds).map(
    (id) => graph.records.get(id).frontmatter.title
  );
  if (graph.records.size < 1000)
    console.log(
      `Note: this graph holds ${graph.records.size} records. The gate verdict ` +
        'that counts is the one on the 10x graph (--graph <x10 build>).'
    );
  const find_hash = await findHash();
  const wanted = new Set(options.ids);
  const jobs = [];
  for (const set of await loadQuestions())
    for (const q of set.questions) {
      if (wanted.size && !wanted.has(q.id)) continue;
      const row = { q, effort: set.effort };
      jobs.push({ ...row, set: 'raw', query: q.question, scope: ['--all'] });
      jobs.push({
        ...row,
        set: 'stripped',
        query: stripNames(q.question, titles),
        scope: ['--all'],
      });
      if (set.effort !== 'cross')
        jobs.push({
          ...row,
          set: 'scoped',
          query: q.question,
          scope: ['--effort', effortIds[set.effort]],
        });
    }

  const folder = await mkdtemp(join(tmpdir(), 'find-recall-'));
  const socket = join(folder, 'serve.sock');
  await prepareFolder(folder, [], options.graph);
  const server = spawn(
    join(folder, 'flatbread'),
    ['proof', 'serve', '--socket', socket],
    { cwd: folder, stdio: 'ignore' }
  );
  const rows = [];
  try {
    for (let i = 0; !(await serverAnswers(socket)); i++) {
      if (i > 600) throw new Error('proof serve did not start');
      await sleep(200);
    }
    const todo = [...jobs];
    const worker = async () => {
      for (let job = todo.shift(); job; job = todo.shift()) {
        const stdout = await flatbread(
          folder,
          ['proof', 'find', job.query, ...job.scope],
          { FLATBREAD_PROOF_SERVER: socket }
        );
        rows.push(scoreReply(graph, effortIds, job, stdout));
      }
    };
    await Promise.all(Array.from({ length: options.jobs }, worker));
  } finally {
    server.kill();
    await rm(folder, { recursive: true, force: true });
  }

  setAsideChance(rows);
  const order = new Map(jobs.map((job, i) => [`${job.set} ${job.q.id}`, i]));
  rows.sort(
    (a, b) => order.get(`${a.set} ${a.id}`) - order.get(`${b.set} ${b.id}`)
  );
  const bySet = Object.fromEntries(
    SETS.map((set) => [set, tally(rows.filter((r) => r.set === set))])
  );
  printTable(`graph ${options.graph}`, bySet);
  console.log(
    `Value answers set aside by chance: ${SETS.map(
      (set) => `${set} ${bySet[set].set_aside_by_chance}`
    ).join(', ')}`
  );
  const byCategory = {};
  for (const set of SETS) {
    const groups = {};
    for (const r of rows.filter((row) => row.set === set))
      for (const c of r.categories) (groups[c] ??= []).push(r);
    byCategory[set] = Object.fromEntries(
      Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([c, group]) => [c, tally(group)])
    );
  }
  printTable('stripped set, by category', byCategory.stripped);

  const s = bySet.stripped;
  const pass =
    s.evidence_top5.rate >= GATE.evidence_top5 &&
    s.answer_on_card.rate >= GATE.answer_on_card;
  console.log(
    `\nGate ${pass ? 'PASS' : 'FAIL'}: stripped evidence_top5 ${pct(
      s.evidence_top5
    )} (needs ${GATE.evidence_top5 * 100}%), answer_on_card ${pct(
      s.answer_on_card
    )} (needs ${GATE.answer_on_card * 100}%)`
  );
  await writeFile(
    options.out,
    `${JSON.stringify(
      {
        graph: options.graph,
        find_hash,
        gate: { ...GATE, chance_cutoff: CHANCE_CUTOFF, pass },
        bySet,
        byCategory,
        rows,
      },
      null,
      2
    )}\n`
  );
  console.log(`find_hash ${find_hash}\nWrote ${options.out}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
