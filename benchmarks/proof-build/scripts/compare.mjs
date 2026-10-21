#!/usr/bin/env node
// Compares every arm with `none`, paired by task and run.
//
//   node scripts/compare.mjs <work-dir> --runs r1,r2
//        [--arms skill,brief,find,findcode,dump,dump10x] [--base none]
//        [--split tune|holdout|all] [--only build|plan|<category>]
//        [--ids a,b] [--keep-flagged] [--errors drop|fail] [--out <file.json>]
//
// It reads each session's session.json, grade.json and judge.json under
// <work-dir>/<run>/<arm>/<task>/. A row is one (task, run) pair that both
// the arm and the base have graded.
//
// Exclusion: when any compared arm's session for a (task, run) is
// `excluded` by grade.mjs (left_folder, hidden_read, or a `none` session
// that found Proof), that (task, run) is dropped from every comparison, as
// DESIGN.md §7 says. --keep-flagged keeps them. Flag counts by arm are in
// `flags`. Timed-out sessions stay in and count as failures. Sessions that
// ended in a non-transient API error (run.mjs `api_error`) are counted in
// `flags` and, by default, their (task, run) is dropped like a flagged one;
// --errors fail keeps them as failures instead.
//
// Build tasks: all-green, acceptance, constraints and regressions, each
// with the arm's and the base's pass counts, the pairs only one side passed
// (`wins`, `losses`), a two-sided exact sign test over those pooled pairs
// (`p`), and the stricter task-level sign test that counts each task once,
// as a win for the side that passed more often over the runs
// (`taskSignTest`). A constraint pass counts only when acceptance passed
// too, because constraint tests skip when the feature is missing and an
// empty diff would otherwise pass them; `constraints_raw` is the plain
// count, for reference.
//
// Primary endpoints (DESIGN.md §7): all-green on proof-only tasks (H1)
// and on stale tasks (H3), each arm against `none`, ten sign tests
// Holm-corrected together (`holm_primary`, keyed `<category>:<arm>`). The
// pooled all-green over every build task is secondary, Holm-corrected
// across the five primary arms (`holm_all_green`). `dump10x` is compared
// with `dump` too, without correction.
//
// Plan tasks: the mean rubric score of each side, a paired two-sided
// Wilcoxon signed-rank test (exact, ties averaged), and must-avoid
// violations.
//
// Cost, over build and plan pairs apart: first-turn tokens (the system
// prompt plus the task text, so the pasted brief or dump shows here),
// context tokens (every fresh input and output token, first turn
// included), read tokens (context tokens without the first turn: what the
// session read and wrote by itself), processed tokens (context plus cache
// reads, which counts a pasted block once per turn), tool calls, turns,
// wall time, Proof reads, direct reads of Proof files, and searches whose
// results showed Proof files (`proof_search_exposure`), as medians, with
// the median paired ratio arm/base for the token measures and wall time.
// H4 is read on context and processed tokens, which include what was
// forced in; read tokens alone would hide it.
//
// Everything is also given per category (`byCategory`), which is
// descriptive. --split keeps only the tune or holdout tasks, split by the
// first byte of sha256(task id) as in proof-recall.
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { signTest } from '../../proof-recall/scripts/compare.mjs';
import { ARMS } from './arms.mjs';
import { listSessions, parseArgs, readJson, splitOf } from './common.mjs';

const PRIMARY = ['skill', 'brief', 'find', 'findcode', 'dump'];
const PRIMARY_CATEGORIES = ['proof-only', 'stale'];
const BUILD_GROUPS = [
  'all_green',
  'acceptance',
  'constraints',
  'constraints_raw',
  'regressions',
];
const RATIOS = [
  'first_turn_tokens',
  'context_tokens',
  'read_tokens',
  'processed_tokens',
  'wall_ms',
];

function median(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = v.length / 2;
  return v.length % 2 ? v[Math.floor(mid)] : (v[mid - 1] + v[mid]) / 2;
}

const round = (x, digits = 0) =>
  x === null || x === undefined ? null : +x.toFixed(digits);

