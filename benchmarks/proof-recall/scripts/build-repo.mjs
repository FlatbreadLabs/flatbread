#!/usr/bin/env node
// Builds the git test bed for the code-context and branch questions from
// spec/repo.mjs: a small codebase on main with `Proof:` commit trailers, the
// committed 1x graph, code anchors written through the real Proof writer,
// and four engineer branches, each with a draft PR.
//
//   node scripts/build-repo.mjs --out /tmp/p2-repo
//   node scripts/build-repo.mjs --scale 10 --out /tmp/p2-repo-x10
//                             the same spec on the 10x graph, with filler
//                             code, commits, anchors and six more branches
//                             from spec/_repo-filler.mjs
//
// It writes:
//   <out>/                    the repository, with main checked out
//   <out>/.flatbread/proof/prs.json
//                             gitignored; each branch's draft PR, in the
//                             shape `gh pr list --json` prints
//   <out>.keymap.json         every benchmark key to its record id, main and
//                             branch records alike. It sits outside the
//                             repository so no agent session sees it.
//
// Every commit has a fixed author, date and message, and every record a
// fixed id and time, so two builds at one scale give the same commit hashes.
// A scaled build first runs `build.mjs --scale <n>` into a temporary folder
// and starts from that graph instead of the committed one.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createProofWriter, ProofMutationSchema } from '@flatbread/proof';
import { benchId } from './build.mjs';
import { readGraph } from './graph.mjs';
import spec, { PEOPLE } from '../spec/repo.mjs';
import { repoFiller } from '../spec/_repo-filler.mjs';
import { fillerTerms } from '../spec/_filler.mjs';

const BENCH = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(BENCH, '..', '..');
const GRAPH = join(BENCH, '.flatbread-proof');
const PROOF_DIR = '.flatbread-proof';

const KIND_BY_TYPE = {
  WriteIssue: 'issue',
  WriteFinding: 'finding',
  WriteCompaction: 'finding',
  WriteDecision: 'decision',
  WriteConstraint: 'constraint',
  WriteRisk: 'risk',
  WriteCitation: 'citation',
  WriteBlob: 'blob',
};
// Fields whose values name records; the spec writes `<effort>.<key>`.
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
];

function args(argv) {
  const out = { out: null, scale: 1 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') out.out = resolve(argv[++i]);
    else if (argv[i] === '--scale') out.scale = Number(argv[++i]);
    else throw new Error(`Unknown argument ${argv[i]}`);
  }
  if (!out.out)
    throw new Error('usage: build-repo.mjs [--scale <n>] --out <dir>');
  if (!Number.isInteger(out.scale) || out.scale < 1)
    throw new Error('--scale must be a whole number, 1 or more');
  // The key map is written next to the repository, so both must stay out
  // of this one, where an agent working here could find them.
  if (`${out.out}/`.startsWith(`${REPO_ROOT}/`))
    throw new Error('Build the test bed outside this repository');
  return out;
}

/** Commit hash abbreviation used in anchors and record bodies. */
const short = (sha) => sha.slice(0, 12);

/**
 * Runs git in `dir` with no user or system config, so a build depends on
 * nothing but the spec. `env` adds author and committer fields.
 */
function git(dir, argv, env = {}) {
  return execFileSync('git', argv, {
    cwd: dir,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: '/dev/null',
      TZ: 'UTC',
      ...env,
    },
  }).trim();
}

export function email(person) {
  return `${PEOPLE[person].login}@tidewater.example`;
}

/** Every commit on main and the branches, each with its branch name. */
function allCommits(main, branches) {
  return [
    ...main.map((c) => ({ ...c, branch: 'main' })),
    ...branches.flatMap((b) =>
      b.commits.map((c) => ({ ...c, branch: b.name }))
    ),
  ];
}

