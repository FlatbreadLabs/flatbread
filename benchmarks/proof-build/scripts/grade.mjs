#!/usr/bin/env node
// Grades finished sessions: applies each session's diff to a fresh copy of
// the none bed, restores the original tests, copies the hidden tests in,
// and runs the acceptance, constraint and original suites apart.
//
//   node scripts/grade.mjs <work-dir> --name <run> --tasks <p4/tasks>
//        --none <p4/bed-none> [--bed <p4/bed>] [--bed10x <p4/bed-x10>]
//        [--p4 <p4>] [--hidden <p4/hidden>] [--grade <dir>]
//        [--arms a,b] [--ids B-P1] [--only build] [--jobs 4]
//        [--test-timeout 120] [--regrade] [--typecheck]
//   node scripts/grade.mjs --task <id> --patch <file> --tasks <p4/tasks>
//        --none <p4/bed-none> [--grade <dir>] [--out <grade.json>]
//
// The first form grades every session of a run that has a session.json
// marked done and no grade.json yet (all of them with --regrade), and
// writes grade.json beside each. The second grades one patch with no
// session, which is what the offline gate needs: an empty file for the
// base tree, the task's reference.patch, or its naive.patch.
//
// For a build session the grading tree is <grade>/<random>/, a copy of a
// pristine clone of the none bed (<grade>/_pristine, remade when the bed's
// HEAD moves), deleted after grading. Every arm is graded on the same code
// because the variants' code trees are identical. Steps:
//
// 1. `git apply --3way` the session diff. If it does not apply, every
//    group fails and `apply_failed` is set.
// 2. Record the files the diff touched (renames count as a deletion and an
//    addition) and its size. Everything the bed tracks under test/ is
//    restored from HEAD: touching a test file sets `edited_existing_tests`,
//    touching a helper or fixture sets `edited_test_support`.
// 3. Copy the task's hidden files (every file in its folder but task.json,
//    rubric.json, patches and plans/) and the _global files that apply to
//    the task's category (see globalFiles) into test/_hidden/.
// 4. Run `node --experimental-strip-types --test` four times, each with
//    --test-timeout seconds, with no network where `unshare -n` works and
//    without proxy or session variables: regressions (the bed's own tests),
//    acceptance (acceptance*.test.*), constraints (constraints*.test.* plus
//    the _global tests), and the agent's new tests (recorded, not scored).
//    `all_green` is acceptance, constraints and regressions all passing; a
//    group with no files does not count against it.
//
// For a plan session it records whether PLAN.md exists and whether the
// session changed code; judge.mjs scores the plan.
//
// Every session's tool calls are scanned (common.mjs scanCalls):
// `left_folder` (any path under --p4, the work, task, grading and bed
// folders or this repository counts), `hidden_read` (the task, hidden or
// grading folder, the gate log, test/_hidden, a reference or naive patch, a
// rubric), Proof reads and writes, direct reads of Proof files, searches
// whose results showed Proof files, Skill calls, reads of cited code paths,
// and `none_found_proof` for a `none` session that touched Proof.
// `excluded` is true when any of left_folder, hidden_read or
// none_found_proof is. A session's `api_error` (run.mjs) is copied into the
// flags.
import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  citedPaths,
  cleanEnv,
  git,
  gradeEnv,
  hiddenFiles,
  listSessions,
  loadTasks,
  parseArgs,
  pickTasks,
  readJson,
  ROOT,
  BENCH,
  runCommand,
  scanCalls,
  TEST_FILE,
  toolCalls,
  withoutNetwork,
} from './common.mjs';

function options(argv) {
  const o = parseArgs(
    argv,
    {
      name: null,
      tasks: null,
      none: null,
      bed: null,
      bed10x: null,
      grade: null,
      arms: [],
      ids: [],
      only: [],
      jobs: 4,
      testTimeout: 120,
      task: null,
      patch: null,
      out: null,
      p4: null,
      hidden: null,
    },
    { lists: ['arms', 'ids', 'only'], flags: ['regrade', 'typecheck'] }
  );
  if (!o.tasks || !o.none)
    throw new Error('grade.mjs needs --tasks and --none (see the header)');
  o.tasks = resolve(o.tasks);
  o.none = resolve(o.none);
  o.grade = resolve(o.grade ?? join(dirname(o.tasks), 'grade'));
  if (o.bed) o.bed = resolve(o.bed);
  if (o.bed10x) o.bed10x = resolve(o.bed10x);
  // The p4 folder that holds the tasks, hidden tests, beds and gate log:
  // any path under it in a session's tool calls is a leak.
  o.p4 = resolve(o.p4 ?? dirname(o.tasks));
  o.hidden = resolve(o.hidden ?? join(o.p4, 'hidden'));
  o.dir = o._[0] ? resolve(o._[0]) : null;
  if (o.patch) {
    if (!o.task) throw new Error('--patch needs --task');
    return o;
  }
  if (!o.dir || !o.name)
    throw new Error(
      'usage: grade.mjs <work-dir> --name <run> --tasks … --none …'
    );
  return o;
}

