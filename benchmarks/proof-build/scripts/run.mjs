#!/usr/bin/env node
// Runs the build benchmark: one fresh, headless Claude Code session per
// task and arm, each in its own clone of the right bed variant.
//
//   node scripts/run.mjs <work-dir> --name <run> --bed <p4/bed>
//        [--none <p4/bed-none>] [--bed10x <p4/bed-x10>]
//        [--tasks <p4/tasks>] [--arms none,skill,brief,find,findcode,dump]
//        [--only build|plan|proof-only|code-visible|stale|control|proof-only-hard]
//        [--ids B-P1,L-K1] [--jobs 8] [--timeout 1500] [--model haiku]
//        [--effort <level>] [--prepare-only] [--keep]
//
// --none and --bed10x default to `<bed>-none` and `<bed>-x10`, and --tasks
// to `tasks` beside the bed (the p4/ layout gen-bed.mjs and gate.mjs
// write). The default arms are the six primary ones; add `dump10x` to run
// the burden ceiling on the 10x bed.
//
// A session whose result event is an API error is not a task failure:
// a transient one (rate limit, overload, server or network error) leaves
// the session not done, so a rerun tries it again, up to --attempts times;
// any other error (for example a prompt too long for the context window)
// marks it done with `api_error` set, and compare.mjs reports those
// sessions apart.
//
// Each session keeps its files in <work-dir>/<run>/<arm>/<task>/: TASK.md
// (the full task text, which the session gets on stdin), transcript.jsonl,
// stderr.txt, session.diff, PLAN.md when one was written, and
// session.json. Its clone lives in <work-dir>/<run>/clones/<hash>/, a path
// that names neither arm nor task, and is deleted once the diff is captured
// (keep it with --keep). A rerun skips sessions whose session.json says
// `done`, so an interrupted run picks up where it stopped.
//
// Clones: `none` clones the none variant; every other arm clones the proof
// variant (dump10x the 10x one) and gains `.claude/skills/proof/` (a copy
// of the repository's proof skill), a `./flatbread` wrapper, a
// node_modules link, and one line in AGENTS.md. Every arm gets CLAUDE.md =
// `@AGENTS.md`, so AGENTS.md loads the same way in each. The runner's
// files are listed in .git/info/exclude and left out of session.diff.
// Hidden tests, patches and rubrics never enter a clone: grade.mjs copies
// the tests into a separate grading tree after the session ends.
//
// --prepare-only builds every clone and TASK.md, then stops. It starts no
// session and keeps the clones, so you can inspect what a session would
// see; a later real run re-prepares them.
//
// Sessions get Bash, Read, Edit, Write, Glob, Grep and Skill, no MCP
// servers, project settings only (so the clone's skill loads), no session
// persistence, and an environment without the launching session's
// variables or FLATBREAD_PROOF_SERVER.
import { randomUUID } from 'node:crypto';
import {
  createWriteStream,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from 'node:fs';
import {
  appendFile,
  cp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sessionCost } from '../../proof-recall/scripts/collect.mjs';
import { AGENTS_LINE, ARMS, armText, CLAUDE_MD, CLONE } from './arms.mjs';
import {
  cleanEnv,
  cloneDir,
  DIFF_EXCLUDE,
  FLATBREAD_BIN,
  git,
  hiddenFiles,
  isUnder,
  loadTasks,
  parseArgs,
  pickTasks,
  readJson,
  ROOT,
  SESSION_FILES,
  sessionDir,
  transcriptEnds,
} from './common.mjs';
import { injectText } from './inject.mjs';

const TOOLS = 'Bash,Read,Edit,Write,Glob,Grep,Skill';
const SKILL_SOURCE = join(ROOT, '.agents', 'skills', 'proof');
const REMOTE = 'https://git.tessera.example/tessera-core.git';
const PRIMARY_ARMS = ARMS.filter((arm) => arm !== 'dump10x');
const TRANSIENT =
  /rate.?limit|overloaded|\b5\d\d\b|internal server error|ECONN|ETIMEDOUT|EAI_AGAIN|socket hang up|network|fetch failed/i;

export function options(argv) {
  const o = parseArgs(
    argv,
    {
      name: null,
      bed: null,
      none: null,
      bed10x: null,
      tasks: null,
      arms: PRIMARY_ARMS,
      only: [],
      ids: [],
      jobs: 8,
      timeout: 1500,
      model: 'haiku',
      effort: null,
      attempts: 3,
    },
    { lists: ['arms', 'only', 'ids'], flags: ['prepareOnly', 'keep'] }
  );
  const [dir, ...extra] = o._;
  if (!dir || extra.length || !o.name || !o.bed)
    throw new Error(
      'usage: run.mjs <work-dir> --name <run> --bed <proof bed> [options]'
    );
  o.dir = resolve(dir);
  o.bed = resolve(o.bed);
  o.none = resolve(o.none ?? `${o.bed}-none`);
  o.bed10x = resolve(o.bed10x ?? `${o.bed}-x10`);
  o.tasks = resolve(o.tasks ?? join(dirname(o.bed), 'tasks'));
  for (const arm of o.arms)
    if (!ARMS.includes(arm))
      throw new Error(`Unknown arm ${arm}; choose from ${ARMS.join(',')}`);
  if (!/^[\w.-]+$/.test(o.name))
    throw new Error('--name may hold only letters, digits, . _ -');
  const beds = { none: o.none, proof: o.bed, proof10x: o.bed10x };
  o.beds = beds;
  const used = new Set(o.arms.map((arm) => CLONE[arm].bed));
  for (const variant of used)
    if (!existsSync(join(beds[variant], '.git')))
      throw new Error(
        `No ${variant} bed (a git repository) at ${beds[variant]}`
      );
  for (const [label, root] of [
    ['the repository', ROOT],
    ['the task folder', o.tasks],
    ...Object.entries(beds).map(([v, path]) => [`the ${v} bed`, path]),
  ])
    if (isUnder(o.dir, root))
      throw new Error(`Keep <work-dir> outside ${label} (${root})`);
  if (isUnder(o.tasks, o.dir))
    throw new Error('Keep the task folder outside <work-dir>');
  return o;
}

/**
 * Memory files that Claude Code would load from a folder above the clones.
 * Any of them would reach every arm, so a real run refuses to start.
 */
function ancestorMemory(dir) {
  const found = [];
  for (let at = dir; ; at = dirname(at)) {
    for (const name of ['CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.md', '.claude'])
      if (existsSync(join(at, name))) found.push(join(at, name));
    if (dirname(at) === at) break;
  }
  return found;
}

/** The variants' code trees, with Proof's files left out, must match. */
function checkBeds(o) {
  const tree = (bed) =>
    git(bed, 'ls-tree', '-r', 'HEAD')
      .split('\n')
      .filter(
        (line) =>
          line && !/\t(\.flatbread-proof\/|flatbread\.config\.js$)/.test(line)
      )
      .join('\n');
  const none = tree(o.none);
  const variants = new Set(o.arms.map((arm) => CLONE[arm].bed));
  for (const variant of variants)
    if (variant !== 'none' && tree(o.beds[variant]) !== none)
      throw new Error(
        `The ${variant} bed's code differs from the none bed's (git ls-tree)`
      );
  if (variants.has('none')) {
    const files = git(o.none, 'ls-files');
    if (/^(\.flatbread-proof\/|flatbread\.config\.js$)/m.test(files))
      throw new Error('The none bed holds Proof files');
    if (/^Proof:/m.test(git(o.none, 'log', '--format=%B')))
      throw new Error('The none bed has Proof: trailers');
  }
}

async function prepareClone(clone, bed, proof) {
  await rm(clone, { recursive: true, force: true });
  await mkdir(dirname(clone), { recursive: true });
  git(dirname(clone), 'clone', '--quiet', '--no-hardlinks', bed, clone);
  git(clone, 'remote', 'set-url', 'origin', REMOTE);
  // The reflogs record "clone: from <bed>", which names the p4 folder.
  await rm(join(clone, '.git', 'logs'), { recursive: true, force: true });
  for (const file of readdirSync(join(clone, '.git'), { recursive: true })) {
    const path = join(clone, '.git', file);
    if (statSync(path).isFile() && readFileSync(path).includes(bed))
      throw new Error(`${path} still names the bed path ${bed}`);
  }
  const base = git(clone, 'rev-parse', 'HEAD').trim();
  await writeFile(join(clone, 'CLAUDE.md'), CLAUDE_MD);
  if (proof) {
    if (!existsSync(join(clone, '.flatbread-proof')))
      throw new Error(`${bed} has no .flatbread-proof folder`);
    const agents = join(clone, 'AGENTS.md');
    const before = existsSync(agents) ? await readFile(agents, 'utf8') : '';
    await writeFile(
      agents,
      `${before}${before && !before.endsWith('\n') ? '\n' : ''}${
        before ? '\n' : ''
      }${AGENTS_LINE}\n`
    );
    await cp(SKILL_SOURCE, join(clone, '.claude', 'skills', 'proof'), {
      recursive: true,
      filter: (src) => !src.includes(`${SKILL_SOURCE}/evals`),
    });
    await symlink(join(ROOT, 'node_modules'), join(clone, 'node_modules'));
    await writeFile(
      join(clone, 'flatbread'),
      `#!/bin/sh\nunset FLATBREAD_PROOF_SERVER\nexec node "${FLATBREAD_BIN}" "$@"\n`,
      { mode: 0o755 }
    );
  } else if (
    existsSync(join(clone, '.flatbread-proof')) ||
    existsSync(join(clone, 'flatbread.config.js'))
  )
    throw new Error(`${bed} is not a none variant: it holds Proof files`);
  // A `none` clone lists only its CLAUDE.md, so its exclude file names
  // nothing about Proof. In a Proof clone, AGENTS.md is marked
  // skip-worktree, so the added line does not show as a change.
  await appendFile(
    join(clone, '.git', 'info', 'exclude'),
    `${(proof ? SESSION_FILES : ['/CLAUDE.md']).join('\n')}\n`
  );
  if (proof && git(clone, 'ls-files', 'AGENTS.md').trim())
    git(clone, 'update-index', '--skip-worktree', 'AGENTS.md');
  if (existsSync(join(clone, 'test', '_hidden')))
    throw new Error(`${bed} holds test/_hidden`);
  return base;
}

export async function prepare(s, o, cache) {
  // Attempts survive a re-prepare, so a transient API error is retried a
  // bounded number of times.
  const previous = await readJson(join(s.dir, 'session.json'));
  await rm(s.dir, { recursive: true, force: true });
  await mkdir(s.dir, { recursive: true });
  const { bed: variant, proof, inject } = CLONE[s.arm];
  const bed = o.beds[variant];
  const base = await prepareClone(s.clone, bed, proof);
  for (const name of hiddenFiles(s.task.dir))
    if (existsSync(join(s.clone, 'test', '_hidden', name)))
      throw new Error(`Hidden file ${name} is in the clone`);
  const text = armText({
    arm: s.arm,
    kind: s.task.kind,
    prompt: s.task.prompt,
    folder: s.clone,
    inject: inject ? await injectText(inject, bed, cache) : '',
  });
  await writeFile(join(s.dir, 'TASK.md'), text);
  await writeFile(
    join(s.dir, 'session.json'),
    `${JSON.stringify(
      {
        task: s.task.id,
        kind: s.task.kind,
        category: s.task.category ?? null,
        arm: s.arm,
        run: o.name,
        bed,
        variant,
        clone: s.clone,
        base,
        task_chars: text.length,
        attempts: previous?.attempts ?? 0,
        prepared_at: new Date().toISOString(),
        done: false,
      },
      null,
      2
    )}\n`
  );
  return text;
}

/** Runs one session with the task text on stdin. */
function launch(s, o, text) {
  return new Promise((done) => {
    const transcript = createWriteStream(join(s.dir, 'transcript.jsonl'));
    const argv = [
      '-p',
      '--model',
      o.model,
      ...(o.effort ? ['--effort', o.effort] : []),
      '--session-id',
      randomUUID(),
      '--no-session-persistence',
      '--strict-mcp-config',
      '--mcp-config',
      '{"mcpServers":{}}',
      '--tools',
      TOOLS,
      '--allowedTools',
      TOOLS,
      '--setting-sources',
      'project',
      '--output-format',
      'stream-json',
      '--verbose',
    ];
    const start = Date.now();
    const child = spawn('claude', argv, {
      cwd: s.clone,
      env: cleanEnv(),
      detached: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdin.end(text);
    child.stdout.pipe(transcript);
    let stderr = '';
    let timedOut = false;
    child.stderr.on('data', (chunk) => (stderr += chunk));
    const kill = (signal) => {
      try {
        process.kill(-child.pid, signal);
      } catch {
        // Already gone.
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      kill('SIGTERM');
      setTimeout(() => kill('SIGKILL'), 10e3).unref();
    }, o.timeout * 1000);
    child.on('close', async (code) => {
      clearTimeout(timer);
      transcript.end();
      if (stderr) await writeFile(join(s.dir, 'stderr.txt'), stderr);
      done({ code, timedOut, wall_ms: Date.now() - start });
    });
  });
}

/** Writes session.diff and PLAN.md, records cost, then drops the clone. */
export async function capture(s, o, outcome) {
  const meta = await readJson(join(s.dir, 'session.json'), {});
  git(s.clone, 'add', '-A');
  const diff = git(
    s.clone,
    'diff',
    '--cached',
    '--binary',
    meta.base,
    '--',
    '.',
    ...DIFF_EXCLUDE.map((path) => `:(exclude)${path}`)
  );
  await writeFile(join(s.dir, 'session.diff'), diff);
  const plan = join(s.clone, 'PLAN.md');
  if (existsSync(plan)) await cp(plan, join(s.dir, 'PLAN.md'));
  const proofChanged = git(
    s.clone,
    'diff',
    '--cached',
    '--name-only',
    meta.base,
    '--',
    '.flatbread-proof'
  ).trim();
  const transcript = join(s.dir, 'transcript.jsonl');
  const { init, result } = await transcriptEnds(transcript);
  const cost = await sessionCost(transcript, s.clone);
  // sessionCost's left_folder treats any `..` in a file's content as
  // leaving; grade.mjs scans tool calls with a rule fit for code edits.
  delete cost.left_folder;
  // An API error is the harness's problem, not the agent's: see the header.
  const apiError = result?.is_error
    ? {
        subtype: result.subtype ?? null,
        message: String(result.result ?? result.error ?? '').slice(0, 500),
        transient: TRANSIENT.test(
          `${result.subtype ?? ''} ${result.result ?? ''} ${result.error ?? ''}`
        ),
      }
    : null;
  const attempts = (meta.attempts ?? 0) + 1;
  const finished =
    outcome.timedOut ||
    (Boolean(result) &&
      (!apiError || !apiError.transient || attempts >= o.attempts));
  await writeFile(
    join(s.dir, 'session.json'),
    `${JSON.stringify(
      {
        ...meta,
        done: finished,
        attempts,
        api_error: apiError,
        exit_code: outcome.code,
        timed_out: outcome.timedOut,
        wall_ms: result?.duration_ms ?? outcome.wall_ms,
        model_requested: o.model,
        effort_requested: o.effort,
        init: init && {
          model: init.model,
          tools: init.tools,
          skills: init.skills,
          slash_commands: init.slash_commands,
          permissionMode: init.permissionMode,
          claude_code_version: init.claude_code_version,
        },
        result: result && {
          subtype: result.subtype,
          is_error: result.is_error,
          num_turns: result.num_turns,
          duration_ms: result.duration_ms,
          total_cost_usd: result.total_cost_usd,
        },
        cost,
        diff_bytes: Buffer.byteLength(diff),
        plan_written: existsSync(plan),
        proof_graph_changed: proofChanged ? proofChanged.split('\n') : [],
        captured_at: new Date().toISOString(),
      },
      null,
      2
    )}\n`
  );
  if (!o.keep) await rm(s.clone, { recursive: true, force: true });
  return finished;
}

async function main() {
  const o = options(process.argv.slice(2));
  checkBeds(o);
  const memory = ancestorMemory(o.dir);
  if (memory.length) {
    const message = `Memory files above <work-dir> would reach every session: ${memory.join(
      ', '
    )}`;
    if (!o.prepareOnly) throw new Error(message);
    console.warn(`Warning: ${message}`);
  }
  const tasks = pickTasks(loadTasks(o.tasks), o);
  if (!tasks.length) throw new Error('No tasks picked');
  // Alternate arms task by task, so a change in API speed over the run
  // falls on every arm alike. A task's `skipArms` (task.json) are left out.
  const sessions = [];
  for (const task of tasks)
    for (const arm of o.arms.filter((a) => !task.skipArms?.includes(a)))
      sessions.push({
        task,
        arm,
        dir: sessionDir(o.dir, o.name, arm, task.id),
        clone: cloneDir(o.dir, o.name, arm, task.id),
      });
  const todo = [];
  for (const s of sessions) {
    const meta = await readJson(join(s.dir, 'session.json'));
    if (!meta?.done) todo.push(s);
  }
  console.log(
    `${sessions.length} sessions (${tasks.length} tasks x ${o.arms.length} arms, less skipped arms), ${todo.length} to run, ${o.jobs} at a time`
  );
  const cache = join(o.dir, '.inject');
  if (o.prepareOnly) {
    for (const s of todo) {
      const text = await prepare(s, o, cache);
      console.log(
        `${s.arm}/${s.task.id}: ${s.clone} (${text.length} chars of task text)`
      );
    }
    console.log(`Prepared ${todo.length} sessions; started no sessions`);
    return;
  }
  let done = 0;
  const failures = [];
  const worker = async () => {
    for (let s = todo.shift(); s; s = todo.shift()) {
      const text = await prepare(s, o, cache);
      const outcome = await launch(s, o, text);
      const finished = await capture(s, o, outcome);
      done++;
      const label = outcome.timedOut ? 'timeout' : outcome.code;
      if (!finished || outcome.code !== 0)
        failures.push(`${s.arm}/${s.task.id}: ${label}`);
      console.log(`[${done}] ${s.arm}/${s.task.id}: ${label}`);
    }
  };
  await Promise.all(Array.from({ length: o.jobs }, worker));
  if (failures.length) console.warn(`Not clean:\n${failures.join('\n')}`);
  console.log(
    `Grade with: node ${join('scripts', 'grade.mjs')} ${o.dir} --name ${
      o.name
    } --tasks ${o.tasks} --none ${o.none} --bed ${o.bed}${
      o.arms.includes('dump10x') ? ` --bed10x ${o.bed10x}` : ''
    }`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
