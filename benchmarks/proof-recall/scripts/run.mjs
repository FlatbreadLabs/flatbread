#!/usr/bin/env node
// Runs the benchmark: one fresh, headless Claude Code session per question
// and per strategy, then collects answers and cost into run files.
//
//   node scripts/run.mjs <work-dir> --name <run> [--model haiku]
//        [--strategies brief,nobrief] [--only render] [--ids a,b]
//        [--jobs 8] [--timeout 600] [--graph <built-graph-dir>]
//
// Each session works in <work-dir>/<strategy>/<id>/, which holds a link to
// one shared copy of the graph (<work-dir>/graph, without the key map),
// TASK.md, the agent's answer.json, and transcript.jsonl. A rerun skips
// sessions that already have both an answer and a transcript, so an
// interrupted run picks up where it stopped. Keep <work-dir> outside the
// repository, so no CLAUDE.md or AGENTS.md reaches the agent.
//
// Sessions get only the Bash, Read, and Write tools, no MCP servers, and no
// settings files, so an agent cannot reach other sessions or services.
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { chmod, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect } from './collect.mjs';
import {
  copyPublicGraph,
  prepareFolder,
  publicQuestions,
} from './prepare-run.mjs';
import { STRATEGIES, taskText } from './task.mjs';

const BENCH = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS = 'Bash,Read,Write';
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
    strategies: STRATEGIES,
    only: [],
    ids: [],
    jobs: 8,
    timeout: 600,
    graph: undefined,
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
    else if (!flag.startsWith('--') && !out.dir) out.dir = resolve(flag);
    else throw new Error(`Unknown argument ${flag}`);
  }
  if (!out.dir || !out.name)
    throw new Error('usage: run.mjs <work-dir> --name <run> [options]');
  if (out.dir.startsWith(resolve(BENCH, '..', '..') + '/'))
    throw new Error('Keep <work-dir> outside the repository');
  return out;
}

/** One hash over every file's path and bytes under `dir`. */
async function treeHash(dir) {
  const hash = createHash('sha256');
  const walk = async (path) => {
    const entries = (await readdir(path, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
    for (const entry of entries) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) await walk(child);
      else hash.update(child).update(await readFile(child));
    }
  };
  await walk(dir);
  return hash.digest('hex');
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
  const questions = await publicQuestions(options);
  // Alternate strategies question by question, so a change in API speed or
  // load over the run falls on both strategies alike.
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
  // One read-only copy of the graph, without its key map, that every
  // session folder links to. Copying a large graph per session would fill
  // the disk.
  const shared = join(options.dir, 'graph');
  if (!existsSync(shared)) {
    await copyPublicGraph(shared, options.graph);
    await chmodTree(shared);
  }
  // Root ignores file modes, so also check afterwards that nothing changed.
  const before = await treeHash(shared);
  let done = 0;
  const failures = [];
  const worker = async () => {
    for (let s = todo.shift(); s; s = todo.shift()) {
      await prepareFolder(s.folder, [s.q], options.graph, { linkTo: shared });
      await writeFile(
        join(s.folder, 'TASK.md'),
        taskText({ folder: s.folder, strategy: s.strategy, ...s.q })
      );
      const result = await runSession(s.folder, options.model, options.timeout);
      done++;
      if (result !== 0) failures.push(`${s.strategy}/${s.id}: ${result}`);
      console.log(`[${done}] ${s.strategy}/${s.id}: ${result}`);
    }
  };
  await Promise.all(Array.from({ length: options.jobs }, worker));
  if (failures.length) console.warn(`Failed:\n${failures.join('\n')}`);
  if ((await treeHash(shared)) !== before)
    console.warn(`The shared graph in ${shared} changed during the run`);
  await mkdir(join(BENCH, 'runs'), { recursive: true });
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
      join(BENCH, 'runs', `${options.name}-${strategy}.json`)
    );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