let pristinePromise = null;
/** A clean clone of the none bed at its HEAD, made once per HEAD. */
function pristine(o) {
  pristinePromise ??= (async () => {
    const dir = join(o.grade, '_pristine');
    const head = git(o.none, 'rev-parse', 'HEAD').trim();
    if (
      !existsSync(join(dir, '.git')) ||
      git(dir, 'rev-parse', 'HEAD').trim() !== head
    ) {
      await rm(dir, { recursive: true, force: true });
      await mkdir(o.grade, { recursive: true });
      git(o.grade, 'clone', '--quiet', '--no-hardlinks', o.none, dir);
    }
    return { dir, head };
  })();
  return pristinePromise;
}

/** Leaf test failures and counts from TAP output. */
function parseTap(text) {
  const failing = [];
  let last = null;
  const count = (key) => {
    const m = text.match(new RegExp(`^# ${key} (\\d+)$`, 'm'));
    return m ? Number(m[1]) : null;
  };
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*not ok \d+ - (.*)$/);
    if (m) {
      last = { name: m[1].trim(), parent: false };
      failing.push(last);
    } else if (last && /failureType: 'subtestsFailed'/.test(line))
      last.parent = true;
  }
  return {
    tests: count('tests'),
    passed: count('pass'),
    failed: count('fail'),
    failing: [...new Set(failing.filter((f) => !f.parent).map((f) => f.name))],
  };
}

async function runGroup(tree, files, timeoutSeconds) {
  if (!files.length) return { pass: null, files: [] };
  // The agent's code and tests run with no network where the machine
  // allows it, and never with the launching session's variables or proxy.
  const { cmd, argv, isolated } = withoutNetwork(process.execPath, [
    '--experimental-strip-types',
    '--test',
    '--test-reporter=tap',
    ...files,
  ]);
  const run = await runCommand(cmd, argv, {
    cwd: tree,
    env: gradeEnv(),
    timeout: timeoutSeconds * 1000,
  });
  const tap = parseTap(run.stdout);
  return {
    pass: run.code === 0 && !run.timedOut,
    timed_out: run.timedOut,
    network_isolated: isolated,
    exit_code: run.code,
    ms: run.ms,
    files,
    ...tap,
  };
}

const failed = (reason) => ({ pass: false, reason });

/**
 * The _global files that apply to `task`. `_global/globals.json` maps a
 * file name to the categories it runs for; a file it does not list runs
 * for every task. Rules only Proof states (R1, R3) are graded on
 * proof-only, proof-only-hard and stale tasks only, so a control or
 * code-visible task is never scored on a rule its arm had no way to see.
 */
export function globalFiles(tasksDir, task) {
  const dir = join(tasksDir, '_global');
  if (!existsSync(dir)) return [];
  const scope = existsSync(join(dir, 'globals.json'))
    ? JSON.parse(readFileSync(join(dir, 'globals.json'), 'utf8'))
    : {};
  return readdirSync(dir).filter(
    (name) =>
      name !== 'globals.json' &&
      (!scope[name] || scope[name].includes(task.category))
  );
}

