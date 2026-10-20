#!/usr/bin/env node
// Builds a run file from one-question-per-session runs, taking cost from each
// session's transcript rather than from the agent's own tally.
//
//   node scripts/collect.mjs <manifest.json> <run-name> <out.json>
//
// The manifest lists one entry per session:
//   [{ "id": "render-001", "folder": "/tmp/.../render-001", "transcript": "/tmp/.../<agent>.output" }]
// Each folder holds the agent's `answer.json`: { "answer": ... }. Transcripts
// are Claude Code agent logs or `claude -p --output-format stream-json`
// output (JSON lines); each assistant turn carries usage.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The `proof find` source: its tokenizer and BM25 weights.
const FIND_SOURCE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../packages/flatbread/src/proof/find.ts'
);

/**
 * A sha256 of the `proof find` source, so a run file and the offline gate
 * can show they used the same search. It hashes the source, not the build,
 * so rebuild after any change to it.
 */
export async function findHash() {
  return createHash('sha256')
    .update(await readFile(FIND_SOURCE))
    .digest('hex');
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
// What `proof state` prints: its sections, caps, and size aim, and the
// compaction rule it shares with `get` and `brief`.
const STATE_SOURCES = [
  'packages/flatbread/src/proof/state.ts',
  'packages/proof/src/compaction.ts',
];
// What `get`, `records`, and `brief` print and filter. They also use the
// compaction rule and the rests-on rule from `state.ts`.
const READ_SOURCES = [
  'packages/flatbread/src/proof/read.ts',
  'packages/flatbread/src/proof/state.ts',
  'packages/proof/src/compaction.ts',
];

/** A sha256 over these source files, in order, each with its path. */
async function hashOf(paths) {
  const hash = createHash('sha256');
  for (const path of paths)
    hash.update(`${path}\n`).update(await readFile(join(ROOT, path)));
  return hash.digest('hex');
}

/**
 * A sha256 of the `proof state` source and the compaction rule it uses, as
 * `findHash` is of `find`'s. Before `get` on a compaction was added, it
 * hashed `state.ts` alone, so older run files hold that hash.
 */
export const stateHash = () => hashOf(STATE_SOURCES);

/** A sha256 of the `get`, `records`, and `brief` sources, as `stateHash` is of `state`'s. */
export const readHash = () => hashOf(READ_SOURCES);

/**
 * True when a tool call's input reaches outside the session's `folder`: an
 * absolute path elsewhere, a `..` step, the benchmark sources, or a key
 * map. The `./flatbread` wrapper and `node_modules` link point into this
 * repository, so an agent could follow them to the questions and answers.
 */
function leavesFolder(input, folder) {
  const text = JSON.stringify(input ?? {});
  if (
    text.includes(ROOT) ||
    text.includes('benchmarks/proof-recall') ||
    text.includes('keymap') ||
    /(^|[\s'"=:/])\.\.(?=$|[\s'"/])/.test(text)
  )
    return true;
  return [input?.file_path, input?.path].some(
    (path) =>
      typeof path === 'string' &&
      path.startsWith('/') &&
      folder &&
      path !== folder &&
      !path.startsWith(`${folder}/`)
  );
}

/**
 * `context_tokens` counts what entered the context once (new input, cache
 * writes, output): how much the agent had to read. `processed_tokens` adds
 * cache reads, which grow with every turn the context is re-read.
 * `fixed_tokens` is the first turn alone: the system prompt and task, paid
 * before any graph read. `finished` is false when the transcript has no
 * final `result` entry, as when run.mjs stops a session at its timeout.
 * `left_folder` is true when a tool call reached outside `folder` (see
 * leavesFolder).
 */
export async function sessionCost(transcriptPath, folder) {
  const lines = (await readFile(transcriptPath, 'utf8')).split('\n');
  const seen = new Set();
  const models = new Set();
  const cost = {
    turns: 0,
    tool_calls: 0,
    context_tokens: 0,
    processed_tokens: 0,
    fixed_tokens: 0,
    finished: false,
    left_folder: false,
  };
  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type === 'result') cost.finished = true;
    const message = entry.type === 'assistant' ? entry.message : null;
    if (!message) continue;
    if (message.model) models.add(message.model);
    for (const part of message.content ?? [])
      if (part.type === 'tool_use') {
        cost.tool_calls++;
        if (leavesFolder(part.input, folder)) cost.left_folder = true;
      }
    // One assistant message can span several log lines; count usage once.
    if (!message.usage || seen.has(message.id)) continue;
    seen.add(message.id);
    const u = message.usage;
    const fresh =
      (u.input_tokens ?? 0) +
      (u.cache_creation_input_tokens ?? 0) +
      (u.output_tokens ?? 0);
    if (cost.turns === 0) cost.fixed_tokens = fresh;
    cost.turns++;
    cost.context_tokens += fresh;
    cost.processed_tokens += fresh + (u.cache_read_input_tokens ?? 0);
  }
  return { ...cost, models: [...models] };
}

/**
 * Reads each session's answer and cost, and writes one run file. `about`
 * adds fields to the file's `run` header, such as `find_hash`.
 */
export async function collect(manifest, name, outPath, about = {}) {
  const answers = {};
  const models = new Set();
  for (const session of manifest) {
    let answer = null;
    try {
      answer = JSON.parse(
        await readFile(join(session.folder, 'answer.json'), 'utf8')
      ).answer;
    } catch {
      // A missing or broken answer file scores zero.
    }
    const cost = await sessionCost(session.transcript, session.folder);
    cost.models.forEach((m) => models.add(m));
    answers[session.id] = {
      answer,
      tokens: cost.context_tokens,
      fixed_tokens: cost.fixed_tokens,
      processed_tokens: cost.processed_tokens,
      tool_calls: cost.tool_calls,
      turns: cost.turns,
      timed_out: !cost.finished,
      left_folder: cost.left_folder,
    };
  }
  const run = {
    run: {
      name,
      protocol: 'one fresh session per question',
      models: [...models],
      ...about,
    },
    answers,
  };
  await writeFile(resolve(outPath), `${JSON.stringify(run, null, 2)}\n`);
  console.log(
    `${Object.keys(answers).length} sessions collected into ${outPath}`
  );
}

async function main() {
  const [manifestPath, name, outPath] = process.argv.slice(2);
  if (!outPath)
    throw new Error('usage: collect.mjs <manifest.json> <run-name> <out.json>');
  const manifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8'));
  await collect(manifest, name, outPath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
