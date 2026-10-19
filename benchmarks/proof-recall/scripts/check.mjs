#!/usr/bin/env node
// Validates the question set against the built graph, then prints coverage.
// Exits 1 on any error, so authors can loop on it.
//
//   node scripts/check.mjs                    all question files
//   node scripts/check.mjs --only render      one question set
//   node scripts/check.mjs --graph /tmp/x     a graph built elsewhere
//
// This script checks every file, including the opt-in sets in OPT_IN_SETS.
// Other scripts load those only when asked for them by name.
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isCompaction } from '@flatbread/proof';
import {
  hasEdge,
  idFor,
  loadGraph,
  qualify,
  runCheck,
  sameAnswer,
  shortestHops,
  standing,
} from './graph.mjs';

const BENCH = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Where question files and run files live. `PROOF_RECALL_QUESTIONS` and
 * `PROOF_RECALL_RUNS` point them outside this folder, so a question set
 * about a private graph can be checked and run without ever entering the
 * repository.
 */
export const QUESTIONS_DIR = process.env.PROOF_RECALL_QUESTIONS
  ? resolve(process.env.PROOF_RECALL_QUESTIONS)
  : join(BENCH, 'questions');
export const RUNS_DIR = process.env.PROOF_RECALL_RUNS
  ? resolve(process.env.PROOF_RECALL_RUNS)
  : join(BENCH, 'runs');
export const CATEGORIES = [
  'current-state', // what holds now
  'lookup', // a fact stated in one record
  'supersession', // follow a replacement chain
  'invalidation', // evidence or a choice shown wrong
  'rejected-alternative', // why an option lost, or which options lost
  'reopened', // a rejected option brought back
  'retraction', // noise removed from browse reads
  'dead-evidence', // live records resting on dead support
  'lifecycle', // Issue, Risk, and Effort transitions
  'blocker', // open blockers and the choices they gate
  'temporal', // what held at a past moment
  'aggregate', // sets and counts across the Effort
  'blob', // facts only in attached payloads
  'truncation', // facts past the browse excerpt
  'compaction', // trusting or doubting the summary
  'negative', // the graph does not say, or the premise is false
  'distractor', // a similar record in another Effort or thread
  'cross-effort', // needs records from two Efforts
  'rationale', // explain why, scored by rubric
  // Rewritten so it names no Effort and uses words several Efforts share;
  // the reader must find the right Effort first. Only in ambiguous.json.
  'ambiguous-effort',
];
// Question files whose `effort` names no Effort: their questions span
// several, so every key is qualified as `<effort>.<key>`.
export const MULTI_EFFORT_SETS = ['cross', 'ambiguous'];
// Sets that load only when a script names them (`--only ambiguous`) or asks
// for one of their ids, so every default keeps the original 246 questions.
export const OPT_IN_SETS = ['ambiguous'];
// Names that point at one Effort without its title: the engine and renderer
// code names that Effort titles use.
const EFFORT_NAMES = ['Kestrel', 'Lantern'];
const ANSWER_KINDS = ['record', 'records', 'value', 'boolean', 'count', 'text'];
const NEEDS_CHECK = new Set(['record', 'records', 'count']);

function args(argv) {
  const out = { only: [], graph: join(BENCH, '.flatbread-proof') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--only') out.only.push(...argv[++i].split(','));
    else if (argv[i] === '--graph') out.graph = resolve(argv[++i]);
    else throw new Error(`Unknown argument ${argv[i]}`);
  }
  return out;
}

/**
 * Question files, sorted by name. `only` lists the sets to load by their
 * `effort` field; the word `default` stands for every set outside
 * OPT_IN_SETS. With no `only`, the default sets load, plus the opt-in ones
 * when `optIn` is true.
 */
