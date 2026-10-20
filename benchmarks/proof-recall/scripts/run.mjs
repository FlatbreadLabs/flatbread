#!/usr/bin/env node
// Runs the benchmark: one fresh, headless Claude Code session per question
// and per strategy, then collects answers and cost into run files.
//
//   node scripts/run.mjs <work-dir> --name <run> [--model haiku]
//        [--strategies brief,nobrief,find,findstate] [--only render] [--ids a,b]
//        [--jobs 8] [--timeout 600] [--graph <built-graph-dir>]
//        [--server <socket>] [--no-serve] [--repo <test bed>] [--prepare-only]
//   node scripts/run.mjs --stop-server [--server <socket>]
//
// --strategies names the task texts in task.mjs to run; the default is
// brief,nobrief. The default questions are the original 246. --only names
// question sets by their `effort` field: `--only ambiguous` runs the
// ambiguous-Effort set alone, and `--only default,ambiguous` runs both in
// one run. --ids picks questions from any set. Each session works in <work-dir>/<strategy>/<id>/, which
// holds a link to the shared copy of the graph, TASK.md, the agent's
// answer.json, and transcript.jsonl. A rerun skips sessions that already
// have both an answer and a transcript, so an interrupted run picks up where
// it stopped. Keep <work-dir> outside the repository, so no CLAUDE.md or
// AGENTS.md reaches the agent. Each run file records `find_hash`,
// `state_hash`, and `read_hash`, hashes of the `proof find`, `proof state`,
// and `get`/`records`/`brief` sources, to match against the offline gates'
// output.
//
// Runs share two things, kept under <tmp>/flatbread-proof-recall/:
//
// - graphs/<hash>/: one read-only copy of each built graph, without its key
//   map, named by a hash of its contents. Every run on the same build reads
//   the same files.
// - proof.sock: one `flatbread proof serve` process that keeps each graph
//   loaded and answers every session's reads, so no read rebuilds the graph.
//   It serves reads only. The first run that finds no server starts one and
//   leaves it running for later runs, including runs in parallel; stop it
//   with --stop-server, or restart it after rebuilding the CLI so it runs
//   the new code. --no-serve makes every read run locally instead.
//
// --repo <dir> runs the code and branch sets (`--only code`, `--only
// branch`) on the git test bed from build-repo.mjs. Each session's folder is
// then its own `git clone --no-hardlinks` of the test bed, so git log, the
// branches, and the draft-PR file are there for every strategy. It holds no
// key map, spec, or questions file. These runs use neither the shared graph
// copy nor the read server: every clone is a different graph root, so
// reads run locally.
//
// --prepare-only builds every session folder and TASK.md, then stops. It
// starts no agent session and no server, and makes no shared graph copy, so
// it is the way to inspect what sessions would see.
//
// Sessions get only the Bash, Read, and Write tools, no MCP servers, and no
// settings files, so an agent cannot reach other sessions or services.
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream, existsSync, openSync } from 'node:fs';
import {
  chmod,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect, findHash, readHash, stateHash } from './collect.mjs';
import {
  copyPublicGraph,
  prepareClone,
  prepareFolder,
  publicQuestions,
} from './prepare-run.mjs';
import { pickQuestions, REPO_SETS, RUNS_DIR } from './check.mjs';
import { STRATEGIES, taskText } from './task.mjs';

const BENCH = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// What runs share: graph copies and the read server.
const SHARED = join(tmpdir(), 'flatbread-proof-recall');
const TOOLS = 'Bash,Read,Write';
const FLATBREAD_BIN = resolve(
  BENCH,
  '..',
  '..',
  'packages',
  'flatbread',
  'bin',
  'flatbread.js'
);
// Variables that tie a process to the Claude Code session that launched it.
// A benchmark session inheriting them could report into that session.
const SESSION_VARS = [
  'CLAUDE_CODE_SESSION_ID',
  'CLAUDE_CODE_REMOTE_SESSION_ID',
  'CLAUDE_CODE_REMOTE_SDK_URL',
  'CLAUDE_CODE_MESSAGING_SOCKET',
  'CLAUDE_CODE_MESSAGING_TOKEN',
  'CLAUDE_SESSION_INGRESS_TOKEN_FILE',
  'CLAUDE_CODE_CHILD_SESSION',
  'CLAUDE_CODE_SESSION_ATTENDED',
  'CLAUDE_CODE_SYNC_SESSION_REFS',
  'CLAUDE_CODE_TEE_SDK_STDOUT',
  'CLAUDE_PID',
];

