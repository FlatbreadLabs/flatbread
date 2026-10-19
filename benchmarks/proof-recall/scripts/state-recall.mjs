#!/usr/bin/env node
// The free offline gate for `proof state`: reads the state of each
// question's Effort and checks whether the answer is in it, before any paid
// agent run. It scores the way find-recall.mjs scores cards.
//
//   node scripts/state-recall.mjs [--graph <built-graph-dir>] [--ids a,b]
//        [--only ambiguous] [--split tune|holdout|all] [--out <json>]
//
// For each question it reads `proof state <effortId>` for the question's own
// Effort. For a question in a multi-Effort set (cross-Effort, ambiguous
// Effort), it reads the state of every Effort that its evidence and answer
// records belong to, and joins the outputs. `state` takes no query, so each
// Effort is read once and its output reused for every question about it.
//
// Per question it records:
//   answer_on_output  the loose rule, that of answer_on_card in
//                     find-recall.mjs: every answer id appears anywhere, or
//                     the gold value or an accepted alternative appears as a
//                     whole token. Null for count, boolean, text, and
//                     "unknown" answers. A value answer is also set aside
//                     (null) when it appears in more than 10% of the outputs
//                     for questions about other Efforts, since the state
//                     prints it whatever the question. Outputs of the same
//                     Efforts are left out of that comparison: they are the
//                     same text, so they would always match.
//   answer_strict     the strict rule. A value answer scores as above. The
//                     state prints about 90 ids on a large Effort, so an id
//                     somewhere in it is not yet the answer. A record answer
//                     scores only when each answer id is placed where a
//                     reader could pick it out, in one of two ways:
//                     - next to the question's subject: it shares an entry
//                       (a top-level list item and the lines indented under
//                       it) with an evidence id that is not an answer and
//                       not the Effort; or
//                     - set apart: some section that lists it lists no other
//                       record of the same sort that is not an answer, as
//                       when "Open Issues" lists exactly the open Issues the
//                       question asks for. A sort is what the state prints
//                       beside an id: its kind and standing, and for Issues
//                       and Constraints their own kind (blocker, hard, …).
//   output_chars      the length of what the CLI printed, the JSON envelope
//                     with the Markdown inside it, summed over joined
//                     Efforts, with the temporary folder's path removed so
//                     the length does not depend on the machine
//
// The bar for the paid Run D: on the holdout split, the strict rule finds the
// answer for at least 60% of the questions in the aggregate, lifecycle,
// blocker, and dead-evidence categories taken together (each question once),
// with a mean output of at most 16,000 characters on the 10x graph. The table
// also prints the loose rate, and both rates by answer kind.
//
// `--split` works as in find-recall.mjs: read tune misses to decide what to
// change in `state`, and score holdout once the change is done. The chance
// rates always come from every question, so a split's rows are its part of
// an `all` run. Questions are read only to score; nothing here tunes `state`.
//
// The graph is copied, without its key map, into a temporary folder, and one
// `proof serve` there answers every read. The folder is removed at the end.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MULTI_EFFORT_SETS, RUNS_DIR, pickQuestions } from './check.mjs';
import { stateHash } from './collect.mjs';
import {
  answerOnCard,
  CHANCE_CUTOFF,
  flatbread,
  pct,
  rate,
  serverAnswers,
  sleep,
  splitOf,
  targets,
  valueForms,
} from './find-recall.mjs';
import { loadGraph, qualify } from './graph.mjs';
import { prepareFolder } from './prepare-run.mjs';

const BENCH = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPLITS = ['tune', 'holdout', 'all'];
const BAR = {
  categories: ['aggregate', 'lifecycle', 'blocker', 'dead-evidence'],
  answer_strict: 0.6,
  mean_output_chars: 16000,
};

/**
 * The entries of a state's Markdown: each top-level `- ` line with the
 * indented lines under it. Headings and section intros are not entries.
 */
function entries(markdown) {
  const out = [];
  for (const line of markdown.split('\n')) {
    if (line.startsWith('- ')) out.push(line);
    else if (line.startsWith('  ') && out.length)
      out[out.length - 1] += `\n${line}`;
    else out.push('');
  }
  return out.filter(Boolean);
}

/** A record id as the state prints one. Efforts are left out. */
const RECORD_ID =
  /\b(?:iss|dec|fnd|con|rsk|cit|blb)-[a-z0-9-]+?--[a-z0-9]{16}\b/g;