/** Two-sided Wilcoxon signed-rank p for paired differences `d`. */
export function wilcoxon(d) {
  const nz = d.filter((x) => x !== 0);
  const n = nz.length;
  if (!n) return { n: 0, w_plus: 0, p: 1 };
  const order = nz
    .map((x, i) => ({ abs: Math.abs(x), i }))
    .sort((a, b) => a.abs - b.abs);
  const ranks = new Array(n);
  for (let i = 0; i < n; ) {
    let j = i;
    while (j + 1 < n && order[j + 1].abs === order[i].abs) j++;
    for (let k = i; k <= j; k++) ranks[order[k].i] = (i + j + 2) / 2;
    i = j + 1;
  }
  const wPlus = nz.reduce((s, x, i) => s + (x > 0 ? ranks[i] : 0), 0);
  if (n <= 25) {
    // Exact: the null distribution of W+ over all 2^n sign patterns, on
    // doubled ranks so that tied (half) ranks stay integers.
    const r2 = ranks.map((r) => Math.round(r * 2));
    const max = r2.reduce((a, b) => a + b, 0);
    let dist = new Float64Array(max + 1);
    dist[0] = 1;
    for (const r of r2) {
      const next = new Float64Array(max + 1);
      for (let s = 0; s <= max; s++)
        if (dist[s]) {
          next[s] += dist[s] / 2;
          next[s + r] += dist[s] / 2;
        }
      dist = next;
    }
    const w = Math.round(wPlus * 2);
    let low = 0;
    let high = 0;
    for (let s = 0; s <= max; s++) {
      if (s <= w) low += dist[s];
      if (s >= w) high += dist[s];
    }
    return { n, w_plus: wPlus, p: Math.min(1, 2 * Math.min(low, high)) };
  }
  const mean = (n * (n + 1)) / 4;
  const ties = {};
  for (const r of ranks) ties[r] = (ties[r] ?? 0) + 1;
  const tie = Object.values(ties).reduce((s, t) => s + (t ** 3 - t), 0);
  const sd = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24 - tie / 48);
  const z = (Math.abs(wPlus - mean) - 0.5) / sd;
  // Two-sided normal tail, by the Abramowitz-Stegun erfc approximation.
  const t = 1 / (1 + 0.3275911 * (z / Math.SQRT2));
  const erfc =
    t *
    (0.254829592 +
      t *
        (-0.284496736 +
          t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) *
    Math.exp(-((z / Math.SQRT2) ** 2));
  return { n, w_plus: wPlus, p: Math.min(1, erfc) };
}

/** Holm step-down adjustment of `ps` (a map name → p). */
export function holm(ps) {
  const entries = Object.entries(ps).sort((a, b) => a[1] - b[1]);
  const out = {};
  let running = 0;
  entries.forEach(([name, p], i) => {
    running = Math.max(running, Math.min(1, p * (entries.length - i)));
    out[name] = +running.toFixed(4);
  });
  return out;
}

function options(argv) {
  const o = parseArgs(
    argv,
    {
      runs: [],
      arms: [],
      base: 'none',
      split: 'all',
      only: [],
      ids: [],
      out: null,
      errors: 'drop',
    },
    { lists: ['runs', 'arms', 'only', 'ids'], flags: ['keepFlagged'] }
  );
  if (!['drop', 'fail'].includes(o.errors))
    throw new Error('--errors must be drop or fail');
  if (!o._[0] || !o.runs.length)
    throw new Error('usage: compare.mjs <work-dir> --runs r1[,r2] [options]');
  if (!['tune', 'holdout', 'all'].includes(o.split))
    throw new Error('--split must be one of tune, holdout, all');
  o.dir = resolve(o._[0]);
  return o;
}

async function loadRows(o) {
  const rows = [];
  for (const run of o.runs)
    for (const s of listSessions(o.dir, run)) {
      const session = await readJson(join(s.dir, 'session.json'));
      const grade = await readJson(join(s.dir, 'grade.json'));
      if (!session?.done || !grade) continue;
      const judge = await readJson(join(s.dir, 'judge.json'));
      rows.push({
        key: `${s.id}#${run}`,
        task: s.id,
        run,
        arm: s.arm,
        kind: grade.kind,
        category: grade.category ?? session.category ?? 'none',
        session,
        grade,
        judge,
      });
    }
  return rows.filter(
    (r) =>
      (o.split === 'all' || splitOf(r.task) === o.split) &&
      (!o.ids.length || o.ids.includes(r.task)) &&
      (!o.only.length || o.only.includes(r.kind) || o.only.includes(r.category))
  );
}

const readTokens = (r) =>
  (r.session.cost?.context_tokens ?? NaN) - (r.session.cost?.fixed_tokens ?? 0);
