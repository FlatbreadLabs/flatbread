#!/usr/bin/env node
// Builds the benchmark graph by replaying each Effort's event script through
// the real Proof writer. Every record is therefore valid by construction, and
// fixed ids and timestamps make the output identical on every run.
//
//   node scripts/build.mjs                 build every Effort into .flatbread-proof/
//   node scripts/build.mjs --only render   build one Effort (for authoring)
//   node scripts/build.mjs --out /tmp/x    write somewhere else
//   node scripts/build.mjs --scale 10 --out /tmp/x10
//                                          add filler until each Effort is
//                                          about 10 times its size; every
//                                          question keeps its answer
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  createProofWriter,
  generateArtifactId,
  ProofMutationSchema,
} from '@flatbread/proof';
import { fillerEvents, fillerTerms, mergeEvents } from '../spec/_filler.mjs';

const BENCH = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_DIR = join(BENCH, 'spec');

const KIND_BY_TYPE = {
  CreateEffort: 'effort',
  WriteIssue: 'issue',
  WriteFinding: 'finding',
  WriteCompaction: 'finding',
  WriteDecision: 'decision',
  WriteConstraint: 'constraint',
  WriteRisk: 'risk',
  WriteCitation: 'citation',
  WriteBlob: 'blob',
};
// Fields whose values name other records. Authors write local keys; the
// builder swaps in real ids.
const REF_FIELDS = [
  'derives_from',
  'supersedes',
  'invalidates',
  'cites',
  'blob',
  'supersederId',
  'targetId',
  'findingId',
  'issueId',
  'resolvedBy',
  'decisionId',
  'rejects',
  'riskId',
  'evidence',
  'recordId',
  'effortId',
];
const GRAPH_DIRS = [
  'efforts',
  'issues',
  'findings',
  'decisions',
  'constraints',
  'risks',
  'citations',
  'blobs',
  '.journal',
];

function args(argv) {
  const out = { only: [], out: join(BENCH, '.flatbread-proof'), scale: 1 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--only') out.only.push(...argv[++i].split(','));
    else if (argv[i] === '--out') out.out = resolve(argv[++i]);
    else if (argv[i] === '--scale') out.scale = Number(argv[++i]);
    else throw new Error(`Unknown argument ${argv[i]}`);
  }
  if (!(out.scale >= 1)) throw new Error('--scale must be 1 or more');
  // The committed graph is the unscaled one.
  if (out.scale > 1 && out.out === join(BENCH, '.flatbread-proof'))
    throw new Error('A scaled build needs --out');
  return out;
}

/** Filler may never name a subsystem a spec or question talks about. */
async function assertFillerIsDisjoint(specs) {
  const questions = await readdir(join(BENCH, 'questions'));
  const text = [
    ...specs.map((spec) => JSON.stringify(spec)),
    ...(await Promise.all(
      questions.map((name) => readFile(join(BENCH, 'questions', name), 'utf8'))
    )),
  ]
    .join('\n')
    .toLowerCase();
  for (const spec of specs)
    for (const term of fillerTerms(spec.key))
      if (text.includes(term.toLowerCase()))
        throw new Error(`Filler subsystem "${term}" appears in real content`);
}

/** Fixed id: the writer's own format, with a suffix hashed from the key. */
export function benchId(kind, title, qualifiedKey) {
  const bytes = createHash('sha256').update(qualifiedKey).digest();
  return generateArtifactId(kind, title, (n) => bytes.subarray(0, n));
}

export async function loadSpecs(only = []) {
  const names = (await readdir(SPEC_DIR)).filter(
    (name) => !name.startsWith('_') && !name.startsWith('.')
  );
  const specs = [];
  for (const name of names.sort()) {
    const path = join(SPEC_DIR, name);
    const file = name.endsWith('.mjs') ? path : join(path, 'index.mjs');
    if (!existsSync(file)) continue;
    const spec = (await import(pathToFileURL(file).href)).default;
    if (only.length && !only.includes(spec.key)) continue;
    specs.push(spec);
  }
  return specs;
}

function fail(spec, event, message) {
  const where = event?.key ?? event?.type ?? 'effort';
  throw new Error(`[${spec.key}] ${where}: ${message}`);
}

