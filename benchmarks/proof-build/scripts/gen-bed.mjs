#!/usr/bin/env node
// Builds the Tessera test bed for the proof-build benchmark: a git repository
// whose history is spec/history.mjs, with, in the proof variant, the Proof
// graph of spec/proof.mjs replayed through the real Proof writer commit by
// commit, and `Proof:` trailers on the commits that implement a record.
//
//   node scripts/gen-bed.mjs --out <dir>                    proof variant
//   node scripts/gen-bed.mjs --variant none --out <dir>     no Proof at all
//   node scripts/gen-bed.mjs --scale 10 --out <dir>         proof variant
//                                     plus the filler Efforts of spec/filler.mjs
//   --check-each   run the test suite after every commit, not only at the tip
//   --no-test      skip the test suite (structure checks still run)
//
// It writes:
//   <out>/               the repository, `main` checked out, objects packed
//   <out>.keymap.json    outside the repository: every design key (rules,
//                        drifts, supersessions, records, commits) to its
//                        record id or commit hash
//
// The code of every commit comes from spec/app/ (the tip tree) and the
// changes spec/history.mjs lists, walked backwards from the tip, so the tip
// is exactly spec/app/. Every commit has a fixed author, date and message,
// and every record a fixed id and time, so two builds of one variant and
// scale give the same hashes. The two variants share code trees commit for
// commit; their hashes differ because the proof variant's commits carry the
// graph and the trailers.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  createProofWriter,
  generateArtifactId,
  ProofMutationSchema,
} from '@flatbread/proof';
import { COMMITS, PEOPLE, EMAIL_DOMAIN } from '../spec/history.mjs';
import {
  EFFORTS,
  PROOF,
  DRIFTS,
  RULES,
  SUPERSESSIONS,
} from '../spec/proof.mjs';
import { BANNED_IN_PROOF, BANNED_IN_CODE } from '../spec/banned.mjs';
import { fillerEfforts, FILLER_KEYS } from '../spec/filler.mjs';

const BENCH = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(BENCH, '..', '..');
const APP = join(BENCH, 'spec', 'app');
const VERSIONS = join(BENCH, 'spec', 'versions');
const PROOF_DIR = '.flatbread-proof';
const CONFIG = 'flatbread.config.js';
const CONFIG_TEXT = `import { source as filesystem } from '@flatbread/source-filesystem';
import { transformer as markdownTransformer } from '@flatbread/transformer-markdown';
import { defineConfig } from '@flatbread/config';
import { proofContent } from '@flatbread/proof';

export default defineConfig({
  source: filesystem(),
  transformer: markdownTransformer(),
  content: proofContent(),
});
`;

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

// ------------------------------------------------------------- options ----

function args(argv) {
  const out = {
    out: null,
    variant: 'proof',
    scale: 1,
    checkEach: false,
    test: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') out.out = resolve(argv[++i]);
    else if (a === '--variant') out.variant = argv[++i];
    else if (a === '--scale') out.scale = Number(argv[++i]);
    else if (a === '--check-each') out.checkEach = true;
    else if (a === '--no-test') out.test = false;
    else throw new Error(`Unknown argument ${a}`);
  }
  if (!out.out)
    throw new Error(
      'usage: gen-bed.mjs --out <dir> [--variant proof|none] [--scale 10] [--check-each] [--no-test]'
    );
  if (!['proof', 'none'].includes(out.variant))
    throw new Error('--variant is proof or none');
  if (![1, 10].includes(out.scale)) throw new Error('--scale is 1 or 10');
  if (out.variant === 'none' && out.scale !== 1)
    throw new Error('the none variant has no graph to scale');
  if (`${out.out}/`.startsWith(`${REPO_ROOT}/`))
    throw new Error('Build the test bed outside this repository');
  return out;
}

// ----------------------------------------------------------------- git ----

function git(dir, argv, env = {}, input) {
  return execFileSync('git', argv, {
    cwd: dir,
    encoding: 'utf8',
    input,
    maxBuffer: 1 << 28,
    stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    env: {
      PATH: process.env.PATH,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: '/dev/null',
      TZ: 'UTC',
      ...env,
    },
  }).trim();
}

