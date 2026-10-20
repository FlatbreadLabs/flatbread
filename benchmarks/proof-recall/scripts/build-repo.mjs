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
//   node scripts/build-repo.mjs --scale 10 --refactor --out /tmp/p3-repo-x10
//                             either bed, then a run of refactor commits on
//                             main from spec/_repo-refactor.mjs that leave
//                             Proof naming old paths and symbols
//
// It writes:
//   <out>/                    the repository, with main checked out
//   <out>/.flatbread/proof/prs.json
//                             gitignored; each branch's draft PR, in the
//                             shape `gh pr list --json` prints
//   <out>.keymap.json         every benchmark key to its record id, main and
//                             branch records alike. It sits outside the
//                             repository so no agent session sees it.
//   <out>.refactor.json       with --refactor only: what moved where (old
//                             path to new path, old symbol to new symbol
//                             and file, each commit's hash), every code
//                             anchor on main and whether it is now stale.
//                             Also outside the repository.
//
// Without --refactor a build is the same as before the flag existed. With
// it, the refactor commits go on main after the branches are cut, so the
// branches keep their content and their base, and every commit before the
// refactor keeps its hash. The refactor adds no records, Citations or
// trailers, so the key map is the same with or without it.
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
import { cutFunction, refactorCommits } from '../spec/_repo-refactor.mjs';

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
  const out = { out: null, scale: 1, refactor: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') out.out = resolve(argv[++i]);
    else if (argv[i] === '--scale') out.scale = Number(argv[++i]);
    else if (argv[i] === '--refactor') out.refactor = true;
    else throw new Error(`Unknown argument ${argv[i]}`);
  }
  if (!out.out)
    throw new Error(
      'usage: build-repo.mjs [--scale <n>] [--refactor] --out <dir>'
    );
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
function git(dir, argv, env = {}, stdio = undefined) {
  return execFileSync('git', argv, {
    cwd: dir,
    encoding: 'utf8',
    stdio,
    maxBuffer: 1 << 28,
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

// ------------------------------------------------------------ refactor ----

const wordRe = (symbol) => new RegExp(`\\b${symbol}\\b`);
const wordReAll = (symbol) => new RegExp(`\\b${symbol}\\b`, 'g');

/** Where `path` is after one path operation: a folder or file move. */
function movePath(path, op) {
  if (op.folder)
    return path === op.from || path.startsWith(`${op.from}/`)
      ? `${op.to}${path.slice(op.from.length)}`
      : path;
  return path === op.from ? op.to : path;
}

/**
 * Replays the refactor's path and symbol operations on (`path`, `symbol`),
 * as they stood before the refactor. Returns where they ended up and the
 * commits that moved or renamed them. `symbol` may be null for a file.
 */
function resolveRefactor(steps, path, symbol) {
  let p = path;
  let s = symbol;
  const commits = [];
  for (const step of steps) {
    let hit = false;
    for (const op of step.paths) {
      const next = movePath(p, op);
      if (next !== p) [p, hit] = [next, true];
    }
    for (const op of step.symbols)
      if (s && op.path === p && op.symbol === s) {
        p = op.newPath ?? p;
        s = op.newSymbol ?? s;
        hit = true;
      }
    if (hit) commits.push(step.sha);
  }
  return { path: p, symbol: s, commits };
}

/** True when `ref` has a file or folder at `path`. */
function existsAt(dir, ref, path) {
  try {
    git(dir, ['cat-file', '-e', `${ref}:${path}`], {}, [
      'ignore',
      'pipe',
      'ignore',
    ]);
    return true;
  } catch {
    return false;
  }
}

/** Code files (outside the graph) that hold `symbol` as a word at `ref`. */
function filesWithSymbol(dir, ref, symbol) {
  try {
    return git(dir, ['grep', '-lw', symbol, ref, '--', '.', `:!${PROOF_DIR}`])
      .split('\n')
      .filter(Boolean)
      .map((line) => line.slice(ref.length + 1));
  } catch {
    return [];
  }
}

/**
 * Commits the refactor from spec/_repo-refactor.mjs on main, then writes
 * <dir>.refactor.json. `base` is main's tip before it, where every branch
 * starts. Nothing here writes a record, a Citation or a trailer.
 */
export async function refactor(
  dir,
  { scale, fillerFiles, keymap, base, subjects, branches }
) {
  const commits = refactorCommits({ scale, fillerFiles });
  const seen = new Set(subjects);
  let last = git(dir, ['log', '-1', '--format=%cI', base]);
  for (const c of commits) {
    if (seen.has(c.subject))
      throw new Error(`duplicate commit subject "${c.subject}"`);
    seen.add(c.subject);
    if (new Date(c.at) <= new Date(last))
      throw new Error(`${c.key}: refactor commits must follow main in time`);
    if (!PEOPLE[c.author]) throw new Error(`${c.key}: unknown author`);
    last = c.at;
  }
  const baseFiles = git(dir, ['ls-files'])
    .split('\n')
    .filter((p) => p && !p.startsWith(`${PROOF_DIR}/`));
  const steps = [];
  const out = [];
  const read = (path) => readFile(join(dir, path), 'utf8');
  const write = async (path, text) => {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), text);
  };
  git(dir, ['checkout', '-q', 'main']);
  for (const c of commits) {
    const paths = [];
    const created = [];
    for (const [from, to] of c.moves ?? []) {
      const files = git(dir, ['ls-files', '--', from])
        .split('\n')
        .filter(Boolean);
      if (!files.length) throw new Error(`${c.key}: nothing at ${from}`);
      if (existsAt(dir, 'HEAD', to)) throw new Error(`${c.key}: ${to} exists`);
      await mkdir(dirname(join(dir, to)), { recursive: true });
      git(dir, ['mv', from, to]);
      paths.push({
        from,
        to,
        folder: !(files.length === 1 && files[0] === from),
      });
    }
    if (c.merge) {
      const { from, into, head } = c.merge;
      if (existsAt(dir, 'HEAD', into))
        throw new Error(`${c.key}: ${into} exists`);
      const parts = [];
      for (const path of from) {
        const lines = (await read(path)).split('\n');
        parts.push(
          lines.slice(lines.findIndex((l) => !l.startsWith('//!'))).join('\n')
        );
        git(dir, ['rm', '-q', path]);
        paths.push({ from: path, to: into, folder: false });
      }
      await write(into, `${head}${parts.join('\n')}`);
      created.push(into);
    }
    if (c.split) {
      const { from, symbol, into, head } = c.split;
      if (existsAt(dir, 'HEAD', into))
        throw new Error(`${c.key}: ${into} exists`);
      const [rest, block] = cutFunction(await read(from), symbol);
      await write(from, rest);
      await write(into, `${head}${block}`);
      created.push(into);
    }
    for (const [path, fn] of Object.entries(c.transform ?? {}))
      await write(path, fn(await read(path)));
    for (const [path, text] of Object.entries(c.write ?? {})) {
      if (existsAt(dir, 'HEAD', path))
        throw new Error(`${c.key}: ${path} exists`);
      await write(path, text);
      created.push(path);
    }
    for (const op of c.symbols ?? []) {
      if (!op.newSymbol) continue;
      const text = await read(op.path);
      if (!wordRe(op.symbol).test(text))
        throw new Error(`${c.key}: ${op.path} has no ${op.symbol}`);
      await write(op.path, text.replace(wordReAll(op.symbol), op.newSymbol));
    }
    const person = PEOPLE[c.author];
    git(dir, ['add', '-A']);
    git(
      dir,
      [
        'commit',
        '-q',
        '--no-verify',
        '-m',
        [c.subject, c.body].filter(Boolean).join('\n\n'),
      ],
      {
        GIT_AUTHOR_NAME: person.name,
        GIT_AUTHOR_EMAIL: email(c.author),
        GIT_AUTHOR_DATE: c.at,
        GIT_COMMITTER_NAME: person.name,
        GIT_COMMITTER_EMAIL: email(c.author),
        GIT_COMMITTER_DATE: c.at,
      }
    );
    const sha = git(dir, ['rev-parse', 'HEAD']);
    const touched = git(dir, ['show', '--name-only', '--format=', sha]).split(
      '\n'
    );
    if (touched.some((p) => p.startsWith(`${PROOF_DIR}/`)))
      throw new Error(`${c.key}: the refactor must not touch ${PROOF_DIR}/`);
    if (git(dir, ['log', '-1', '--format=%(trailers:key=Proof)', sha]))
      throw new Error(`${c.key}: the refactor must not carry Proof: trailers`);
    // Each symbol is where the commit says, and no longer where it was.
    for (const op of c.symbols ?? []) {
      const path = op.newPath ?? op.path;
      const symbol = op.newSymbol ?? op.symbol;
      if (!wordRe(symbol).test(await read(path)))
        throw new Error(`${c.key}: ${path} has no ${symbol}`);
      if (
        existsAt(dir, 'HEAD', op.path) &&
        wordRe(op.symbol).test(await read(op.path))
      )
        throw new Error(`${c.key}: ${op.path} still has ${op.symbol}`);
      // A rename reaches every file; nothing may call the old name.
      const left = op.newSymbol ? filesWithSymbol(dir, 'HEAD', op.symbol) : [];
      if (left.length)
        throw new Error(
          `${c.key}: ${op.symbol} is still in ${left.join(', ')}`
        );
    }
    for (const b of c.behaviour ?? [])
      if (!(await read(b.path)).includes(b.after))
        throw new Error(`${c.key}: ${b.path} lacks ${b.after}`);
    steps.push({ sha, paths, symbols: c.symbols ?? [] });
    out.push({
      key: c.key,
      sha,
      subject: c.subject,
      at: c.at,
      author: person.name,
      kinds: c.kinds,
      moves: paths.map(({ from, to, folder }) => ({ from, to, folder })),
      created,
      symbols: (c.symbols ?? []).map((op) => ({
        path: op.path,
        symbol: op.symbol,
        newPath: op.newPath ?? op.path,
        newSymbol: op.newSymbol ?? op.symbol,
      })),
      behaviour: c.behaviour ?? [],
    });
    console.log(`refactor ${short(sha)} ${c.subject}`);
  }
  const tip = git(dir, ['rev-parse', 'HEAD']);
  if (git(dir, ['diff', '--name-only', base, tip, '--', PROOF_DIR]))
    throw new Error('the refactor changed the graph');
  // Every code file that is somewhere else now.
  const paths = {};
  for (const path of baseFiles) {
    const to = resolveRefactor(steps, path, null).path;
    if (to !== path) paths[path] = to;
  }
  for (const [from, to] of Object.entries(paths))
    if (!existsAt(dir, tip, to) || existsAt(dir, tip, from))
      throw new Error(
        `refactor map: ${from} -> ${to} does not hold at the tip`
      );
  const folders = Object.fromEntries(
    out.flatMap((c) =>
      c.moves.filter((m) => m.folder).map((m) => [m.from, m.to])
    )
  );
  // Every symbol the refactor renames or moves, from each file that held it.
  const symbols = [];
  for (const c of out)
    for (const op of c.symbols)
      for (const path of filesWithSymbol(dir, base, op.symbol)) {
        const to = resolveRefactor(steps, path, op.symbol);
        // Skip files the operation did not reach, and plain file moves.
        if (to.symbol === op.symbol && [path, paths[path]].includes(to.path))
          continue;
        if (symbols.some((s) => s.path === path && s.symbol === op.symbol))
          continue;
        symbols.push({
          path,
          symbol: op.symbol,
          newPath: to.path,
          newSymbol: to.symbol,
          commits: to.commits,
        });
      }
  // Every code anchor on main: where its code is now, and whether the
  // path and symbol it names are still there.
  const graph = readGraph(join(dir, PROOF_DIR), keymap);
  const anchors = {};
  for (const rec of [...graph.records.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    if (rec.kind !== 'citation' || rec.frontmatter.role !== 'code') continue;
    const match = /^(\S+)#(\S+)@([0-9a-f]{7,40})$/.exec(rec.body.trim());
    if (!match)
      throw new Error(`code anchor ${rec.id} is not <path>#<symbol>@<sha>`);
    const [, path, symbol, commit] = match;
    const now = resolveRefactor(steps, path, symbol);
    const pathThere = existsAt(dir, tip, path);
    const symbolThere =
      pathThere && wordRe(symbol).test(git(dir, ['show', `${tip}:${path}`]));
    if (!wordRe(now.symbol).test(git(dir, ['show', `${tip}:${now.path}`])))
      throw new Error(`refactor map: ${now.path} has no ${now.symbol}`);
    anchors[graph.keyById.get(rec.id)] = {
      id: rec.id,
      path,
      symbol,
      commit,
      retracted: rec.frontmatter.retracted === true,
      newPath: now.path,
      newSymbol: now.symbol,
      // What no longer holds at the tip: the path it names, the symbol in
      // the file that path became (renamed, or moved to another file).
      stale:
        [
          !pathThere && 'path',
          ((pathThere && !symbolThere) ||
            now.symbol !== symbol ||
            now.path !== (paths[path] ?? path)) &&
            'symbol',
        ]
          .filter(Boolean)
          .join('+') || null,
      commits: now.commits,
    };
  }
  const behaviour = out.flatMap((c) =>
    c.behaviour.map((b) => ({ ...b, commit: c.sha, subject: c.subject }))
  );
  const map = {
    scale,
    base,
    tip,
    author: {
      name: PEOPLE[commits[0].author].name,
      login: PEOPLE[commits[0].author].login,
    },
    commits: out,
    folders,
    paths: Object.fromEntries(
      Object.entries(paths).sort(([a], [b]) => a.localeCompare(b))
    ),
    symbols: symbols.sort(
      (a, b) => a.path.localeCompare(b.path) || a.symbol.localeCompare(b.symbol)
    ),
    anchors,
    behaviour,
    branches: Object.fromEntries(
      branches.map((b) => [
        b.name,
        { base: git(dir, ['merge-base', 'main', b.name]) },
      ])
    ),
  };
  for (const [name, b] of Object.entries(map.branches))
    if (b.base !== base)
      throw new Error(`${name} does not start at ${short(base)}`);
  await writeFile(`${dir}.refactor.json`, `${JSON.stringify(map, null, 2)}\n`);
  const stale = Object.values(anchors).filter((a) => a.stale).length;
  console.log(
    `refactor: ${out.length} commits, ${
      Object.keys(paths).length
    } files moved, ${symbols.length} symbols renamed or moved, ${stale} of ${
      Object.keys(anchors).length
    } code anchors stale; map in ${dir}.refactor.json`
  );
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
  if (options.refactor)
    await refactor(dir, {
      scale: options.scale,
      fillerFiles: filler.files,
      keymap,
      base: tip,
      subjects: allCommits(history, branches).map((c) => c.subject),
      branches,
    });
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