function args(argv) {
  const out = {
    dir: null,
    name: null,
    model: 'haiku',
    strategies: ['brief', 'nobrief'],
    only: [],
    ids: [],
    jobs: 8,
    timeout: 600,
    graph: undefined,
    serve: true,
    server: join(SHARED, 'proof.sock'),
    stopServer: false,
    repo: null,
    prepareOnly: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = () => argv[++i];
    if (flag === '--name') out.name = next();
    else if (flag === '--model') out.model = next();
    else if (flag === '--strategies') out.strategies = next().split(',');
    else if (flag === '--only') out.only = next().split(',');
    else if (flag === '--ids') out.ids = next().split(',');
    else if (flag === '--jobs') out.jobs = Number(next());
    else if (flag === '--timeout') out.timeout = Number(next());
    else if (flag === '--graph') out.graph = resolve(next());
    else if (flag === '--no-serve') out.serve = false;
    else if (flag === '--server') out.server = resolve(next());
    else if (flag === '--stop-server') out.stopServer = true;
    else if (flag === '--repo') out.repo = resolve(next());
    else if (flag === '--prepare-only') out.prepareOnly = true;
    else if (!flag.startsWith('--') && !out.dir) out.dir = resolve(flag);
    else throw new Error(`Unknown argument ${flag}`);
  }
  if (out.stopServer) return out;
  for (const strategy of out.strategies)
    if (!STRATEGIES.includes(strategy))
      throw new Error(
        `Unknown strategy ${strategy}; choose from ${STRATEGIES.join(',')}`
      );
  if (!out.dir || !out.name)
    throw new Error('usage: run.mjs <work-dir> --name <run> [options]');
  if (out.dir.startsWith(resolve(BENCH, '..', '..') + '/'))
    throw new Error('Keep <work-dir> outside the repository');
  if (out.repo && out.dir.startsWith(`${out.repo}/`))
    throw new Error('Keep <work-dir> outside the test bed');
  if (out.repo && out.graph)
    throw new Error(
      '--repo sessions read the graph in their clone; drop --graph'
    );
  return out;
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** True when something answers HTTP on `socket`: a running `proof serve`. */
function serverAnswers(socket) {
  return new Promise((answer) => {
    const req = request(
      { socketPath: socket, path: '/', method: 'GET' },
      (res) => {
        res.resume();
        answer(true);
      }
    );
    req.on('error', () => answer(false));
    // A busy server accepts the connection but may not reply in time; a dead
    // socket refuses it at once. So a timeout means a server is there.
    req.setTimeout(2000, () => {
      req.destroy();
      answer(true);
    });
    req.end();
  });
}

/**
 * Reuses the read server on `socket`, or starts one that outlives this run.
 * A lock folder makes sure that runs starting together start one server.
 */
async function ensureServer(socket) {
  if (await serverAnswers(socket)) return 'reused';
  const dir = dirname(socket);
  await mkdir(dir, { recursive: true });
  const lock = `${socket}.lock`;
  for (let i = 0; ; i++) {
    try {
      await mkdir(lock);
      break;
    } catch {
      if (await serverAnswers(socket)) return 'reused';
      // A run that died mid-start leaves its lock; take it after a minute.
      const age = Date.now() - (await stat(lock).catch(() => null))?.mtimeMs;
      if (age > 60e3) await rm(lock, { recursive: true, force: true });
      else if (i > 600) throw new Error(`Gave up waiting for ${lock}`);
      await sleep(200);
    }
  }
  try {
    if (await serverAnswers(socket)) return 'reused';
    const log = openSync(join(dir, 'serve.log'), 'a');
    const child = spawn(
      process.execPath,
      [FLATBREAD_BIN, 'proof', 'serve', '--socket', socket],
      { cwd: dir, detached: true, stdio: ['ignore', log, log] }
    );
    child.unref();
    // A server busy building a large graph can miss the probe above, so this
    // child may find the socket taken and exit. Record its pid only when it
    // is the one that answers, or --stop-server would miss the live server.
    let exited = false;
    child.once('exit', () => (exited = true));
    for (let i = 0; i < 300; i++) {
      if (await serverAnswers(socket)) {
        // A child that found the socket taken exits within its own probe's
        // two-second timeout; wait that long before calling it the server.
        for (let j = 0; j < 15 && !exited; j++) await sleep(200);
        if (exited) return 'reused';
        await writeFile(`${socket}.pid`, `${child.pid}\n`);
        return 'started';
      }
      await sleep(200);
    }
    throw new Error(`proof serve did not start; see ${join(dir, 'serve.log')}`);
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}

/** Stops the server that `ensureServer` started on `socket`. */
async function stopServer(socket) {
  const pid = Number(await readFile(`${socket}.pid`, 'utf8').catch(() => NaN));
  if (pid) {
    try {
      process.kill(pid);
      console.log(`Stopped proof serve (pid ${pid})`);
    } catch {
      console.log(`No proof serve running as pid ${pid}`);
    }
  } else console.log(`No proof serve recorded for ${socket}`);
  await rm(`${socket}.pid`, { force: true });
  await rm(socket, { force: true });
}

/**
 * One hash over every file under `dir` but the key map: its path relative to
 * `dir` and its bytes. A graph and its public copy hash the same.
 */
async function treeHash(dir) {
  const hash = createHash('sha256');
  const walk = async (path) => {
    const entries = (await readdir(path, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
    for (const entry of entries) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) await walk(child);
      else if (entry.name !== 'keymap.json')
        hash
          .update(relative(dir, child))
          .update('\0')
          .update(await readFile(child));
    }
  };
  await walk(dir);
  return hash.digest('hex');
}

/**
 * The shared public copy of `graph`, made once per build. A copy whose files
 * no longer match its name was changed after the fact, so it is made again.
 */
async function sharedGraph(graph = join(BENCH, '.flatbread-proof')) {
  const hash = await treeHash(graph);
  const dir = join(SHARED, 'graphs', hash.slice(0, 16));
  if (existsSync(dir) && (await treeHash(dir)) === hash) return { dir, hash };
  await rm(dir, { recursive: true, force: true });
  const temporary = `${dir}.tmp-${randomUUID()}`;
  await copyPublicGraph(temporary, graph);
  await chmodTree(temporary);
  try {
    await rename(temporary, dir);
  } catch {
    // Another run made the same copy first.
    await rm(temporary, { recursive: true, force: true });
  }
  return { dir, hash };
}

/** Makes a folder tree read-only, so no session can change what others read. */
async function chmodTree(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await chmodTree(path);
    else await chmod(path, 0o444);
  }
  await chmod(dir, 0o555);
}

function sessionEnv() {
  const env = { ...process.env };
  for (const key of SESSION_VARS) delete env[key];
  return env;
}

/** Runs one session; resolves with its exit code, or "timeout". */
function runSession(folder, model, timeoutSeconds) {
  return new Promise((resolveRun) => {
    const transcript = createWriteStream(join(folder, 'transcript.jsonl'));
    const child = spawn(
      'claude',
      [
        '-p',
        `Read ${join(folder, 'TASK.md')} and follow it exactly.`,
        '--model',
        model,
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
        '',
        '--output-format',
        'stream-json',
        '--verbose',
      ],
      { cwd: folder, env: sessionEnv(), stdio: ['ignore', 'pipe', 'pipe'] }
    );
    child.stdout.pipe(transcript);
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk));
    const timer = setTimeout(
      () => child.kill('SIGTERM'),
      timeoutSeconds * 1000
    );
    child.on('close', async (code, signal) => {
      clearTimeout(timer);
      transcript.end();
      if (stderr) await writeFile(join(folder, 'stderr.txt'), stderr);
      resolveRun(signal ? 'timeout' : code);
    });
  });
}