const short = (sha) => sha.slice(0, 12);

// ------------------------------------------------------- file versions ----

/** Every file under `root`, as relative paths with `/`. */
function listFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else out.push(relative(root, path).split('\\').join('/'));
    }
  };
  walk(root);
  return out;
}

function countOf(text, part) {
  let n = 0;
  for (let i = text.indexOf(part); i >= 0; i = text.indexOf(part, i + 1)) n++;
  return n;
}

/** Normalizes one change spec to a list of [old, new] pairs, or a `before` file. */
function changeOps(change) {
  if (change.before) return { before: change.before };
  return {
    edits: change.map((e) => {
      if (Array.isArray(e)) return e;
      if (e.ins) return [e.after, e.after + e.ins];
      if (e.insBefore) return [e.before, e.insBefore + e.before];
      throw new Error(`bad edit ${JSON.stringify(e)}`);
    }),
  };
}

/**
 * The content of every file at every commit that writes it, walked back
 * from the tip in spec/app/. Returns Map<commitIndex, Map<path, text>>.
 */
function fileVersions() {
  const tip = new Map(
    listFiles(APP).map((p) => [p, readFileSync(join(APP, p), 'utf8')])
  );
  const adds = new Map();
  const changes = new Map();
  COMMITS.forEach((c, i) => {
    for (const path of c.add ?? []) {
      if (adds.has(path)) throw new Error(`${c.key}: ${path} added twice`);
      if (!tip.has(path))
        throw new Error(`${c.key}: ${path} is not in spec/app`);
      adds.set(path, i);
    }
    for (const [path, change] of Object.entries(c.change ?? {})) {
      if (!changes.has(path)) changes.set(path, []);
      changes.get(path).push({ i, key: c.key, ops: changeOps(change) });
    }
  });
  for (const path of tip.keys())
    if (!adds.has(path))
      throw new Error(`${path} is in spec/app but no commit adds it`);
  const writes = new Map(COMMITS.map((_, i) => [i, new Map()]));
  for (const [path, at] of adds) {
    const list = changes.get(path) ?? [];
    for (const ch of list)
      if (ch.i <= at)
        throw new Error(`${ch.key}: changes ${path} before it is added`);
    let text = tip.get(path);
    // Walk back: the state after each change, then undo it.
    for (const ch of [...list].reverse()) {
      writes.get(ch.i).set(path, text);
      let before;
      if (ch.ops.before) {
        const file = join(VERSIONS, ch.ops.before);
        if (!existsSync(file))
          throw new Error(`${ch.key}: no version file ${ch.ops.before}`);
        before = readFileSync(file, 'utf8');
      } else {
        before = text;
        for (const [oldText, newText] of [...ch.ops.edits].reverse()) {
          const n = countOf(before, newText);
          if (n !== 1)
            throw new Error(
              `${ch.key} ${path}: the later text occurs ${n} times, not once:\n---\n${newText}\n---`
            );
          before = before.replace(newText, () => oldText);
        }
        // And forward again, so the edit means what it says.
        let forward = before;
        for (const [oldText, newText] of ch.ops.edits) {
          const n = countOf(forward, oldText);
          if (n !== 1)
            throw new Error(
              `${ch.key} ${path}: the earlier text occurs ${n} times, not once:\n---\n${oldText}\n---`
            );
          forward = forward.replace(oldText, () => newText);
        }
        if (forward !== text)
          throw new Error(`${ch.key} ${path}: edits do not round-trip`);
      }
      if (before === text)
        throw new Error(`${ch.key} ${path}: the change changes nothing`);
      text = before;
    }
    writes.get(at).set(path, text);
  }
  return { writes, tip };
}

// ----------------------------------------------------------------- Proof ----

/** Fixed id: the writer's own format, with a suffix hashed from the key. */
function benchId(kind, title, qualifiedKey) {
  const bytes = createHash('sha256')
    .update(`proof-build:${qualifiedKey}`)
    .digest();
  return generateArtifactId(kind, title, (n) => bytes.subarray(0, n));
}