export async function loadQuestions(only = [], { optIn = false } = {}) {
  const dir = QUESTIONS_DIR;
  const files = (await readdir(dir))
    .filter((name) => name.endsWith('.json'))
    .sort();
  const wanted = (name) =>
    only.length
      ? only.includes(name) ||
        (only.includes('default') && !OPT_IN_SETS.includes(name))
      : optIn || !OPT_IN_SETS.includes(name);
  const sets = [];
  for (const file of files) {
    const set = JSON.parse(await readFile(join(dir, file), 'utf8'));
    if (wanted(set.effort)) sets.push({ file, ...set });
  }
  return sets;
}

/**
 * Questions picked by set and id, as run.mjs and prepare-run.mjs take them.
 * Ids are looked up in every set, so `--ids` reaches the opt-in sets too.
 */
export async function pickQuestions({ only = [], ids = [] } = {}) {
  const wanted = new Set(ids);
  return (await loadQuestions(only, { optIn: wanted.size > 0 }))
    .map((set) => ({
      ...set,
      questions: set.questions.filter((q) => !wanted.size || wanted.has(q.id)),
    }))
    .filter((set) => set.questions.length);
}

/** Problems with an ambiguous-Effort question, as messages. */
function ambiguityErrors(graph, q, sources) {
  const out = [];
  const source = sources.get(q.from);
  if (!source) return [`"from" must name a question in an Effort file`];
  if (source.q.tier > 2)
    out.push(`its source ${q.from} is tier ${source.q.tier}; use tier 0-2`);
  for (const c of ['ambiguous-effort', ...source.q.categories])
    if (!q.categories?.includes(c)) out.push(`needs category ${c}`);
  if (JSON.stringify(q.answer) !== JSON.stringify(qualifiedAnswer(source)))
    out.push(`its answer differs from ${q.from}'s`);
  const text = q.question ?? '';
  const efforts = Object.keys(graph.keymap)
    .filter((key) => key.endsWith('.effort'))
    .map((key) => key.split('.')[0]);
  const titles = efforts.map(
    (name) =>
      graph.records.get(graph.keymap[`${name}.effort`]).frontmatter.title
  );
  for (const title of titles)
    if (text.toLowerCase().includes(title.toLowerCase()))
      out.push(`names the Effort "${title}"`);
  if (/\bEfforts?\b/i.test(text)) out.push('says "Effort"');
  for (const name of EFFORT_NAMES)
    if (new RegExp(`\\b${name}\\b`, 'i').test(text))
      out.push(`names ${name}, which singles out one Effort`);
  // "the ports team", "the render work": an Effort key used as a name.
  const keyed = new RegExp(
    `\\b(${efforts.join('|')})\\s+(team|work|side|Effort)\\b`,
    'i'
  ).exec(text);
  if (keyed) out.push(`"${keyed[0]}" names an Effort`);
  // A platform word is fair only if records in two or more Efforts use it
  // and no one Effort holds more than two thirds of those records.
  for (const word of PLATFORM_WORDS) {
    const pattern = new RegExp(
      `\\b${word}\\b`,
      word === word.toLowerCase() ? 'i' : ''
    );
    if (!pattern.test(text)) continue;
    const perEffort = new Map();
    for (const rec of graph.records.values())
      if (
        rec.kind !== 'effort' &&
        pattern.test(`${rec.frontmatter.title ?? ''}\n${rec.body}`)
      )
        perEffort.set(
          rec.frontmatter.effort,
          (perEffort.get(rec.frontmatter.effort) ?? 0) + 1
        );
    const total = [...perEffort.values()].reduce((a, b) => a + b, 0);
    if (perEffort.size < 2)
      out.push(`says "${word}", which fewer than two Efforts use`);
    else if (Math.max(...perEffort.values()) > (total * 2) / 3)
      out.push(`says "${word}", which mostly one Effort uses`);
  }
  // Rivals are records in other Efforts that the wording also fits: the
  // near misses that make the question ambiguous. A trap says why each one
  // is wrong.
  if (!q.rivals?.length)
    out.push('needs `rivals`: near-miss records in other Efforts');
  const ownEffort = graph.keymap[`${source.effort}.effort`];
  for (const key of q.rivals ?? []) {
    const rec = graph.records.get(graph.keymap[key]);
    if (rec?.frontmatter.effort === ownEffort)
      out.push(`rival ${key} is in ${source.effort}, the answer's own Effort`);
  }
  return out;
}

