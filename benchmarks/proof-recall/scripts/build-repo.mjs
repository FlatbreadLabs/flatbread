#!/usr/bin/env node
// Builds the git test bed for the code-context and branch questions from
// spec/repo.mjs: a small codebase on main with `Proof:` commit trailers, the
// committed 1x graph, code anchors written through the real Proof writer,
// and four engineer branches, each with a draft PR.
//
//   node scripts/build-repo.mjs --out /tmp/p2-repo
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
// fixed id and time, so two builds give the same commit hashes.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createProofWriter, ProofMutationSchema } from '@flatbread/proof';
import { benchId } from './build.mjs';
import spec, { PEOPLE, specCommits } from '../spec/repo.mjs';

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
  const out = { out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') out.out = resolve(argv[++i]);
    else throw new Error(`Unknown argument ${argv[i]}`);
  }
  if (!out.out) throw new Error('usage: build-repo.mjs --out <dir>');
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

function checkSpec() {
  const commits = specCommits();
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
  // Each line of history must move forward in time.
  const lines = [
    spec.main,
    ...spec.branches.map((b) => [spec.main.at(-1), ...b.commits]),
  ];
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

async function commitOne(dir, commit, keymap, shas) {
  await writeFiles(dir, commit.files);
  if (commit.graph)
    await cp(GRAPH, join(dir, PROOF_DIR), {
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

async function main() {
  const options = args(process.argv.slice(2));
  checkSpec();
  const dir = options.out;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  git(dir, ['config', 'core.autocrlf', 'false']);
  const keymap = JSON.parse(await readFile(join(GRAPH, 'keymap.json'), 'utf8'));
  const shas = new Map();
  for (const commit of spec.main) await commitOne(dir, commit, keymap, shas);
  const tip = shas.get(spec.main.at(-1).key);
  console.log(`main: ${spec.main.length} commits, tip ${short(tip)}`);
  for (const branch of spec.branches) {
    git(dir, ['checkout', '-q', '-b', branch.name, tip]);
    for (const commit of branch.commits)
      await commitOne(dir, commit, keymap, shas);
    console.log(
      `${branch.name} (draft #${branch.pr}): ${
        branch.commits.length
      } commits, tip ${short(shas.get(branch.commits.at(-1).key))}`
    );
    git(dir, ['checkout', '-q', 'main']);
  }
  // What `gh pr list --json number,headRefName,isDraft,author,title` gives.
  const prs = spec.branches.map((b) => ({
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
  const added =
    Object.keys(sorted).length -
    Object.keys(JSON.parse(await readFile(join(GRAPH, 'keymap.json'), 'utf8')))
      .length;
  console.log(`${added} records added; key map in ${dir}.keymap.json`);
  if (!existsSync(join(dir, PROOF_DIR))) throw new Error('no graph on main');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