async function buildEffort(spec, rootDir, keymap) {
  if (!/^[a-z][a-z0-9-]*$/.test(spec.key))
    throw new Error(`Bad Effort key ${spec.key}`);
  let now = new Date(spec.effort.created_at);
  const writer = createProofWriter({ rootDir, clock: () => now });
  const local = new Map();
  const resolveRef = (event, key) => {
    const id = local.get(key);
    if (!id) fail(spec, event, `unknown key "${key}"`);
    return id;
  };
  const effortId = benchId('effort', spec.effort.title, `${spec.key}.effort`);
  local.set('effort', effortId);
  keymap[`${spec.key}.effort`] = effortId;
  await writer.mutate(
    ProofMutationSchema.parse({
      type: 'CreateEffort',
      id: effortId,
      title: spec.effort.title,
      body: spec.effort.body,
      created_at: spec.effort.created_at,
    })
  );
  let last = now.getTime();
  for (const event of spec.events) {
    const { at, key, ...rest } = event;
    if (!at) fail(spec, event, 'every event needs `at`');
    now = new Date(at);
    if (Number.isNaN(now.getTime())) fail(spec, event, `bad time ${at}`);
    if (now.getTime() < last) fail(spec, event, 'events must be in time order');
    last = now.getTime();
    const payload = { ...rest };
    const kind = KIND_BY_TYPE[payload.type];
    if (kind && kind !== 'effort') {
      if (!key) fail(spec, event, 'create events need a `key`');
      if (local.has(key)) fail(spec, event, 'duplicate key');
      payload.effort = effortId;
      payload.created_at = at;
    }
    if (payload.type === 'SetEffortStatus') payload.effortId ??= 'effort';
    for (const field of REF_FIELDS) {
      if (payload[field] === undefined || field === 'effort') continue;
      payload[field] = Array.isArray(payload[field])
        ? payload[field].map((ref) => resolveRef(event, ref))
        : resolveRef(event, payload[field]);
    }
    if (kind && kind !== 'effort') {
      payload.id = benchId(kind, payload.title, `${spec.key}.${key}`);
      local.set(key, payload.id);
      keymap[`${spec.key}.${key}`] = payload.id;
    } else if (key) fail(spec, event, '`key` is only for create events');
    try {
      await writer.mutate(ProofMutationSchema.parse(payload));
    } catch (error) {
      fail(spec, event, error instanceof Error ? error.message : String(error));
    }
  }
  return spec.events.length + 1;
}

async function main() {
  const options = args(process.argv.slice(2));
  const specs = await loadSpecs(options.only);
  if (!specs.length) throw new Error('No specs matched');
  if (options.scale > 1) {
    await assertFillerIsDisjoint(specs);
    for (const spec of specs)
      spec.events = mergeEvents(spec.events, fillerEvents(spec, options.scale));
  }
  await mkdir(options.out, { recursive: true });
  for (const dir of GRAPH_DIRS)
    await rm(join(options.out, dir), { recursive: true, force: true });
  const keymap = {};
  // Each Effort builds in a folder of its own, then moves into place. The
  // writer reads every record under its root on each mutation, so a shared
  // root would make every Effort pay for the ones built before it.
  const parts = join(options.out, '.parts');
  await rm(parts, { recursive: true, force: true });
  for (const spec of specs) {
    const started = Date.now();
    const root = join(parts, spec.key);
    const events = await buildEffort(spec, root, keymap);
    for (const dir of GRAPH_DIRS.filter((d) => d !== '.journal'))
      if (existsSync(join(root, dir)))
        await cp(join(root, dir), join(options.out, dir), { recursive: true });
    console.log(
      `${spec.key}: ${events} mutations in ${Date.now() - started} ms`
    );
  }
  // The journal is writer state, not benchmark content.
  await rm(parts, { recursive: true, force: true });
  await rm(join(options.out, '.journal'), { recursive: true, force: true });
  const sorted = Object.fromEntries(
    Object.entries(keymap).sort(([a], [b]) => a.localeCompare(b))
  );
  // Maps each `<effort>.<key>` to its record id, for checking and grading.
  await writeFile(
    join(options.out, 'keymap.json'),
    `${JSON.stringify(sorted, null, 2)}\n`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