/** Proof events for each commit index: the spec's, plus filler by time. */
function proofEvents(scale) {
  const byCommit = new Map(COMMITS.map((_, i) => [i, []]));
  const index = new Map(COMMITS.map((c, i) => [c.key, i]));
  for (const [key, entry] of Object.entries(PROOF)) {
    if (!index.has(key))
      throw new Error(`proof.mjs names unknown commit ${key}`);
    byCommit
      .get(index.get(key))
      .push(...(entry.events ?? []).map((e) => ({ ...e })));
  }
  if (scale > 1) {
    const drifting = new Set(Object.values(DRIFTS).map((d) => d.commit));
    const filler = fillerEfforts(scale);
    for (const effort of filler.efforts) {
      for (const event of effort.events) {
        // The first commit at or after the event, so records never post-date
        // it, skipping the drift commits, which never touch the graph.
        const t = new Date(event.at).getTime();
        const i = COMMITS.findIndex(
          (c) => new Date(c.at).getTime() >= t && !drifting.has(c.key)
        );
        if (i < 0)
          throw new Error(`filler event after the last commit: ${event.at}`);
        byCommit.get(i).push({ ...event, filler: effort.key });
      }
    }
    // Spec events first, then that commit's filler in time order.
    for (const [i, list] of byCommit)
      byCommit.set(i, [
        ...list.filter((e) => !e.filler),
        ...list
          .filter((e) => e.filler)
          .sort((a, b) => new Date(a.at) - new Date(b.at)),
      ]);
  }
  return byCommit;
}

async function replay(rootDir, commit, events, keymap, shas, efforts) {
  if (!events.length) return;
  const base = new Date(commit.at).getTime();
  let now = new Date(base);
  const writer = createProofWriter({ rootDir, clock: () => now });
  const resolveRef = (where, key) => {
    const id = keymap[key];
    if (!id) throw new Error(`${commit.key} ${where}: unknown key "${key}"`);
    return id;
  };
  for (const [i, event] of events.entries()) {
    // Spec events are a minute apart before the commit; filler keeps its time.
    now = event.at
      ? new Date(event.at)
      : new Date(base - (events.length - i) * 60_000);
    let { key, effort, filler, at, ...payload } = event;
    void filler;
    void at;
    const where = key ?? payload.type;
    if (payload.type === 'CreateEffort') {
      const spec = efforts[effort];
      if (!spec) throw new Error(`${commit.key}: unknown Effort ${effort}`);
      const id = benchId('effort', spec.title, `${effort}.effort`);
      keymap[`${effort}.effort`] = id;
      payload = {
        type: 'CreateEffort',
        id,
        title: spec.title,
        body: spec.body,
        created_at: now.toISOString().replace('.000Z', 'Z'),
      };
    } else {
      if (payload.type === 'Anchor') {
        const { path, symbol, commit: of, ...rest } = payload;
        // Filler pins the commit before the one it rides on.
        const sha = of === 'auto' ? [...shas.values()].at(-1) : shas.get(of);
        if (!sha)
          throw new Error(
            `${commit.key}: anchor names ${of}, not yet committed`
          );
        payload = {
          ...rest,
          type: 'WriteCitation',
          role: 'code',
          body: symbol
            ? `${path}#${symbol}@${short(sha)}`
            : `${path}@${short(sha)}`,
        };
      }
      // `{{id:<effort>.<key>}}` in a body names another record by its id.
      if (typeof payload.body === 'string')
        payload.body = payload.body.replace(/\{\{id:([\w.-]+)\}\}/g, (_, k) =>
          resolveRef(where, k)
        );
      for (const field of REF_FIELDS) {
        if (payload[field] === undefined) continue;
        payload[field] = Array.isArray(payload[field])
          ? payload[field].map((ref) => resolveRef(where, ref))
          : resolveRef(where, payload[field]);
      }
      const kind = KIND_BY_TYPE[payload.type];
      if (kind) {
        if (!key || !effort)
          throw new Error(`${commit.key}: create events need key and effort`);
        const qualified = `${effort}.${key}`;
        if (keymap[qualified])
          throw new Error(`${commit.key}: duplicate key ${qualified}`);
        payload.effort = resolveRef(where, `${effort}.effort`);
        payload.created_at = now.toISOString().replace('.000Z', 'Z');
        payload.id = benchId(kind, payload.title, qualified);
        keymap[qualified] = payload.id;
      } else if (key || effort)
        throw new Error(
          `${commit.key}: only create events take key and effort`
        );
    }
    try {
      await writer.mutate(ProofMutationSchema.parse(payload));
    } catch (error) {
      throw new Error(`${commit.key} ${where}: ${error.message}`);
    }
  }
  await rm(join(rootDir, '.journal'), { recursive: true, force: true });
}