/** A record's standing, as `proof state` shows it in parentheses. */
function standing(record) {
  const fm = record?.frontmatter ?? {};
  const some = (value) => [value].flat().filter(Boolean).length > 0;
  if (fm.retracted === true) return 'retracted';
  if (some(fm.superseded_by)) return 'superseded';
  if (some(fm.invalidated_by)) return 'invalidated';
  if (record?.kind === 'issue') return String(fm.status ?? 'open');
  if (record?.kind === 'decision' || record?.kind === 'risk')
    return String(fm.state ?? 'proposed');
  return 'live';
}

/** The strict rule for a record answer; see the header. */
function answerStrict(graph, answers, evidence, markdown) {
  const context = [...evidence].filter(
    (id) => id && !answers.includes(id) && !id.startsWith('eff-')
  );
  const blocks = entries(markdown);
  const nextToSubject = (id) =>
    blocks.some(
      (block) =>
        block.includes(id) && context.some((other) => block.includes(other))
    );
  const sections = markdown.split(/\n### /);
  const sort = (id) => {
    const record = graph.records.get(id);
    const own = ['issue', 'constraint'].includes(record?.kind)
      ? record.frontmatter.kind
      : '';
    return `${record?.kind}:${standing(record)}:${own ?? ''}`;
  };
  const setApart = (id) =>
    sections.some(
      (part) =>
        part.includes(id) &&
        [...new Set(part.match(RECORD_ID) ?? [])].every(
          (other) => answers.includes(other) || sort(other) !== sort(id)
        )
    );
  return answers.every((id) => nextToSubject(id) || setApart(id));
}

function args(argv) {
  const out = {
    graph: join(BENCH, '.flatbread-proof'),
    ids: [],
    only: [],
    out: join(RUNS_DIR, 'state-recall.json'),
    split: 'all',
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--graph') out.graph = resolve(argv[++i]);
    else if (flag === '--ids') out.ids = argv[++i].split(',');
    else if (flag === '--only') out.only = argv[++i].split(',');
    else if (flag === '--out') out.out = resolve(argv[++i]);
    else if (flag === '--split') out.split = argv[++i];
    else throw new Error(`Unknown argument ${flag}`);
  }
  if (!SPLITS.includes(out.split))
    throw new Error(`--split must be one of ${SPLITS.join(', ')}`);
  return out;
}

/** The Effort keys a question is about: its own, or its records' Efforts. */
function effortsOf(setEffort, q) {
  if (!MULTI_EFFORT_SETS.includes(setEffort)) return [setEffort];
  const keys = [
    ...(q.evidence ?? []),
    ...(['record', 'records'].includes(q.answer.kind)
      ? [q.answer.value].flat()
      : []),
  ];
  return [
    ...new Set(keys.map((key) => qualify(setEffort, key).split('.')[0])),
  ].sort();
}

function tally(rows) {
  const chars = rows.map((r) => r.output_chars);
  return {
    n: rows.length,
    answer_on_output: rate(rows, 'answer_on_output'),
    answer_strict: rate(rows, 'answer_strict'),
    set_aside_by_chance: rows.filter((r) => r.chance_rate > CHANCE_CUTOFF)
      .length,
    mean_output_chars: Math.round(
      chars.reduce((a, b) => a + b, 0) / (chars.length || 1)
    ),
    max_output_chars: Math.max(0, ...chars),
  };
}

function printTable(label, groups) {
  console.log(`\n${label}`);
  console.log(
    'group'.padEnd(24) +
      'n'.padStart(5) +
      'scored'.padStart(8) +
      'loose'.padStart(8) +
      'scored'.padStart(8) +
      'strict'.padStart(8) +
      'chance'.padStart(8) +
      'chars'.padStart(8) +
      'max'.padStart(8)
  );
  for (const [name, t] of Object.entries(groups))
    console.log(
      name.padEnd(24) +
        String(t.n).padStart(5) +
        String(t.answer_on_output.n).padStart(8) +
        pct(t.answer_on_output).padStart(8) +
        String(t.answer_strict.n).padStart(8) +
        pct(t.answer_strict).padStart(8) +
        String(t.set_aside_by_chance).padStart(8) +
        String(t.mean_output_chars).padStart(8) +
        String(t.max_output_chars).padStart(8)
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
  if (graph.records.size < 1000)
    console.log(
      `Note: this graph holds ${graph.records.size} records. The bar that ` +
        'counts is the one on the 10x graph (--graph <x10 build>).'
    );
  const state_hash = await stateHash();
  const jobs = [];
  for (const set of await pickQuestions(options))
    for (const q of set.questions)
      jobs.push({ q, effort: set.effort, efforts: effortsOf(set.effort, q) });

  const folder = await mkdtemp(join(tmpdir(), 'state-recall-'));
  const socket = join(folder, 'serve.sock');
  await prepareFolder(folder, [], options.graph);
  const server = spawn(
    join(folder, 'flatbread'),
    ['proof', 'serve', '--socket', socket],
    { cwd: folder, stdio: 'ignore' }
  );
  const outputs = new Map();
  try {
    for (let i = 0; !(await serverAnswers(socket)); i++) {
      if (i > 600) throw new Error('proof serve did not start');
      await sleep(200);
    }
    for (const key of [...new Set(jobs.flatMap((job) => job.efforts))].sort())
      outputs.set(
        key,
        await flatbread(folder, ['proof', 'state', effortIds[key]], {
          FLATBREAD_PROOF_SERVER: socket,
        })
      );
  } finally {
    server.kill();
    await rm(folder, { recursive: true, force: true });
  }

  const rows = jobs.map(({ q, effort, efforts }) => {
    const printed = efforts.map((key) => outputs.get(key));
    const text = printed.map((out) => JSON.parse(out).markdown).join('\n\n');
    const { answers, evidence } = targets(graph, effort, q);
    const loose = answerOnCard(q, answers, text);
    return {
      id: q.id,
      effort,
      efforts,
      categories: q.categories,
      answer_kind: q.answer.kind,
      answer_on_output: loose,
      answer_strict: answers.length
        ? answerStrict(graph, answers, evidence, text)
        : loose,
      output_chars: printed.reduce(
        (sum, out) => sum + out.split(folder).join('.').length,
        0
      ),
      chance_rate: null,
      q,
      text,
    };
  });
  // A value the state prints for other Efforts' questions too shows by chance.
  for (const row of rows) {
    const forms = valueForms(row.q);
    if (!forms) continue;
    const others = rows.filter(
      (r) => r.id !== row.id && !r.efforts.some((e) => row.efforts.includes(e))
    );
    if (!others.length) continue;
    const hits = others.filter((r) =>
      forms.some((form) => form.test(r.text))
    ).length;
    row.chance_rate = +(hits / others.length).toFixed(3);
    if (row.chance_rate > CHANCE_CUTOFF)
      row.answer_on_output = row.answer_strict = null;
  }
  for (const row of rows) {
    delete row.q;
    delete row.text;
  }

  const inSplit = (id) =>
    options.split === 'all' || splitOf(id) === options.split;
  const kept = rows.filter((r) => inSplit(r.id));
  const groups = { all: tally(kept) };
  const target = kept.filter((r) =>
    r.categories.some((c) => BAR.categories.includes(c))
  );
  groups['bar categories'] = tally(target);
  groups['  value answers'] = tally(
    target.filter((r) => !['record', 'records'].includes(r.answer_kind))
  );
  groups['  record answers'] = tally(
    target.filter((r) => ['record', 'records'].includes(r.answer_kind))
  );
  const byCategory = {};
  for (const r of kept)
    for (const c of r.categories) (byCategory[c] ??= []).push(r);
  for (const [c, group] of Object.entries(byCategory).sort(([a], [b]) =>
    a.localeCompare(b)
  ))
    groups[c] = tally(group);
  printTable(
    `graph ${options.graph}, split ${options.split} (${kept.length} questions)`,
    groups
  );
  const t = groups['bar categories'];
  const all = groups.all;
  const pass =
    options.split !== 'tune' &&
    t.answer_strict.rate >= BAR.answer_strict &&
    all.mean_output_chars <= BAR.mean_output_chars;
  console.log(
    `\nRun D bar (${BAR.categories.join(
      ', '
    )}): answer found by the strict rule for ${pct(t.answer_strict)} of ${
      t.answer_strict.n
    } scored (needs ${
      BAR.answer_strict * 100
    }% on holdout; the loose rule, any id anywhere, finds ${pct(
      t.answer_on_output
    )} of ${t.answer_on_output.n}); mean output ${
      all.mean_output_chars
    } characters (needs at most ${BAR.mean_output_chars}).${
      options.split === 'holdout' ? ` ${pass ? 'PASS' : 'FAIL'}` : ''
    }`
  );
  const efforts = Object.fromEntries(
    [...outputs].map(([key, out]) => [key, out.split(folder).join('.').length])
  );
  await writeFile(
    options.out,
    `${JSON.stringify(
      {
        graph: options.graph,
        split: options.split,
        questions: kept.length,
        state_hash,
        bar: { ...BAR, chance_cutoff: CHANCE_CUTOFF, pass },
        output_chars_by_effort: efforts,
        groups,
        rows: kept,
      },
      null,
      2
    )}\n`
  );
  console.log(`state_hash ${state_hash}\nWrote ${options.out}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
