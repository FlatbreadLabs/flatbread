#!/usr/bin/env node
// Validates the question set against the built graph, then prints coverage.
// Exits 1 on any error, so authors can loop on it.
//
//   node scripts/check.mjs                    all question files
//   node scripts/check.mjs --only render      one Effort's questions
//   node scripts/check.mjs --graph /tmp/x     a graph built elsewhere
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
];
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

export async function loadQuestions(only = []) {
  const dir = join(BENCH, 'questions');
  const files = (await readdir(dir))
    .filter((name) => name.endsWith('.json'))
    .sort();
  const sets = [];
  for (const file of files) {
    const set = JSON.parse(await readFile(join(dir, file), 'utf8'));
    if (only.length && !only.includes(set.effort)) continue;
    sets.push({ file, ...set });
  }
  return sets;
}

function validate(graph, set, q, errors, seen, warnings = []) {
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
  const keysOk = (keys, label) => {
    for (const key of keys ?? []) {
      try {
        idFor(graph, set.effort, key);
      } catch (error) {
        err(`${label}: ${error.message}`);
      }
    }
  };
  if (!q.evidence?.length) err('needs evidence keys');
  keysOk(q.evidence, 'evidence');
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
  if (set.effort !== 'cross' && !q.scoped) {
    const title = graph.records.get(graph.keymap[`${set.effort}.effort`])
      ?.frontmatter.title;
    const named =
      title && q.question.toLowerCase().includes(title.toLowerCase());
    const others = Object.keys(graph.keymap)
      .filter((key) => key.endsWith('.effort'))
      .map((key) => key.split('.')[0])
      .filter((name) => name !== set.effort);
    const wide = (q.checks ?? []).filter(
      (c) => (c.type === 'select' || c.type === 'compaction') && !c.effort
    );
    const elsewhere = others.filter((name) =>
      wide.some((c) => {
        try {
          const r = runCheck(graph, name, { ...c, effort: name });
          return Array.isArray(r)
            ? r.length > 0
            : r !== null && r !== 0 && r !== false;
        } catch {
          return false;
        }
      })
    );
    if (!named && elsewhere.length)
      warnings.push(
        `${set.file} ${
          q.id
        }: an Effort-wide check also answers in ${elsewhere.join(
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
  const sets = await loadQuestions(options.only);
  const errors = [];
  const warnings = [];
  const seen = new Set();
  const all = [];
  for (const set of sets)
    for (const q of set.questions ?? []) {
      validate(graph, set, q, errors, seen, warnings);
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
  const other = all.filter((q) => !efforts.includes(q.effort));
  if (other.length)
    console.log(JSON.stringify({ effort: 'cross', questions: other.length }));
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