function checkSpec(main, branches) {
  const commits = allCommits(main, branches);
  const keys = new Set();
  const subjects = new Set();
  for (const c of commits) {
    if (keys.has(c.key)) throw new Error(`duplicate commit key ${c.key}`);
    if (subjects.has(c.subject))
      throw new Error(`duplicate commit subject "${c.subject}"`);
    if (!PEOPLE[c.author]) throw new Error(`${c.key}: unknown author`);
    keys.add(c.key);
    subjects.add(c.subject);
  }
  const names = new Set(branches.map((b) => b.name));
  const prs = new Set(branches.map((b) => b.pr));
  if (names.size < branches.length || prs.size < branches.length)
    throw new Error('branch names and PR numbers must be unique');
  // Each line of history must move forward in time.
  const lines = [main, ...branches.map((b) => [main.at(-1), ...b.commits])];
  for (const line of lines)
    for (let i = 1; i < line.length; i++)
      if (line[i].at < line[i - 1].at)
        throw new Error(`${line[i].key}: commits must be in time order`);
}

/** Writes or deletes the commit's files in the working tree. */
async function writeFiles(dir, files = {}) {
  for (const [path, text] of Object.entries(files)) {
    const target = join(dir, path);
    if (text === null) await rm(target, { force: true });
    else {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, text);
    }
  }
}

/** Replays one commit's events through the Proof writer. */
async function replay(dir, commit, keymap, shas) {
  const fill = (text) =>
    text.replace(/\{\{sha:([\w-]+)\}\}/g, (_, key) => {
      if (!shas.has(key))
        throw new Error(`${commit.key}: no commit ${key} yet`);
      return short(shas.get(key));
    });
  const resolveRef = (event, key) => {
    const id = keymap[key];
    if (!id)
      throw new Error(
        `${commit.key} ${event.key ?? event.type}: unknown key "${key}"`
      );
    return id;
  };
  let now = new Date(commit.at);
  const writer = createProofWriter({
    rootDir: join(dir, PROOF_DIR),
    clock: () => now,
  });
  for (const [i, event] of (commit.events ?? []).entries()) {
    // Events in one commit are a minute apart, so the records keep order.
    now = new Date(new Date(commit.at).getTime() + i * 60_000);
    let { key, effort, ...payload } = event;
    if (payload.type === 'Anchor') {
      const { path, symbol, commit: of, ...rest } = payload;
      if (!shas.has(of))
        throw new Error(`${commit.key}: anchor names ${of}, not yet committed`);
      payload = {
        ...rest,
        type: 'WriteCitation',
        role: 'code',
        body: `${path}#${symbol}@${short(shas.get(of))}`,
      };
    }
    const kind = KIND_BY_TYPE[payload.type];
    if (payload.body) payload.body = fill(payload.body);
    for (const field of REF_FIELDS) {
      if (payload[field] === undefined) continue;
      payload[field] = Array.isArray(payload[field])
        ? payload[field].map((ref) => resolveRef(event, ref))
        : resolveRef(event, payload[field]);
    }
    if (kind) {
      if (!key || !effort)
        throw new Error(`${commit.key}: create events need key and effort`);
      const qualified = `${effort}.${key}`;
      if (keymap[qualified])
        throw new Error(`${commit.key}: duplicate key ${qualified}`);
      payload.effort = resolveRef(event, `${effort}.effort`);
      payload.created_at = now.toISOString().replace('.000Z', 'Z');
      payload.id = benchId(kind, payload.title, qualified);
      keymap[qualified] = payload.id;
    } else if (key || effort)
      throw new Error(`${commit.key}: only create events take key and effort`);
    try {
      await writer.mutate(ProofMutationSchema.parse(payload));
    } catch (error) {
      throw new Error(`${commit.key} ${key ?? payload.type}: ${error.message}`);
    }
  }
  // The journal is writer state, not content; it is gitignored as well.
  await rm(join(dir, PROOF_DIR, '.journal'), { recursive: true, force: true });
}

async function commitOne(dir, commit, keymap, shas, graph) {
  await writeFiles(dir, commit.files);
  if (commit.graph)
    await cp(graph, join(dir, PROOF_DIR), {
      recursive: true,
      filter: (src) => !src.endsWith('keymap.json'),
    });
  await replay(dir, commit, keymap, shas);
  const trailers = (commit.proof ?? []).map((key) => {
    if (!keymap[key])
      throw new Error(`${commit.key}: trailer names unknown key ${key}`);
    return `Proof: ${keymap[key]}`;
  });
  const message = [commit.subject, commit.body, trailers.join('\n')]
    .filter(Boolean)
    .join('\n\n');
  const person = PEOPLE[commit.author];
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '--no-verify', '--allow-empty', '-m', message], {
    GIT_AUTHOR_NAME: person.name,
    GIT_AUTHOR_EMAIL: email(commit.author),
    GIT_AUTHOR_DATE: commit.at,
    GIT_COMMITTER_NAME: person.name,
    GIT_COMMITTER_EMAIL: email(commit.author),
    GIT_COMMITTER_DATE: commit.at,
  });
  const status = git(dir, ['status', '--porcelain']);
  if (status)
    throw new Error(`${commit.key}: files left uncommitted:\n${status}`);
  const sha = git(dir, ['rev-parse', 'HEAD']);
  shas.set(commit.key, sha);
  return sha;
}