const metric = {
  first_turn_tokens: (r) => r.session.cost?.fixed_tokens ?? NaN,
  context_tokens: (r) => r.session.cost?.context_tokens ?? NaN,
  read_tokens: readTokens,
  processed_tokens: (r) => r.session.cost?.processed_tokens ?? NaN,
  tool_calls: (r) => r.session.cost?.tool_calls ?? NaN,
  turns: (r) => r.session.cost?.turns ?? NaN,
  wall_ms: (r) => r.session.wall_ms ?? NaN,
  proof_reads: (r) => r.grade.flags?.proof_reads ?? 0,
  proof_files_read: (r) => r.grade.flags?.proof_files_read ?? 0,
  proof_search_exposure: (r) => r.grade.flags?.proof_search_exposure ?? 0,
};
const passed = (r, group) => {
  if (group === 'all_green') return r.grade.all_green === true;
  if (group === 'constraints')
    return (
      r.grade.acceptance?.pass === true && r.grade.constraints?.pass !== false
    );
  if (group === 'constraints_raw') return r.grade.constraints?.pass !== false;
  return r.grade[group]?.pass !== false;
};

function binary(pairs, group) {
  const wins = pairs.filter(([a, b]) => passed(a, group) && !passed(b, group));
  const losses = pairs.filter(
    ([a, b]) => !passed(a, group) && passed(b, group)
  );
  const byTask = new Map();
  for (const [a, b] of pairs)
    byTask.set(
      a.task,
      (byTask.get(a.task) ?? 0) +
        Number(passed(a, group)) -
        Number(passed(b, group))
    );
  const tw = [...byTask.values()].filter((m) => m > 0).length;
  const tl = [...byTask.values()].filter((m) => m < 0).length;
  return {
    arm: pairs.filter(([a]) => passed(a, group)).length,
    base: pairs.filter(([, b]) => passed(b, group)).length,
    wins: wins.map(([a]) => a.key),
    losses: losses.map(([a]) => a.key),
    p: +signTest(wins.length, losses.length).toFixed(4),
    taskSignTest: { arm: tw, base: tl, p: +signTest(tw, tl).toFixed(4) },
  };
}

