#!/usr/bin/env node
// The offline gate: free checks that every task must pass before any paid
// session runs (DESIGN.md §4).
//
//   node scripts/gate.mjs --hidden <p4/hidden> --none <p4/bed-none>
//        --bed <p4/bed> [--x10 <p4/bed-x10>] [--out <p4/tasks>]
//        [--grade <dir>] [--ids B-P1,B-S3] [--jobs 4] [--no-grade]
//
// 1. Assembles the task folders grade.mjs, run.mjs and judge.mjs read: for
//    each tasks/<id>/ in this folder (task.json, rubric.json) plus the
//    hidden files in <hidden>/<id>/ (tests and patches, kept outside the
//    repository), and <hidden>/_global/. The result goes to --out, which
//    defaults to <hidden>/../tasks and is rebuilt from scratch.
// 2. Static checks:
//    - the categories hold the pre-registered counts (build 6/3/4/3, plan
//      3/1/2/2), and each task has the files its kind needs;
//    - a prompt names no file, path, symbol, Effort or record id;
//    - no feature word of a task appears in Proof: any record file in the
//      proof bed (and the 10x bed) or any commit message;
//    - no leak word of a proof-only task appears anywhere in the none bed's
//      history (every commit's code, tests, docs and message);
//    - the phrase that states each code-visible rule is in the none bed's tip;
//    - a plan rubric has 4 to 6 must-include and 2 to 4 must-avoid points,
//      and the task has plans/good.md, trap.md and plausible.md for the
//      rubric gate (judge.mjs --gate, run in the pilot).
// 3. Grades each build task's base tree (an empty patch), reference.patch
//    and naive.patch with grade.mjs, on the none bed, and checks:
//    - base: acceptance fails, regressions and constraints pass;
//    - reference: acceptance, constraints and regressions all pass;
//    - naive: exactly the groups task.json's naive.fails names fail.
//
// Prints one line per check and a table, writes <out>/gate.json, and exits
// 1 when anything fails.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { BENCH, git, loadTasks, parseArgs } from './common.mjs';
import { gradeDiff } from './grade.mjs';

const COUNTS = {
  build: { 'proof-only': 6, 'code-visible': 5, stale: 4, control: 3 },
  plan: { 'proof-only': 3, 'code-visible': 1, stale: 2, control: 2 },
};
const GROUPS = ['acceptance', 'constraints', 'regressions'];

/** What a prompt may not hold: paths, file names, symbols, Proof words. */
const PROMPT_BANS = [
  [/\b[\w.-]+\/[\w./-]+/, 'a path'],
  [/\.(ts|js|mjs|json|md)\b/i, 'a file name'],
  [/\b[a-z]+[A-Z]\w*\b/, 'a camelCase symbol'],
  [/\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/, 'a CONSTANT'],
  [/\b(eff|dec|con|fnd|iss|rsk|cit|blb)-[\w-]+--\w+\b/, 'a record id'],
  [
    /\b(proof|effort|flatbread|record|decision|constraint)s?\b/i,
    'a Proof word',
  ],
  [/\b(src|test|docs|module|function|class)\b/i, 'a code word'],
];

function options(argv) {
  const o = parseArgs(
    argv,
    {
      hidden: null,
      none: null,
      bed: null,
      x10: null,
      out: null,
      grade: null,
      ids: [],
      jobs: 4,
      testTimeout: 120,
    },
    { lists: ['ids'], flags: ['noGrade'] }
  );
  if (!o.hidden || !o.none || !o.bed)
    throw new Error('gate.mjs needs --hidden, --none and --bed');
  o.hidden = resolve(o.hidden);
  o.none = resolve(o.none);
  o.bed = resolve(o.bed);
  if (o.x10) o.x10 = resolve(o.x10);
  o.tasks = resolve(o.out ?? join(dirname(o.hidden), 'tasks'));
  o.grade = resolve(o.grade ?? join(dirname(o.tasks), 'grade'));
  // The assembled folder is rebuilt from scratch, so it must never be the
  // task sources themselves (the default when --hidden is ./hidden).
  const src = join(BENCH, 'tasks');
  if (
    [o.tasks, o.grade].some((dir) => src === dir || src.startsWith(dir + '/'))
  )
    throw new Error(`gate.mjs would delete ${src}; pass --out outside it`);
  return o;
}