/** Grades one diff of `task` on a fresh tree; returns the build result. */
export async function gradeDiff(o, task, diffText) {
  const { dir: source, head } = await pristine(o);
  const tree = join(o.grade, `${task.id}-${randomUUID().slice(0, 8)}`);
  await cp(source, tree, { recursive: true });
  try {
    // A copied index holds the source's file times; refresh it, or
    // `git apply --3way` finds that the files "do not match index".
    git(tree, 'update-index', '-q', '--refresh');
    // Everything the bed tracks under test/: test files, helpers, fixtures.
    const tracked = git(tree, 'ls-files', '--', 'test')
      .split('\n')
      .filter(Boolean);
    const originals = tracked.filter((f) => TEST_FILE.test(f));
    const out = { base: head, apply_failed: false };
    if (diffText.trim()) {
      const patch = join(tree, '.git', 'session.diff');
      await writeFile(patch, diffText);
      try {
        git(tree, 'apply', '--3way', '--whitespace=nowarn', patch);
      } catch (error) {
        out.apply_failed = true;
        out.apply_error = String(error.stderr || error.message).slice(0, 2000);
      }
      await rm(patch, { force: true });
    }
    git(tree, 'add', '-A');
    // --no-renames: a renamed test file shows as a deletion plus an
    // addition, so the original is restored and the rename is flagged.
    const numstat = git(
      tree,
      'diff',
      '--cached',
      '--numstat',
      '--no-renames',
      'HEAD'
    )
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [added, removed, path] = line.split('\t');
        return {
          path,
          added: Number(added) || 0,
          removed: Number(removed) || 0,
        };
      });
    out.diff = {
      bytes: Buffer.byteLength(diffText),
      files: numstat.map((f) => f.path),
      lines_added: numstat.reduce((n, f) => n + f.added, 0),
      lines_removed: numstat.reduce((n, f) => n + f.removed, 0),
    };
    if (out.apply_failed) {
      for (const group of ['acceptance', 'constraints', 'regressions'])
        out[group] = failed('apply_failed');
      out.agent_tests = { pass: null, files: [] };
      out.all_green = false;
      return out;
    }
    const originalSet = new Set(originals);
    const trackedSet = new Set(tracked);
    out.edited_existing_tests = out.diff.files.filter((f) =>
      originalSet.has(f)
    );
    // Helpers and fixtures the original tests read are restored too, so an
    // edit there cannot hide a regression; such edits are flagged apart.
    out.edited_test_support = out.diff.files.filter(
      (f) => trackedSet.has(f) && !originalSet.has(f)
    );
    const restore = [...out.edited_existing_tests, ...out.edited_test_support];
    if (restore.length) {
      git(tree, 'reset', '-q', 'HEAD', '--', ...restore);
      git(tree, 'checkout', 'HEAD', '--', ...restore);
    }
    const agentTests = out.diff.files.filter(
      (f) =>
        TEST_FILE.test(f) &&
        !originalSet.has(f) &&
        !f.startsWith('test/_hidden/') &&
        existsSync(join(tree, f))
    );
    const hidden = join(tree, 'test', '_hidden');
    await rm(hidden, { recursive: true, force: true });
    await mkdir(hidden, { recursive: true });
    const names = [];
    for (const name of hiddenFiles(task.dir)) {
      await cp(join(task.dir, name), join(hidden, name), { recursive: true });
      names.push(name);
    }
    const globals = globalFiles(o.tasks, task);
    const global = join(o.tasks, '_global');
    for (const name of globals)
      await cp(join(global, name), join(hidden, name), { recursive: true });
    const at = (list) => list.map((name) => `test/_hidden/${name}`);
    const acceptance = at(names.filter((n) => /^acceptance.*\.test\./.test(n)));
    const constraints = at([
      ...names.filter((n) => /^constraints.*\.test\./.test(n)),
      ...globals.filter((n) => TEST_FILE.test(n)),
    ]);
    const t = o.testTimeout;
    out.regressions = await runGroup(tree, originals, t);
    out.acceptance = acceptance.length
      ? await runGroup(tree, acceptance, t)
      : failed('no acceptance tests in the task folder');
    out.constraints = await runGroup(tree, constraints, t);
    out.agent_tests = await runGroup(tree, agentTests, t);
    out.all_green =
      out.acceptance.pass === true &&
      out.regressions.pass !== false &&
      out.constraints.pass !== false;
    if (o.typecheck && existsSync(join(tree, 'tsconfig.json'))) {
      const tsc = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
      const run = await runCommand(
        process.execPath,
        [tsc, '--noEmit', '-p', 'tsconfig.json'],
        { cwd: tree, env: cleanEnv(), timeout: t * 1000 }
      );
      out.typecheck = {
        pass: run.code === 0,
        output: run.stdout.slice(0, 4000),
      };
    }
    return out;
  } finally {
    await rm(tree, { recursive: true, force: true });
  }
}