// Words for a platform. "handheld" and "home console" stand for Skiff and
// Meridian, but may lean on the ports Effort, which owns both ports.
const PLATFORM_WORDS = ['PC', 'Meridian', 'Skiff', 'handheld', 'home console'];

/** A source question's answer with its keys qualified by its Effort. */
function qualifiedAnswer({ effort, q }) {
  const { kind, value } = q.answer;
  if (kind === 'record') return { ...q.answer, value: qualify(effort, value) };
  if (kind === 'records')
    return { ...q.answer, value: value.map((key) => qualify(effort, key)) };
  return q.answer;
}

function validate(
  graph,
  set,
  q,
  errors,
  seen,
  warnings = [],
  sources = new Map()
) {
  const err = (message) =>
    errors.push(`${set.file} ${q.id ?? '?'}: ${message}`);
  if (!q.id || seen.has(q.id)) return err('missing or duplicate id');
  seen.add(q.id);
  if (!Number.isInteger(q.tier) || q.tier < 0 || q.tier > 4)
    err('tier must be 0-4');
  if (!Number.isInteger(q.hops) || q.hops < 0)
    err('hops must be a whole number');
  if (!q.question?.trim()) err('empty question');
  // Runs show each question alone, so it must name its Effort.
  if (/\bthis Effort\b/i.test(q.question ?? ''))
    err(
      'says "this Effort"; name the Effort, since runs show a question alone'
    );
  for (const c of q.categories ?? [])
    if (!CATEGORIES.includes(c)) err(`unknown category ${c}`);
  if (!q.categories?.length) err('needs categories');
  const answer = q.answer ?? {};
  if (!ANSWER_KINDS.includes(answer.kind))
    err(`bad answer kind ${answer.kind}`);
  if (answer.kind === 'text' && !answer.rubric?.length)
    err('text answers need a rubric');
  if (answer.kind !== 'text' && answer.value === undefined)
    err('answer needs a value');
  const multi = MULTI_EFFORT_SETS.includes(set.effort);
  if (
    q.categories?.includes('ambiguous-effort') !==
    (set.effort === 'ambiguous')
  )
    err(
      'the ambiguous-effort category belongs to ambiguous.json, and every question there needs it'
    );
  if (set.effort === 'ambiguous')
    for (const message of ambiguityErrors(graph, q, sources)) err(message);
  const keysOk = (keys, label) => {
    for (const key of keys ?? []) {
      if (multi && !String(key).includes('.'))
        err(`${label}: key "${key}" needs its Effort, as <effort>.<key>`);
      try {
        idFor(graph, set.effort, key);
      } catch (error) {
        err(`${label}: ${error.message}`);
      }
    }
  };
  if (!q.evidence?.length) err('needs evidence keys');
  keysOk(q.evidence, 'evidence');
  keysOk(q.rivals, 'rivals');
  if (answer.kind === 'record') keysOk([answer.value], 'answer');
  if (answer.kind === 'records') keysOk(answer.value, 'answer');
  const path = q.path ?? [];
  if (q.tier >= 1 && q.tier <= 3) {
    if (!path.length) err('tiers 1-3 need a path');
    else if (path.length !== q.hops)
      err(`hops ${q.hops} but path has ${path.length} edges`);
  }
  if (q.tier === 0 && q.hops !== 0) err('tier 0 means 0 hops');
  // Runs show a question alone. If an Effort-wide check would also find
  // answers in another Effort, the question must name its own, or carry
  // `"scoped": true` once an author confirms the wording pins it down.
  if (!multi && !q.scoped) {
    const title = graph.records.get(graph.keymap[`${set.effort}.effort`])
      ?.frontmatter.title;
    const named =
      title && q.question.toLowerCase().includes(title.toLowerCase());
    const others = Object.keys(graph.keymap)
      .filter((key) => key.endsWith('.effort'))
      .map((key) => key.split('.')[0])
      .filter((name) => name !== set.effort);
    const answers = (r) =>
      Array.isArray(r) ? r.length > 0 : r !== null && r !== 0 && r !== false;
    const wide = (q.checks ?? []).filter(
      (c) => (c.type === 'select' || c.type === 'compaction') && !c.effort
    );
    // A check that starts from one record is ambiguous when another Effort
    // holds a record a reader could take for it: same kind and title, or
    // another compaction. Run the check again from each such record.
    const single = (q.checks ?? []).filter((c) =>
      ['asof', 'head', 'chain'].includes(c.type)
    );
    const analogs = (c, name) => {
      let start;
      try {
        start = graph.records.get(idFor(graph, set.effort, c.start));
      } catch {
        return [];
      }
      const effortId = graph.keymap[`${name}.effort`];
      return [...graph.records.values()].filter(
        (rec) =>
          rec.frontmatter.effort === effortId &&
          rec.kind === start.kind &&
          (rec.frontmatter.title === start.frontmatter.title ||
            (isCompaction(start) && isCompaction(rec)))
      );
    };
    const elsewhere = others.filter(
      (name) =>
        wide.some((c) => {
          try {
            return answers(runCheck(graph, name, { ...c, effort: name }));
          } catch {
            return false;
          }
        }) ||
        single.some((c) =>
          analogs(c, name).some((rec) => {
            try {
              const start = graph.keyById.get(rec.id);
              return answers(runCheck(graph, name, { ...c, start }));
            } catch {
              return false;
            }
          })
        )
    );
    if (!named && elsewhere.length)
      warnings.push(
        `${set.file} ${q.id}: its check also answers in ${elsewhere.join(
          ', '
        )}; name the Effort, or set "scoped": true if the wording pins it down`
      );
  }
  // A shortcut makes the question easier than its tier says. Joined
  // branches have no single start and end, so this is a warning only.
  if (q.tier >= 1 && q.tier <= 3 && path.length > 1) {
    const [start] = path[0];
    // Measure to the answer itself when there is one; a reversed last edge
    // would otherwise end on the record before it.
    const end = answer.kind === 'record' ? answer.value : path.at(-1)[2];
    try {
      const shortest = shortestHops(graph, set.effort, start, end);
      if (start !== end && shortest < q.hops)
        warnings.push(
          `${set.file} ${q.id}: a ${shortest}-edge route joins ${start} and ${end}; the path has ${q.hops}`
        );
    } catch {
      // Unknown keys are already reported as errors.
    }
  }
  for (const edge of path) {
    try {
      if (!hasEdge(graph, set.effort, edge)) err(`no edge ${edge.join(' ')}`);
    } catch (error) {
      err(`edge ${edge.join(' ')}: ${error.message}`);
    }
  }
  const evidence = new Set(
    (q.evidence ?? []).map((k) => qualify(set.effort, k))
  );
  for (const [from, , to] of path)
    for (const key of [from, to])
      if (!evidence.has(qualify(set.effort, key)))
        err(`path key ${key} missing from evidence`);
  const checks = q.checks ?? [];
  if (NEEDS_CHECK.has(answer.kind) && !checks.some((c) => !('expect' in c)))
    err(`${answer.kind} answers need a check that computes the answer`);
  for (const check of checks) {
    try {
      const actual = runCheck(graph, set.effort, check);
      const ok =
        'expect' in check
          ? JSON.stringify(actual) === JSON.stringify(check.expect)
          : sameAnswer(answer.kind, answer.value, actual, set.effort);
      if (!ok)
        err(
          `check ${check.type} gave ${JSON.stringify(
            actual
          )}, expected ${JSON.stringify(
            'expect' in check ? check.expect : answer.value
          )}`
        );
    } catch (error) {
      err(`check ${check.type}: ${error.message}`);
    }
  }
}