async function assemble(o) {
  const src = join(BENCH, 'tasks');
  await rm(o.tasks, { recursive: true, force: true });
  await mkdir(o.tasks, { recursive: true });
  for (const id of readdirSync(src)) {
    const dir = join(o.tasks, id);
    await cp(join(src, id), dir, { recursive: true });
    const hidden = join(o.hidden, id);
    if (existsSync(hidden)) await cp(hidden, dir, { recursive: true });
  }
  await cp(join(o.hidden, '_global'), join(o.tasks, '_global'), {
    recursive: true,
  });
}

/** Every file under `dir`, read as lower-case text. */
function readTree(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(readFileSync(p, 'utf8'));
    }
  };
  walk(dir);
  return out.join('\n').toLowerCase();
}

/** Proof as agents can read it: record files and commit messages. */
function proofText(bed) {
  return `${readTree(join(bed, '.flatbread-proof'))}\n${git(
    bed,
    'log',
    '--format=%B'
  ).toLowerCase()}`;
}

/** Everything in the none bed's history: every patch and every message. */
function noneHistory(bed) {
  return git(bed, 'log', '-p', '--format=%B', 'main').toLowerCase();
}

function staticChecks(o, tasks) {
  const results = [];
  const check = (task, name, ok, detail = '') =>
    results.push({ task, name, ok, detail });
  for (const [kind, want] of Object.entries(COUNTS))
    for (const [category, n] of Object.entries(want)) {
      const got = tasks.filter(
        (t) => t.kind === kind && t.category === category
      ).length;
      check('*', `${kind} ${category}: ${n} tasks`, got === n, `got ${got}`);
    }
  const proof = proofText(o.bed);
  const proof10 = o.x10 ? proofText(o.x10) : '';
  const history = noneHistory(o.none);
  for (const t of tasks) {
    const bad = PROMPT_BANS.filter(([re]) => re.test(t.prompt)).map(
      ([re, what]) => `${what} (${t.prompt.match(re)[0]})`
    );
    check(
      t.id,
      'prompt names no file, symbol or Proof id',
      !bad.length,
      bad.join('; ')
    );
    const hits = (t.featureWords ?? []).filter((w) => {
      const word = w.toLowerCase();
      return proof.includes(word) || proof10.includes(word);
    });
    check(t.id, 'no feature word in Proof', !hits.length, hits.join(', '));
    if (t.category === 'proof-only') {
      const leaks = (t.leakWords ?? []).filter((w) =>
        history.includes(w.toLowerCase())
      );
      check(
        t.id,
        `rule wording absent from the none bed (${
          (t.leakWords ?? []).length
        } phrases)`,
        !leaks.length && (t.leakWords ?? []).length > 0,
        leaks.join(', ')
      );
    }
    if (t.category === 'code-visible') {
      const missing = (t.visibleIn ?? []).filter(({ path, text }) => {
        const file = join(o.none, path);
        return !existsSync(file) || !readFileSync(file, 'utf8').includes(text);
      });
      check(
        t.id,
        'the code states the rule',
        !missing.length && (t.visibleIn ?? []).length > 0,
        (t.visibleIn ?? []).map((v) => `${v.path}: "${v.text}"`).join('; ')
      );
    }
    const files = readdirSync(t.dir);
    if (t.kind === 'build') {
      const need = ['acceptance.test.ts', 'reference.patch', 'naive.patch'];
      if (t.category !== 'control') need.push('constraints.test.ts');
      const missing = need.filter((f) => !files.includes(f));
      check(
        t.id,
        'hidden tests and patches present',
        !missing.length,
        missing.join(', ')
      );
      check(
        t.id,
        'naive.fails names groups',
        Array.isArray(t.naive?.fails) &&
          t.naive.fails.length > 0 &&
          t.naive.fails.every((g) => GROUPS.includes(g))
      );
    } else {
      const rubric = files.includes('rubric.json')
        ? JSON.parse(readFileSync(join(t.dir, 'rubric.json'), 'utf8'))
        : { include: [], avoid: [] };
      const ni = rubric.include.length;
      const na = rubric.avoid.length;
      const plans = existsSync(join(t.dir, 'plans'))
        ? readdirSync(join(t.dir, 'plans'))
        : [];
      const missingPlans = ['good.md', 'trap.md', 'plausible.md'].filter(
        (f) => !plans.includes(f)
      );
      check(
        t.id,
        'good, trap and plausible plans present',
        !missingPlans.length,
        missingPlans.join(', ')
      );
      check(
        t.id,
        'rubric has 4-6 includes and 2-4 avoids',
        ni >= 4 && ni <= 6 && na >= 2 && na <= 4,
        `${ni} include, ${na} avoid`
      );
    }
  }
  return results;
}