/**
 * Filler must stay clear of everything the code and branch questions ask
 * about: no filler path or text holds a real path, a real file's path holds
 * no filler path, filler names no symbol a question or anchor names, and no
 * filler subsystem name appears in spec/repo.mjs or those questions. The
 * one exception is `filler.shared`, the crate lib.rs files filler adds its
 * folders to: no question may name them, and only the first real commit
 * may write them. Real files at the top level (README.md, Cargo.toml) are
 * matched by their whole path, so a filler tools/<x>/README.md is allowed.
 */
async function assertFillerIsDisjoint(filler) {
  const realPaths = new Set(
    allCommits(spec.main, spec.branches).flatMap((c) =>
      Object.keys(c.files ?? {})
    )
  );
  const questions = await Promise.all(
    ['code.json', 'branch.json'].map((name) =>
      readFile(join(BENCH, 'questions', name), 'utf8')
    )
  );
  const realText = [JSON.stringify(spec), ...questions].join('\n');
  const shared = new Set(filler.shared);
  for (const path of shared) {
    if (questions.some((text) => text.includes(path)))
      throw new Error(`a question names ${path}, which filler writes`);
    const writers = allCommits(spec.main, spec.branches).filter(
      (c) => c.files?.[path] !== undefined
    );
    if (writers.length !== 1 || writers[0].key !== spec.main[0].key)
      throw new Error(`${path}: only the first real commit may write it`);
  }
  // Paths and symbols the questions and the real anchors name.
  const named = new Set(
    ['ecs/names.rs', ...realPaths].filter(
      (path) => path.includes('/') && !shared.has(path)
    )
  );
  const symbols = new Set();
  for (const text of questions)
    for (const q of JSON.parse(text).questions)
      for (const check of q.checks) {
        if (check.symbol) symbols.add(check.symbol);
        for (const value of [check.path, check.bodyIncludes].flat())
          if (typeof value === 'string' && value.includes('/'))
            named.add(value);
      }
  for (const c of allCommits(spec.main, spec.branches))
    for (const e of c.events ?? [])
      if (e.type === 'Anchor') symbols.add(e.symbol);
  for (const path of filler.files) {
    if (realPaths.has(path) || shared.has(path))
      throw new Error(`filler overwrites ${path}`);
    for (const real of named)
      if (path.includes(real) || real.includes(path))
        throw new Error(`filler path ${path} overlaps ${real}`);
  }
  for (const c of allCommits(filler.main, filler.branches))
    for (const path of Object.keys(c.files ?? {}))
      if (!filler.files.includes(path) && !shared.has(path))
        throw new Error(`${c.key} writes ${path}, which is not filler`);
  const fillerText = JSON.stringify(
    allCommits(filler.main, filler.branches).map((c) => [
      c.subject,
      c.body,
      c.files,
      c.events,
    ])
  );
  for (const real of named)
    if (fillerText.includes(real))
      throw new Error(`filler names the real path ${real}`);
  for (const symbol of symbols)
    if (new RegExp(`\\b${symbol}\\b`).test(fillerText))
      throw new Error(`filler names the real symbol ${symbol}`);
  const lower = realText.toLowerCase();
  for (const effort of ['render', 'world', 'ports', 'tools', 'netcode'])
    for (const term of fillerTerms(effort))
      if (lower.includes(term.toLowerCase()))
        throw new Error(`filler subsystem "${term}" appears in real content`);
}