// --------------------------------------------------------------- build ----

function checkSpec() {
  const keys = new Set();
  const subjects = new Set();
  let last = 0;
  for (const c of COMMITS) {
    if (keys.has(c.key)) throw new Error(`duplicate commit key ${c.key}`);
    if (subjects.has(c.subject))
      throw new Error(`duplicate subject "${c.subject}"`);
    if (!PEOPLE[c.author])
      throw new Error(`${c.key}: unknown author ${c.author}`);
    const t = new Date(c.at).getTime();
    if (!(t > last))
      throw new Error(`${c.key}: commits must move forward in time`);
    last = t;
    keys.add(c.key);
    subjects.add(c.subject);
  }
}

function runTests(dir, label) {
  try {
    execFileSync(process.execPath, ['--experimental-strip-types', '--test'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300_000,
    });
  } catch (error) {
    const out = `${error.stdout ?? ''}`
      .split('\n')
      .filter((l) => /^not ok|^# fail|error:|expected|actual/.test(l));
    throw new Error(`tests fail at ${label}:\n${out.slice(0, 40).join('\n')}`);
  }
}

function suiteSummary(dir) {
  const out = execFileSync(
    process.execPath,
    ['--experimental-strip-types', '--test'],
    {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300_000,
    }
  );
  return out
    .split('\n')
    .filter((l) =>
      /^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)/.test(l)
    )
    .join('\n');
}

async function writeTree(dir, files) {
  for (const [path, text] of files) {
    const target = join(dir, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text);
  }
}

/** Banned phrases: none in record text or commit messages (proof), none in code (both). */
function scanBanned(texts, banned, where) {
  const hits = [];
  for (const { name, text } of texts) {
    const lower = text.toLowerCase();
    for (const phrase of banned)
      if (lower.includes(phrase.toLowerCase()))
        hits.push(`${where} ${name}: "${phrase}"`);
  }
  return hits;
}