function histogram(values) {
  const out = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

function chainLengths(graph, recs) {
  const lengths = [];
  for (const rec of recs) {
    if ((rec.frontmatter.supersedes ?? []).length) continue;
    let n = 1;
    let cur = rec;
    while ((cur.frontmatter.superseded_by ?? []).length) {
      cur = graph.records.get(cur.frontmatter.superseded_by[0]);
      n++;
    }
    if (n > 1) lengths.push(n);
  }
  return lengths.sort((a, b) => b - a);
}

export function graphStats(graph, effortKey) {
  const effortId = graph.keymap[`${effortKey}.effort`];
  const recs = [...graph.records.values()].filter(
    (r) => r.frontmatter.effort === effortId
  );
  const fm = (r) => r.frontmatter;
  return {
    status: graph.records.get(effortId)?.frontmatter.status,
    records: recs.length,
    byKind: histogram(
      recs.map((r) => (fm(r).kind === 'compaction' ? 'compaction' : r.kind))
    ),
    standings: histogram(recs.map((r) => `${r.kind}:${standing(r)}`)),
    supersessionChains: chainLengths(graph, recs),
    invalidated: recs.filter((r) => (fm(r).invalidated_by ?? []).length).length,
    retracted: recs.filter((r) => fm(r).retracted === true).length,
    reopened: recs.filter((r) => (fm(r).reopen_history ?? []).length).length,
    restingOnDead: recs.filter(
      (r) =>
        !['retracted', 'superseded', 'invalidated', 'rejected'].includes(
          standing(r)
        ) &&
        (fm(r).derives_from ?? []).some((id) => {
          const s = graph.records.get(id);
          return (
            s &&
            ['invalidated', 'superseded', 'retracted', 'rejected'].includes(
              standing(s)
            )
          );
        })
    ).length,
    longBodies: recs.filter(
      (r) => r.body.length > 600 || r.body.split('\n').length > 12
    ).length,
  };
}

async function main() {
  const options = args(process.argv.slice(2));
  const graph = await loadGraph(options.graph);
  const sets = await loadQuestions(options.only, { optIn: true });
  // Ambiguous questions are checked against their sources, so load every
  // Effort file even under --only.
  const sources = new Map();
  for (const set of await loadQuestions())
    if (!MULTI_EFFORT_SETS.includes(set.effort))
      for (const q of set.questions)
        sources.set(q.id, { effort: set.effort, q });
  const errors = [];
  const warnings = [];
  const seen = new Set();
  const all = [];
  for (const set of sets)
    for (const q of set.questions ?? []) {
      validate(graph, set, q, errors, seen, warnings, sources);
      all.push({ ...q, effort: set.effort });
    }
  const efforts = [
    ...new Set(Object.keys(graph.keymap).map((key) => key.split('.')[0])),
  ].sort();
  for (const effort of efforts) {
    if (options.only.length && !options.only.includes(effort)) continue;
    const qs = all.filter((q) => q.effort === effort);
    console.log(
      JSON.stringify({
        effort,
        ...graphStats(graph, effort),
        questions: qs.length,
        tiers: histogram(qs.map((q) => q.tier)),
        hops: histogram(qs.map((q) => q.hops)),
        categories: histogram(qs.flatMap((q) => q.categories ?? [])),
      })
    );
  }
  for (const name of MULTI_EFFORT_SETS) {
    const qs = all.filter((q) => q.effort === name);
    if (qs.length)
      console.log(JSON.stringify({ effort: name, questions: qs.length }));
  }
  if (warnings.length) {
    console.warn(warnings.join('\n'));
    console.warn(`${warnings.length} warning(s)`);
  }
  if (errors.length) {
    console.error(errors.join('\n'));
    console.error(`${errors.length} error(s)`);
    process.exitCode = 1;
  } else
    console.log(`ok: ${all.length} questions, ${graph.records.size} records`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  });