const passed = (g) =>
  Object.fromEntries(GROUPS.map((k) => [k, g[k]?.pass === true]));

function expectation(task, which) {
  if (which === 'base')
    return { acceptance: false, constraints: true, regressions: true };
  if (which === 'reference')
    return { acceptance: true, constraints: true, regressions: true };
  return Object.fromEntries(
    GROUPS.map((k) => [k, !task.naive.fails.includes(k)])
  );
}

async function grades(o, tasks) {
  const jobs = [];
  for (const t of tasks.filter((x) => x.kind === 'build'))
    for (const which of ['base', 'reference', 'naive']) jobs.push({ t, which });
  const out = [];
  const worker = async () => {
    for (let job = jobs.shift(); job; job = jobs.shift()) {
      const { t, which } = job;
      const diff =
        which === 'base'
          ? ''
          : await readFile(join(t.dir, `${which}.patch`), 'utf8');
      const g = await gradeDiff(o, t, diff);
      const got = passed(g);
      const want = expectation(t, which);
      const ok = !g.apply_failed && GROUPS.every((k) => got[k] === want[k]);
      const failing = GROUPS.flatMap((k) =>
        (g[k]?.failing ?? []).map((name) => `${k}: ${name}`)
      );
      out.push({
        task: t.id,
        which,
        ok,
        got,
        want,
        failing,
        apply_failed: g.apply_failed,
      });
      console.log(
        `${ok ? 'ok  ' : 'FAIL'} ${t.id} ${which.padEnd(9)} ${GROUPS.map(
          (k) => `${k}=${got[k] ? 'pass' : 'fail'}`
        ).join(' ')}${g.apply_failed ? ' APPLY_FAILED' : ''}`
      );
    }
  };
  await Promise.all(Array.from({ length: o.jobs }, worker));
  const order = ['base', 'reference', 'naive'];
  return out.sort(
    (a, b) =>
      a.task.localeCompare(b.task) ||
      order.indexOf(a.which) - order.indexOf(b.which)
  );
}

async function main() {
  const o = options(process.argv.slice(2));
  await assemble(o);
  let tasks = loadTasks(o.tasks);
  const statics = staticChecks(o, tasks);
  for (const r of statics)
    console.log(
      `${r.ok ? 'ok  ' : 'FAIL'} ${r.task} ${r.name}${
        r.detail ? `: ${r.detail}` : ''
      }`
    );
  if (o.ids.length) tasks = tasks.filter((t) => o.ids.includes(t.id));
  const graded = o.noGrade ? [] : await grades(o, tasks);
  if (graded.length) {
    console.log(
      '\n| Task | Patch | Acceptance | Constraints | Regressions | Expected | Failing tests |'
    );
    console.log('| --- | --- | --- | --- | --- | --- | --- |');
    for (const g of graded)
      console.log(
        `| ${g.task} | ${g.which} | ${GROUPS.map((k) =>
          g.got[k] ? 'pass' : 'fail'
        ).join(' | ')} | ${g.ok ? 'yes' : 'NO'} | ${
          g.failing.join('; ') || '-'
        } |`
      );
  }
  const failed = [...statics, ...graded].filter((r) => !r.ok);
  await writeFile(
    join(o.tasks, 'gate.json'),
    `${JSON.stringify({ statics, graded }, null, 2)}\n`
  );
  console.log(
    `\n${statics.length} static checks, ${graded.length} graded patches, ${failed.length} failed`
  );
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