async function main() {
  const options = args(process.argv.slice(2));
  checkSpec();
  const proof = options.variant === 'proof';
  const { writes, tip } = fileVersions();
  const events = proof ? proofEvents(options.scale) : new Map();
  const filler =
    proof && options.scale > 1 ? fillerEfforts(options.scale) : null;
  const efforts = {
    ...EFFORTS,
    ...(filler
      ? Object.fromEntries(filler.efforts.map((e) => [e.key, e]))
      : {}),
  };
  const dir = options.out;
  await rm(dir, { recursive: true, force: true });
  await rm(`${dir}.keymap.json`, { force: true });
  await mkdir(dir, { recursive: true });
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  git(dir, ['config', 'core.autocrlf', 'false']);
  const keymap = {};
  const shas = new Map();
  const started = Date.now();
  const fillerTmp = `${dir}.filler-tmp`;
  await rm(fillerTmp, { recursive: true, force: true });
  for (const [i, commit] of COMMITS.entries()) {
    await writeTree(dir, writes.get(i));
    if (proof && i === 0) await writeFile(join(dir, CONFIG), CONFIG_TEXT);
    if (proof) {
      const list = events.get(i);
      await replay(
        join(dir, PROOF_DIR),
        commit,
        list.filter((e) => !e.filler),
        keymap,
        shas,
        efforts
      );
      // Each filler Effort is written in a root of its own and copied in, since
      // the writer reads its whole root on every mutation. Filler records only
      // refer to records in their own Effort, so the files are the same.
      const byEffort = new Map();
      for (const e of list.filter((e) => e.filler))
        byEffort.set(e.filler, [...(byEffort.get(e.filler) ?? []), e]);
      for (const [eff, evs] of byEffort) {
        const root = join(fillerTmp, eff);
        await replay(root, commit, evs, keymap, shas, efforts);
        await cp(root, join(dir, PROOF_DIR), { recursive: true });
      }
    }
    const trailers = proof
      ? (PROOF[commit.key]?.trailers ?? []).map((k) => {
          if (!keymap[k])
            throw new Error(`${commit.key}: trailer names unknown key ${k}`);
          return `Proof: ${keymap[k]}`;
        })
      : [];
    const message = [commit.subject, commit.body, trailers.join('\n')]
      .filter(Boolean)
      .join('\n\n');
    const person = PEOPLE[commit.author];
    const email = `${person.login}@${EMAIL_DOMAIN}`;
    git(dir, ['add', '-A']);
    git(
      dir,
      ['commit', '-q', '--no-verify', '-F', '-'],
      {
        GIT_AUTHOR_NAME: person.name,
        GIT_AUTHOR_EMAIL: email,
        GIT_AUTHOR_DATE: commit.at,
        GIT_COMMITTER_NAME: person.name,
        GIT_COMMITTER_EMAIL: email,
        GIT_COMMITTER_DATE: commit.at,
      },
      `${message}\n`
    );
    if (git(dir, ['status', '--porcelain']))
      throw new Error(`${commit.key}: files left uncommitted`);
    shas.set(commit.key, git(dir, ['rev-parse', 'HEAD']));
    if (options.checkEach && options.test)
      runTests(dir, `${commit.key} ${commit.subject}`);
  }
  await rm(fillerTmp, { recursive: true, force: true });
  const head = shas.get(COMMITS.at(-1).key);
  console.log(
    `${options.variant}${options.scale > 1 ? ` x${options.scale}` : ''}: ${
      COMMITS.length
    } commits, tip ${short(head)} (${((Date.now() - started) / 1000).toFixed(
      1
    )} s)`
  );

  // The tip is spec/app, exactly, plus the graph and config in the proof variant.
  const tracked = git(dir, ['ls-files']).split('\n').filter(Boolean);
  const code = tracked.filter(
    (p) => !p.startsWith(`${PROOF_DIR}/`) && p !== CONFIG
  );
  const missing = [...tip.keys()].filter((p) => !code.includes(p));
  const extra = code.filter((p) => !tip.has(p));
  if (missing.length || extra.length)
    throw new Error(
      `tip differs from spec/app: missing ${missing}, extra ${extra}`
    );
  for (const p of code)
    if (readFileSync(join(dir, p), 'utf8') !== tip.get(p))
      throw new Error(`tip ${p} differs from spec/app`);
  if (!proof && tracked.length !== code.length)
    throw new Error('the none variant holds Proof files');
  if (!proof && git(dir, ['log', '--format=%B']).includes('Proof:'))
    throw new Error('the none variant has trailers');

  // Code trees per commit, for comparing variants.
  const trees = COMMITS.map((c) => {
    const listing = git(dir, ['ls-tree', '-r', c.key && shas.get(c.key)]).split(
      '\n'
    );
    const lines = listing.filter(
      (l) => !l.endsWith(`\t${CONFIG}`) && !l.includes(`\t${PROOF_DIR}/`)
    );
    return createHash('sha256')
      .update(lines.join('\n'))
      .digest('hex')
      .slice(0, 16);
  });

  // Banned phrases.
  const hits = [];
  const messages = COMMITS.map((c) => ({
    name: c.key,
    text: `${c.subject}\n${c.body ?? ''}`,
  }));
  hits.push(
    ...scanBanned(messages, [...BANNED_IN_PROOF, ...BANNED_IN_CODE], 'commit')
  );
  hits.push(
    ...scanBanned(
      [...tip].map(([name, text]) => ({ name, text })),
      BANNED_IN_CODE,
      'code'
    )
  );
  const records = [];
  if (proof) {
    for (const p of tracked.filter(
      (t) => t.startsWith(`${PROOF_DIR}/`) && t.endsWith('.md')
    ))
      records.push({ name: p, text: readFileSync(join(dir, p), 'utf8') });
    hits.push(...scanBanned(records, BANNED_IN_PROOF, 'record'));
  }
  if (hits.length) throw new Error(`banned phrases:\n${hits.join('\n')}`);

  // Drift and supersession checks run against the built history.
  const report = proof
    ? checkDesign(dir, keymap, shas)
    : checkDrifts(dir, shas, false);

  if (options.test) {
    const summary = suiteSummary(dir);
    console.log(`test suite at the tip:\n${summary}`);
  }
  const out = {
    variant: options.variant,
    scale: options.scale,
    tip: head,
    commits: Object.fromEntries(
      COMMITS.map((c, i) => [
        c.key,
        { sha: shas.get(c.key), subject: c.subject, tree: trees[i] },
      ])
    ),
    ...(proof
      ? {
          records: Object.fromEntries(
            Object.entries(keymap).sort(([a], [b]) => a.localeCompare(b))
          ),
        }
      : {}),
    ...report,
  };
  await writeFile(`${dir}.keymap.json`, `${JSON.stringify(out, null, 2)}\n`);
  git(dir, ['gc', '--quiet', '--prune=now']);
  console.log(`key map in ${dir}.keymap.json`);
}