async function gradeSession(o, s, task, cited) {
  const meta = await readJson(join(s.dir, 'session.json'), {});
  const calls = await toolCalls(join(s.dir, 'transcript.jsonl'));
  const scan = scanCalls(calls, {
    clone: meta.clone,
    protectedRoots: [
      o.dir,
      o.tasks,
      o.grade,
      o.none,
      o.bed,
      o.bed10x,
      meta.bed,
      o.p4,
      ROOT,
    ].filter(Boolean),
    // The committed copies of the hidden tests, patches and plans count too.
    hiddenRoots: [
      o.tasks,
      o.grade,
      o.hidden,
      join(o.p4, 'gate.log'),
      join(BENCH, 'hidden'),
      join(BENCH, 'tasks'),
    ],
    citedPaths: cited,
  });
  const flags = {
    ...scan,
    none_found_proof: s.arm === 'none' && scan.proof_touch,
    timed_out: Boolean(meta.timed_out),
    api_error: meta.api_error ?? null,
  };
  flags.excluded =
    flags.left_folder || flags.hidden_read || flags.none_found_proof;
  const diffText = await readFile(join(s.dir, 'session.diff'), 'utf8').catch(
    () => ''
  );
  const grade = {
    task: s.id,
    arm: s.arm,
    run: o.name,
    kind: task.kind,
    category: task.category ?? null,
    graded_at: new Date().toISOString(),
    flags,
  };
  if (task.kind === 'build')
    Object.assign(grade, await gradeDiff(o, task, diffText));
  else {
    const plan = await readFile(join(s.dir, 'PLAN.md'), 'utf8').catch(
      () => null
    );
    grade.plan_written = plan !== null;
    grade.plan_chars = plan?.length ?? 0;
    grade.plan_changed_code = diffText.trim().length > 0;
    grade.diff = { bytes: Buffer.byteLength(diffText) };
  }
  await writeFile(
    join(s.dir, 'grade.json'),
    `${JSON.stringify(grade, null, 2)}\n`
  );
  return grade;
}

const brief = (g) =>
  g.kind === 'plan'
    ? `plan written=${g.plan_written} changed_code=${g.plan_changed_code}`
    : `all_green=${g.all_green} acceptance=${g.acceptance.pass} constraints=${
        g.constraints.pass
      } regressions=${g.regressions.pass}${
        g.apply_failed ? ' APPLY_FAILED' : ''
      }`;

async function main() {
  const o = options(process.argv.slice(2));
  const tasks = loadTasks(o.tasks);
  if (o.patch) {
    const task = tasks.find((t) => t.id === o.task);
    if (!task) throw new Error(`No task ${o.task}`);
    if (task.kind !== 'build') throw new Error(`${o.task} is a plan task`);
    const diffText = await readFile(resolve(o.patch), 'utf8');
    const grade = {
      task: task.id,
      patch: resolve(o.patch),
      ...(await gradeDiff(o, task, diffText)),
    };
    const json = `${JSON.stringify(grade, null, 2)}\n`;
    if (o.out) await writeFile(resolve(o.out), json);
    else process.stdout.write(json);
    console.error(
      `${task.id} ${o.patch}: ${brief({ kind: 'build', ...grade })}`
    );
    return;
  }
  const picked = new Map(pickTasks(tasks, o).map((t) => [t.id, t]));
  const cited = o.bed ? citedPaths(join(o.bed, '.flatbread-proof')) : [];
  const todo = [];
  for (const s of listSessions(o.dir, o.name)) {
    if (o.arms.length && !o.arms.includes(s.arm)) continue;
    const task = picked.get(s.id);
    if (!task) continue;
    const meta = await readJson(join(s.dir, 'session.json'));
    if (!meta?.done) continue;
    if (!o.regrade && existsSync(join(s.dir, 'grade.json'))) continue;
    todo.push({ s, task });
  }
  console.log(`${todo.length} sessions to grade, ${o.jobs} at a time`);
  const worker = async () => {
    for (let job = todo.shift(); job; job = todo.shift()) {
      const g = await gradeSession(o, job.s, job.task, cited);
      console.log(
        `${job.s.arm}/${job.s.id}: ${brief(g)}${
          g.flags.excluded ? ' EXCLUDED' : ''
        }`
      );
    }
  };
  await Promise.all(Array.from({ length: o.jobs }, worker));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