async function main() {
  const options = args(process.argv.slice(2));
  if (options.stopServer) return stopServer(options.server);
  // The test-bed sets need the test bed, and its graph holds records that
  // could change other sets' answers, so the two never share a run.
  const onBed = (await pickQuestions(options)).map((set) =>
    REPO_SETS.includes(set.effort)
  );
  if (options.repo && onBed.includes(false))
    throw new Error('--repo runs only the code and branch sets');
  if (!options.repo && onBed.includes(true))
    throw new Error('The code and branch sets need --repo <test bed>');
  const questions = await publicQuestions(options);
  const find_hash = await findHash();
  const state_hash = await stateHash();
  const read_hash = await readHash();
  // Alternate strategies question by question, so a change in API speed or
  // load over the run falls on every strategy alike.
  const sessions = [];
  for (const q of questions)
    for (const strategy of options.strategies)
      sessions.push({
        id: q.id,
        strategy,
        q,
        folder: join(options.dir, strategy, q.id),
      });
  const todo = sessions.filter(
    (s) =>
      !existsSync(join(s.folder, 'answer.json')) ||
      !existsSync(join(s.folder, 'transcript.jsonl'))
  );
  console.log(
    `${sessions.length} sessions, ${todo.length} to run, ${options.jobs} at a time`
  );
  // Copying a large graph per session would fill the disk, so every session
  // links to one read-only copy. A test-bed session reads the graph in its
  // own clone instead, and --prepare-only touches nothing shared.
  const shareGraph = !options.repo && !options.prepareOnly;
  const { dir: shared, hash } = shareGraph
    ? await sharedGraph(options.graph)
    : {};
  const socket = options.serve && shareGraph ? options.server : undefined;
  if (socket)
    console.log(`proof serve on ${socket}: ${await ensureServer(socket)}`);
  const prepare = async (s) => {
    if (options.repo) await prepareClone(s.folder, options.repo);
    else
      await prepareFolder(s.folder, [s.q], options.graph, {
        linkTo: shared,
        server: socket,
      });
    await writeFile(
      join(s.folder, 'TASK.md'),
      taskText({
        folder: s.folder,
        strategy: s.strategy,
        repo: Boolean(options.repo),
        ...s.q,
      })
    );
  };
  if (options.prepareOnly) {
    for (const s of todo) await prepare(s);
    console.log(`Prepared ${todo.length} session folders; started no sessions`);
    return;
  }
  let done = 0;
  const failures = [];
  const worker = async () => {
    for (let s = todo.shift(); s; s = todo.shift()) {
      await prepare(s);
      const result = await runSession(s.folder, options.model, options.timeout);
      done++;
      if (result !== 0) failures.push(`${s.strategy}/${s.id}: ${result}`);
      console.log(`[${done}] ${s.strategy}/${s.id}: ${result}`);
    }
  };
  await Promise.all(Array.from({ length: options.jobs }, worker));
  if (failures.length) console.warn(`Failed:\n${failures.join('\n')}`);
  // Root ignores file modes, so check that no session changed the graph.
  if (shared && (await treeHash(shared)) !== hash)
    console.warn(`The shared graph in ${shared} changed during the run`);
  await mkdir(RUNS_DIR, { recursive: true });
  for (const strategy of options.strategies)
    await collect(
      sessions
        .filter((s) => s.strategy === strategy)
        .map((s) => ({
          id: s.id,
          folder: s.folder,
          transcript: join(s.folder, 'transcript.jsonl'),
        })),
      `${options.name}-${strategy}`,
      join(RUNS_DIR, `${options.name}-${strategy}.json`),
      { find_hash, state_hash, read_hash }
    );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