// --------------------------------------------------------------- checks ----

function show(dir, sha, path) {
  try {
    return git(dir, ['show', `${sha}:${path}`]);
  } catch {
    return null;
  }
}

/** Each drift: no trailer, no graph change, and the code said one thing before and another after. */
function checkDrifts(dir, shas, proof) {
  const drifts = {};
  for (const [key, d] of Object.entries(DRIFTS)) {
    const sha = shas.get(d.commit);
    const parent = git(dir, ['rev-parse', `${sha}^`]);
    const touched = git(dir, ['show', '--name-only', '--format=', sha])
      .split('\n')
      .filter(Boolean);
    if (touched.some((p) => p.startsWith(`${PROOF_DIR}/`)))
      throw new Error(`${key}: drift commit touches the graph`);
    if (git(dir, ['log', '-1', '--format=%(trailers:key=Proof)', sha]))
      throw new Error(`${key}: drift commit has a trailer`);
    for (const c of d.code) {
      const before = show(dir, parent, c.path) ?? '';
      const after = show(dir, sha, c.path) ?? '';
      const tipText = show(dir, 'HEAD', c.path) ?? '';
      if (c.before && !before.includes(c.before))
        throw new Error(
          `${key}: ${c.path} lacked "${c.before}" before ${d.commit}`
        );
      if (c.before && after.includes(c.before))
        throw new Error(
          `${key}: ${c.path} still has "${c.before}" after ${d.commit}`
        );
      if (c.after && !after.includes(c.after))
        throw new Error(
          `${key}: ${c.path} lacks "${c.after}" after ${d.commit}`
        );
      if (c.after && before.includes(c.after))
        throw new Error(
          `${key}: ${c.path} had "${c.after}" before ${d.commit}`
        );
      if (c.after && !tipText.includes(c.after))
        throw new Error(`${key}: ${c.path} lost "${c.after}" by the tip`);
    }
    drifts[key] = {
      kind: d.kind,
      commit: d.commit,
      sha,
      subject: COMMITS.find((c) => c.key === d.commit).subject,
      files: touched,
      proofSays: d.proofSays,
      codeNow: d.codeNow,
    };
    if (proof) drifts[key].records = d.records;
  }
  // After the first drift commit, no commit touches the drifted records.
  return { drifts };
}