/** Main's commits with the filler merged in by time; real ones win ties. */
function mergeByTime(real, filler) {
  const tagged = [
    ...real.map((c, i) => ({ c, i, filler: 0 })),
    ...filler.map((c, i) => ({ c, i, filler: 1 })),
  ];
  tagged.sort(
    (a, b) =>
      new Date(a.c.at) - new Date(b.c.at) || a.filler - b.filler || a.i - b.i
  );
  return tagged.map((t) => t.c);
}

/**
 * The graph to start from: the committed one, or for --scale above 1 a
 * fresh `build.mjs --scale <n>` build in a temporary folder.
 */
async function startGraph(scale) {
  if (scale === 1) return { graph: GRAPH, done: async () => {} };
  const graph = await mkdtemp(join(tmpdir(), 'proof-recall-bed-graph-'));
  console.log(`building the ${scale}x graph in ${graph}`);
  execFileSync(
    process.execPath,
    [
      join(BENCH, 'scripts', 'build.mjs'),
      '--scale',
      String(scale),
      '--out',
      graph,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] }
  );
  return {
    graph,
    done: () => rm(graph, { recursive: true, force: true }),
  };
}

async function main() {
  const options = args(process.argv.slice(2));
  const { graph, done } = await startGraph(options.scale);
  try {
    await buildBed(options, graph);
  } finally {
    await done();
  }
}

async function buildBed(options, graph) {
  const keymap = JSON.parse(await readFile(join(graph, 'keymap.json'), 'utf8'));
  const graphKeys = Object.keys(keymap).length;
  const filler = repoFiller({
    scale: options.scale,
    graph: readGraph(graph, keymap),
    spec: { ...spec, PEOPLE },
  });
  if (options.scale > 1) await assertFillerIsDisjoint(filler);
  const history = mergeByTime(spec.main, filler.main);
  const branches = [...spec.branches, ...filler.branches];
  checkSpec(history, branches);
  const dir = options.out;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  git(dir, ['config', 'core.autocrlf', 'false']);
  const shas = new Map();
  for (const commit of history)
    await commitOne(dir, commit, keymap, shas, graph);
  const tip = shas.get(history.at(-1).key);
  console.log(`main: ${history.length} commits, tip ${short(tip)}`);
  for (const branch of branches) {
    git(dir, ['checkout', '-q', '-b', branch.name, tip]);
    for (const commit of branch.commits)
      await commitOne(dir, commit, keymap, shas, graph);
    console.log(
      `${branch.name} (draft #${branch.pr}): ${
        branch.commits.length
      } commits, tip ${short(shas.get(branch.commits.at(-1).key))}`
    );
    git(dir, ['checkout', '-q', 'main']);
  }
  // What `gh pr list --json number,headRefName,isDraft,author,title` gives.
  const prs = branches.map((b) => ({
    number: b.pr,
    headRefName: b.name,
    isDraft: true,
    title: b.title,
    author: { login: PEOPLE[b.author].login, name: PEOPLE[b.author].name },
  }));
  await mkdir(join(dir, '.flatbread', 'proof'), { recursive: true });
  await writeFile(
    join(dir, '.flatbread', 'proof', 'prs.json'),
    `${JSON.stringify(prs, null, 2)}\n`
  );
  if (git(dir, ['status', '--porcelain']))
    throw new Error('prs.json must be gitignored');
  const sorted = Object.fromEntries(
    Object.entries(keymap).sort(([a], [b]) => a.localeCompare(b))
  );
  await writeFile(`${dir}.keymap.json`, `${JSON.stringify(sorted, null, 2)}\n`);
  const added = Object.keys(sorted).length - graphKeys;
  console.log(`${added} records added; key map in ${dir}.keymap.json`);
  if (!existsSync(join(dir, PROOF_DIR))) throw new Error('no graph on main');
  // Pack the objects, so each session's `git clone --no-hardlinks` copies a
  // few MB instead of thousands of loose objects. Hashes do not change.
  git(dir, ['gc', '--quiet', '--prune=now']);
  if (options.scale > 1) {
    const tracked = git(dir, ['ls-files']).split('\n');
    const code = tracked.filter((p) => !p.startsWith(`${PROOF_DIR}/`));
    console.log(
      `main holds ${code.length} code files (${
        filler.files.length
      } filler) and ${tracked.length - code.length} graph files`
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