function plans(pairs) {
  const scored = pairs.filter(([a, b]) => a.judge && b.judge);
  const d = scored.map(([a, b]) => a.judge.score - b.judge.score);
  const mean = (xs) =>
    xs.length ? +(xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(3) : null;
  return {
    pairs: scored.length,
    unjudged: pairs.length - scored.length,
    score: {
      arm: mean(scored.map(([a]) => a.judge.score)),
      base: mean(scored.map(([, b]) => b.judge.score)),
    },
    wins: d.filter((x) => x > 0).length,
    losses: d.filter((x) => x < 0).length,
    wilcoxon: (({ n, w_plus, p }) => ({ n, w_plus, p: +p.toFixed(4) }))(
      wilcoxon(d)
    ),
    avoid_violations: {
      arm: scored.reduce((n, [a]) => n + a.judge.avoid_violations, 0),
      base: scored.reduce((n, [, b]) => n + b.judge.avoid_violations, 0),
    },
    plan_changed_code: {
      arm: pairs.filter(([a]) => a.grade.plan_changed_code).length,
      base: pairs.filter(([, b]) => b.grade.plan_changed_code).length,
    },
  };
}

function cost(pairs) {
  const out = {};
  for (const [name, get] of Object.entries(metric)) {
    const a = pairs.map(([x]) => get(x));
    const b = pairs.map(([, y]) => get(y));
    out[name] = { arm: round(median(a)), base: round(median(b)) };
    if (RATIOS.includes(name)) {
      out[name].ratio = round(
        median(pairs.map(([x, y]) => get(x) / get(y)).filter(Number.isFinite)),
        3
      );
      out[name].armCheaper = pairs.filter(([x, y]) => get(x) < get(y)).length;
    }
  }
  return out;
}

function compareArm(rows, arm, base) {
  const index = new Map(
    rows.filter((r) => r.arm === base).map((r) => [r.key, r])
  );
  const pairs = rows
    .filter((r) => r.arm === arm && index.has(r.key))
    .map((r) => [r, index.get(r.key)]);
  const build = pairs.filter(([a]) => a.kind === 'build');
  const plan = pairs.filter(([a]) => a.kind === 'plan');
  const section = (ps) => ({
    pairs: ps.length,
    ...Object.fromEntries(BUILD_GROUPS.map((g) => [g, binary(ps, g)])),
  });
  const categories = [...new Set(pairs.map(([a]) => a.category))].sort();
  return {
    arm,
    base,
    build: section(build),
    plan: plans(plan),
    cost: { build: cost(build), plan: cost(plan) },
    byCategory: Object.fromEntries(
      categories.map((c) => {
        const b = build.filter(([a]) => a.category === c);
        const p = plan.filter(([a]) => a.category === c);
        return [
          c,
          {
            build: b.length
              ? {
                  pairs: b.length,
                  all_green: binary(b, 'all_green'),
                  acceptance: binary(b, 'acceptance'),
                  constraints: binary(b, 'constraints'),
                  constraints_raw: binary(b, 'constraints_raw'),
                }
              : null,
            plan: p.length ? plans(p) : null,
            cost: (({
              first_turn_tokens,
              context_tokens,
              read_tokens,
              processed_tokens,
              wall_ms,
            }) => ({
              first_turn_tokens,
              context_tokens,
              read_tokens,
              processed_tokens,
              wall_ms,
            }))(cost([...b, ...p])),
          },
        ];
      })
    ),
  };
}

async function main() {
  const o = options(process.argv.slice(2));
  let rows = await loadRows(o);
  const present = [...new Set(rows.map((r) => r.arm))];
  const arms = (
    o.arms.length ? o.arms : ARMS.filter((a) => present.includes(a))
  ).filter((a) => a !== o.base);
  const compared = new Set([o.base, ...arms]);
  rows = rows.filter((r) => compared.has(r.arm));
  const flags = {};
  for (const r of rows) {
    const f = (flags[r.arm] ??= {
      sessions: 0,
      excluded: 0,
      left_folder: 0,
      hidden_read: 0,
      none_found_proof: 0,
      timed_out: 0,
      api_error: 0,
      apply_failed: 0,
      edited_existing_tests: 0,
      edited_test_support: 0,
    });
    f.sessions++;
    for (const k of [
      'excluded',
      'left_folder',
      'hidden_read',
      'none_found_proof',
      'timed_out',
    ])
      if (r.grade.flags?.[k]) f[k]++;
    if (r.session.api_error) f.api_error++;
    if (r.grade.apply_failed) f.apply_failed++;
    if (r.grade.edited_existing_tests?.length) f.edited_existing_tests++;
    if (r.grade.edited_test_support?.length) f.edited_test_support++;
  }
  const dropped = new Set(
    rows
      .filter(
        (r) =>
          (!o.keepFlagged && r.grade.flags?.excluded) ||
          (o.errors === 'drop' && r.session.api_error)
      )
      .map((r) => r.key)
  );
  rows = rows.filter((r) => !dropped.has(r.key));
  if (!rows.some((r) => r.arm === o.base))
    throw new Error(
      `No graded ${o.base} sessions left in ${o.runs.join(', ')}${
        dropped.size
          ? ` after dropping ${dropped.size} flagged (task, run) pairs: ${[
              ...dropped,
            ].join(', ')} (see --keep-flagged)`
          : ''
      }`
    );
  const comparisons = arms.map((arm) => compareArm(rows, arm, o.base));
  const pooled = Object.fromEntries(
    comparisons
      .filter((c) => PRIMARY.includes(c.arm) && c.build.pairs)
      .map((c) => [c.arm, c.build.all_green.p])
  );
  const primary = {};
  for (const c of comparisons.filter((x) => PRIMARY.includes(x.arm)))
    for (const category of PRIMARY_CATEGORIES) {
      const build = c.byCategory[category]?.build;
      if (build) primary[`${category}:${c.arm}`] = build.all_green.p;
    }
  const report = {
    work: o.dir,
    runs: o.runs,
    split: o.split,
    base: o.base,
    flags,
    droppedPairs: [...dropped].sort(),
    holm_primary: holm(primary),
    holm_all_green: holm(pooled),
    comparisons,
    ...(arms.includes('dump10x') && rows.some((r) => r.arm === 'dump')
      ? { dump10x_vs_dump: compareArm(rows, 'dump10x', 'dump') }
      : {}),
  };
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (o.out) await writeFile(resolve(o.out), json);
  process.stdout.write(json);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