function checkDesign(dir, keymap, shas) {
  const { drifts } = checkDrifts(dir, shas, true);
  const graph = join(dir, PROOF_DIR);
  const read = (id) => {
    for (const sub of readdirSync(graph)) {
      const file = join(graph, sub, `${id}.md`);
      if (existsSync(file)) return readFileSync(file, 'utf8');
    }
    return null;
  };
  const field = (text, name) => {
    const m = new RegExp(`^${name}:\\s*(.*)$`, 'm').exec(text);
    return m ? m[1].trim() : null;
  };
  // Drift records must still say what Proof says: live, and unchanged since.
  for (const [key, d] of Object.entries(DRIFTS)) {
    drifts[key].records = Object.fromEntries(
      d.records.map((k) => {
        const id = keymap[k];
        const text = id && read(id);
        if (!text) throw new Error(`${key}: no record ${k}`);
        if (/^superseded_by:|^invalidated_by:|^retracted: true/m.test(text))
          throw new Error(`${key}: ${k} is not live`);
        return [k, id];
      })
    );
  }
  // Code anchors: hold or stale, as declared.
  const anchors = {};
  for (const [k, id] of Object.entries(keymap)) {
    if (!id.startsWith('cit-')) continue;
    const text = read(id);
    if (!/^role: code$/m.test(text)) continue;
    const body = text.split(/^---$/m).slice(2).join('---').trim();
    const m = /^(\S+?)(?:#(\S+))?@([0-9a-f]{12})$/.exec(body);
    if (!m) throw new Error(`${k}: anchor body ${body}`);
    const [, path, symbol, sha] = m;
    const atTip = show(dir, 'HEAD', path);
    const holds =
      atTip !== null && (!symbol || new RegExp(`\\b${symbol}\\b`).test(atTip));
    anchors[k] = { id, path, symbol: symbol ?? null, sha, holds };
  }
  for (const [key, d] of Object.entries(DRIFTS))
    for (const [k, expect] of Object.entries(d.anchors ?? {})) {
      if (!anchors[k]) throw new Error(`${key}: no anchor ${k}`);
      if ((expect === 'holds') !== anchors[k].holds)
        throw new Error(`${key}: anchor ${k} should ${expect} at the tip`);
      anchors[k].drift = key;
      anchors[k].expect = expect;
    }
  // Filler cites shell/ paths the bed does not have, by design.
  for (const [k, a] of Object.entries(anchors))
    if (FILLER_KEYS.includes(k.split('.')[0])) delete anchors[k];
    else if (!a.holds && !a.drift)
      throw new Error(
        `anchor ${k} is stale at the tip but no drift declares it`
      );
  // Supersessions: target superseded by the superseder.
  const supersessions = {};
  for (const [key, s] of Object.entries(SUPERSESSIONS)) {
    const target = read(keymap[s.target]);
    const head = read(keymap[s.head]);
    if (!target || !head) throw new Error(`${key}: missing records`);
    if (!new RegExp(`superseded_by:[\\s\\S]*?${keymap[s.head]}`).test(target))
      throw new Error(`${key}: ${s.target} is not superseded by ${s.head}`);
    if (field(head, 'state') !== 'accepted')
      throw new Error(`${key}: ${s.head} is not accepted`);
    supersessions[key] = {
      target: keymap[s.target],
      head: keymap[s.head],
      commit: s.commit,
      sha: shas.get(s.commit),
    };
  }
  const rules = Object.fromEntries(
    Object.entries(RULES).map(([key, r]) => [
      key,
      {
        ...r,
        ids: r.records.map((k) => {
          if (!keymap[k]) throw new Error(`${key}: no record ${k}`);
          return keymap[k];
        }),
      },
    ])
  );
  // Counts per Effort, by standing.
  const efforts = {};
  for (const sub of readdirSync(graph)) {
    if (sub.startsWith('.')) continue;
    for (const name of readdirSync(join(graph, sub))) {
      const text = readFileSync(join(graph, sub, name), 'utf8');
      if (sub === 'efforts') continue;
      const effort = field(text, 'effort');
      const e = (efforts[effort] ??= { live: 0, dead: 0, kinds: {} });
      const kind = sub.replace(/s$/, '');
      e.kinds[kind] = (e.kinds[kind] ?? 0) + 1;
      const dead =
        /^superseded_by:/m.test(text) ||
        /^invalidated_by:/m.test(text) ||
        /^retracted: true/m.test(text) ||
        /^state: rejected/m.test(text);
      if (dead) e.dead += 1;
      else e.live += 1;
    }
  }
  const byKey = {};
  for (const [k, id] of Object.entries(keymap))
    if (k.endsWith('.effort'))
      byKey[k.slice(0, -7)] = efforts[id] ?? { live: 0, dead: 0, kinds: {} };
  return { drifts, supersessions, rules, anchors, efforts: byKey };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
