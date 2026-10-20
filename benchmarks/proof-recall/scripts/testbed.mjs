// Checks against the git test bed that build-repo.mjs makes, for the code
// and branch question sets. check.mjs opens it with --repo <dir>.
//
// | type           | fields                                                  | returns                                        |
// | -------------- | ------------------------------------------------------- | ---------------------------------------------- |
// | `atRef`        | `ref`, `check`; for `ref: "*"`, `equals` and `report`   | the inner check's result on that ref's graph   |
// | `trailer`      | `path`, `ref`, `commit`, `symbol`, filters              | records named by `Proof:` trailers             |
// | `codeAnchor`   | `path`, `symbol`, `ref`, `commit`, `citations`, filters | records that cite a code anchor for the path   |
// | `pr`           | `branch`, `field`                                       | a draft PR's number, author, login or isDraft  |
// | `refDiff`      | `ref`, `change`, `effort`, `kinds`, `where`, `count`    | records a branch adds or changes               |
// | `changedPaths` | `ref`, `under`, `gone`, `count`                         | code files a branch changes                    |
// | `conflicts`    | `refs` (two), `kind`, `kinds`, `count`                  | records in that conflict if both refs merged   |
// | `renamed`      | `path`, `symbol`, `ref`, `report`                       | where an old path (and symbol) is on the ref   |
// | `staleAnchor`  | `ref`, `path`, `symbol`, `stale`, `citations`, `report`, filters | records citing code anchors that no longer hold |
// | `codeAt`       | `path`, `ref`, `follow`, `pattern`, `exists`, `symbol`  | a value, or a yes or no, from a file on the ref |
// | `anchorDrift`  | `anchor`, `ref`, `content`, `count`                     | commits since an anchor that touch its file    |
// | `goneText`     | `ref`, `anchors`, `report`, filters                     | records that name a code path main has lost    |
// | `refAll`       | `check`, `refs`, `main`, `mode`                         | one check on many refs: union, table or count  |
//
// `ref` defaults to main; `"*"` means every branch but main. A graph on a
// ref is written out with `git archive` into a temporary folder and read
// like any other. Branch records have keys in the key map like main's, and
// a key whose record is missing on a ref fails the check that names it.
//
// The last six are for a bed built with `--refactor`, where main has moved
// and renamed code that Proof still names by its old path and symbol; on
// any other bed they find nothing stale and nothing renamed. They work from
// git (rename detection, `git log -S`, file contents at a ref) and use
// <bed>.refactor.json only where git alone cannot say: a file merged into
// another, and the new name of a renamed symbol, which they then check
// against git.
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isCompaction, isLiveStanding } from '@flatbread/proof';
import {
  headRecord,
  matches,
  qualify,
  readGraph,
  sortValues,
  standing,
} from './graph.mjs';
import { specAnchors, specCommits } from '../spec/repo.mjs';
import { isFillerKey } from '../spec/_repo-filler.mjs';

const list = (value) =>
  Array.isArray(value) ? value : value === undefined ? [] : [value];

/** True when `path` is `prefix`, or a file under the folder `prefix`. */
function under(path, prefix) {
  const dir = prefix.replace(/\/+$/, '');
  return path === dir || path.startsWith(`${dir}/`);
}

/**
 * Filters shared by `trailer` and `codeAnchor`, applied in this order:
 * `follow` (a link field to step along, such as `derives_from`), `resolve:
 * "head"`, then `kinds`, `where`, `live`, `titleIncludes`, `bodyIncludes`.
 * Returns sorted keys, or their count with `count`.
 */
function finish(graph, recs, check) {
  let out = recs;
  if (check.follow)
    out = out.flatMap((rec) =>
      list(rec.frontmatter[check.follow]).map((id) => {
        const next = graph.records.get(id);
        if (!next) throw new Error(`${rec.id} links to missing ${id}`);
        return next;
      })
    );
  if (check.resolve === 'head') out = out.map((rec) => headRecord(graph, rec));
  if (check.kinds) out = out.filter((rec) => check.kinds.includes(rec.kind));
  if (check.where) out = out.filter((rec) => matches(rec, check.where));
  if (check.live !== undefined)
    out = out.filter(
      (rec) => isLiveStanding(rec.kind, standing(rec)) === check.live
    );
  const contains = (text, phrases) =>
    list(phrases).every((p) => text.toLowerCase().includes(p.toLowerCase()));
  if (check.titleIncludes)
    out = out.filter((rec) =>
      contains(String(rec.frontmatter.title ?? ''), check.titleIncludes)
    );
  if (check.bodyIncludes)
    out = out.filter((rec) => contains(rec.body, check.bodyIncludes));
  const keys = [
    ...new Set(
      out.map((rec) => {
        const key = graph.keyById.get(rec.id);
        if (!key) throw new Error(`no key for ${rec.id}`);
        return key;
      })
    ),
  ].sort();
  return check.count ? keys.length : keys;
}

export function openTestBed(dir) {
  const keymap = JSON.parse(readFileSync(`${dir}.keymap.json`, 'utf8'));
  const prs = JSON.parse(
    readFileSync(join(dir, '.flatbread', 'proof', 'prs.json'), 'utf8')
  );
  const env = {
    ...process.env,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
  };
  const git = (...argv) =>
    execFileSync('git', argv, {
      cwd: dir,
      env,
      encoding: 'utf8',
      maxBuffer: 1 << 28,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  const succeeds = (...argv) => {
    try {
      git(...argv);
      return true;
    } catch {
      return false;
    }
  };
  const temp = mkdtempSync(join(tmpdir(), 'proof-recall-refs-'));
  process.on('exit', () => rmSync(temp, { recursive: true, force: true }));
  const graphs = new Map();
  const bed = {
    dir,
    keymap,
    prs,
    git,
    commitOf: (ref) => git('rev-parse', '--verify', `${ref}^{commit}`),
    mergeBase: (a, b) => git('merge-base', a, b),
    branches: () =>
      git('for-each-ref', '--format=%(refname:short)', 'refs/heads')
        .split('\n')
        .filter((name) => name && name !== 'main')
        .sort(),
    pr(branch) {
      const pr = prs.find((p) => p.headRefName === branch);
      if (!pr) throw new Error(`no PR for ${branch}`);
      return pr;
    },
    /** The graph as it is on `ref`, read once per commit. */
    graphAt(ref) {
      const commit = bed.commitOf(ref);
      if (!graphs.has(commit)) {
        const out = join(temp, commit);
        mkdirSync(out);
        const tar = execFileSync(
          'git',
          ['archive', '--format=tar', commit, '.flatbread-proof'],
          { cwd: dir, env, maxBuffer: 1 << 28 }
        );
        execFileSync('tar', ['-x', '-C', out], { input: tar });
        const graph = readGraph(join(out, '.flatbread-proof'), keymap);
        graph.repo = bed;
        graph.ref = ref;
        graph.commit = commit;
        graphs.set(commit, graph);
      }
      return graphs.get(commit);
    },
    runCheck: (graph, effort, check, runCheck) =>
      CHECKS[check.type](bed, graph, effort, check, runCheck),
  };
  // Questions name commits by what they did; the spec names them by key.
  const bySubject = new Map(
    git('log', '--all', '--format=%H%x09%s')
      .split('\n')
      .map((line) => [line.slice(41), line.slice(0, 40)])
  );
  bed.commitSha = new Map(
    specCommits().map((c) => [c.key, bySubject.get(c.subject)])
  );
  for (const [key, sha] of bed.commitSha)
    if (!sha) throw new Error(`spec commit ${key} is not in ${dir}`);
  bed.succeeds = succeeds;
  bed.refactor = existsSync(`${dir}.refactor.json`)
    ? JSON.parse(readFileSync(`${dir}.refactor.json`, 'utf8'))
    : null;
  bed.exists = (ref, path) => succeeds('cat-file', '-e', `${ref}:${path}`);
  bed.show = (ref, path) => git('show', `${ref}:${path}`);
  return bed;
}

/** Commits on `ref` that touch `path`, newest first. */
function commitsTouching(bed, ref, path, symbol) {
  const argv = ['log', '--format=%H', ref];
  if (symbol) argv.push(`-S${symbol}`);
  const out = bed.git(...argv, '--', path);
  return out ? out.split('\n') : [];
}

const hasWord = (text, word) => new RegExp(`\\b${word}\\b`).test(text);

/**
 * How an old file path got to where it is on `ref`: one step per commit that
 * deleted or renamed it, oldest first, as { sha, subject, from, to }. Git's
 * rename detection names the new path; for a file merged into another,
 * which git shows as a deletion, the refactor map does, and the new file
 * must change in that same commit. Empty when the path is still there.
 */
function followPath(bed, ref, path) {
  const trail = [];
  let p = path;
  while (!bed.exists(ref, p)) {
    if (trail.length > 20) throw new Error(`${path}: rename loop`);
    const sha = bed.git(
      'log',
      '-1',
      '--format=%H',
      '--diff-filter=D',
      ref,
      '--',
      p
    );
    if (!sha) throw new Error(`${p} is not on ${ref} and never was`);
    const status = bed
      .git('show', '-M', '--name-status', '--format=', sha)
      .split('\n');
    const renamed = status
      .map((line) => line.split('\t'))
      .find(([code, from]) => code.startsWith('R') && from === p);
    let to = renamed?.[2];
    if (!to) {
      const step = bed.refactor?.commits.find((c) => c.sha === sha);
      const move = step?.moves.find((m) => m.from === p);
      to = move?.to;
      if (!to || !status.some((line) => line.split('\t').at(-1) === to))
        throw new Error(`${p} was deleted on ${ref}, not moved`);
    }
    trail.push({
      sha,
      subject: bed.git('log', '-1', '--format=%s', sha),
      from: p,
      to,
    });
    p = to;
  }
  return trail;
}

/** True when `path` was a folder just before the last commit to touch it. */
function wasFolder(bed, ref, path) {
  if (bed.exists(ref, path))
    return bed.git('cat-file', '-t', `${ref}:${path}`) === 'tree';
  const sha = bed.git('log', '-1', '--format=%H', ref, '--', path);
  return (
    Boolean(sha) && bed.git('cat-file', '-t', `${sha}^:${path}`) === 'tree'
  );
}

/**
 * Replays the refactor map's commits that are on `ref`, oldest first, on
 * the file `path` and `symbol` as they were before the refactor: path moves
 * first, then the symbol renames and moves, as build-repo.mjs does. Returns
 * { path, symbol, commits }, where `commits` are the ones that renamed or
 * moved the symbol. With no refactor commit on `ref`, nothing changes.
 */
function replaySymbol(bed, ref, path, symbol) {
  let p = path;
  let s = symbol;
  const commits = [];
  for (const step of bed.refactor?.commits ?? []) {
    if (!bed.succeeds('merge-base', '--is-ancestor', step.sha, ref)) continue;
    for (const op of step.moves)
      if (op.folder ? under(p, op.from) : p === op.from)
        p = `${op.to}${p.slice(op.from.length)}`;
    for (const op of step.symbols)
      if (op.path === p && op.symbol === s) {
        [p, s] = [op.newPath, op.newSymbol];
        commits.push(step.sha);
      }
  }
  return { path: p, symbol: s, commits };
}

/**
 * Where the old `path` (a file or folder), and `symbol` in it, are on
 * `ref`: { path, symbol, trail }. A symbol renamed or moved to another file
 * is found by replaying the refactor commits on `ref` (replaySymbol), then
 * checked in git: the file holds the new name, the old name is gone from
 * it, and `git log -S` shows each renaming commit changing the old name.
 */
function locate(bed, ref, path, symbol) {
  if (wasFolder(bed, ref, path)) {
    if (symbol) throw new Error('renamed: a symbol needs a file, not a folder');
    if (bed.exists(ref, path)) return { path, trail: [] };
    const sha = bed.git('log', '-1', '--format=%H', ref, '--', path);
    const files = bed
      .git('ls-tree', '-r', '--name-only', `${sha}^`, '--', path)
      .split('\n');
    let folder = null;
    const trail = new Map();
    for (const file of files) {
      const steps = followPath(bed, ref, file);
      const to = steps.at(-1)?.to ?? file;
      const rest = file.slice(path.length);
      if (!to.endsWith(rest)) throw new Error(`${file} left ${path}`);
      const dir = to.slice(0, to.length - rest.length);
      if (folder !== null && dir !== folder)
        throw new Error(`${path} was split between ${folder} and ${dir}`);
      folder = dir;
      for (const step of steps) trail.set(step.sha, step);
    }
    return { path: folder, trail: [...trail.values()] };
  }
  const trail = followPath(bed, ref, path);
  let p = trail.at(-1)?.to ?? path;
  if (!symbol) return { path: p, trail };
  let s = symbol;
  const replay = replaySymbol(bed, ref, path, symbol);
  if (replay.commits.length) {
    for (const sha of replay.commits) {
      // Whole words, so prewarm_district does not count as warm_district.
      const removed = bed.git(
        'log',
        '--format=%H',
        '--pickaxe-regex',
        `-S\\b${symbol}\\b`,
        `${sha}^!`
      );
      if (removed !== sha)
        throw new Error(
          `renamed: ${sha.slice(0, 12)} does not change ${symbol}`
        );
    }
    p = replay.path;
    s = replay.symbol;
  }
  const text = bed.show(ref, p);
  if (!hasWord(text, s)) throw new Error(`${p} has no ${s} on ${ref}`);
  if (s !== symbol && hasWord(text, symbol))
    throw new Error(`${p} still has ${symbol} on ${ref}`);
  return { path: p, symbol: s, trail };
}

/** Every code anchor in `graph`: { rec, key, path, symbol, abbrev }. */
function codeAnchors(graph) {
  const out = [];
  for (const rec of graph.records.values()) {
    if (rec.kind !== 'citation' || rec.frontmatter.role !== 'code') continue;
    if (rec.frontmatter.retracted === true) continue;
    const key = graph.keyById.get(rec.id);
    const match = /^(\S+)#(\S+)@([0-9a-f]{7,40})$/.exec(rec.body.trim());
    if (!match)
      throw new Error(`code anchor ${key} is not <path>#<symbol>@<sha>`);
    out.push({ rec, key, path: match[1], symbol: match[2], abbrev: match[3] });
  }
  return out;
}

/**
 * The record ids that `check` names by key, at any depth: every string
 * value that is a key in the key map, qualified by `effort` as questions
 * write them.
 */
function namedIds(keymap, effort, check) {
  const ids = [];
  const walk = (value) => {
    if (typeof value === 'string') {
      const id = keymap[qualify(effort, value)];
      if (id) ids.push(id);
    } else if (value && typeof value === 'object')
      for (const v of Object.values(value)) walk(v);
  };
  walk(check);
  return ids;
}

/**
 * Code paths, files and the folders above them, that some commit on `ref`
 * had and `ref` no longer has, sorted.
 */
function gonePaths(bed, ref) {
  const files = bed
    .git(
      'log',
      '--format=',
      '--name-only',
      ref,
      '--',
      '.',
      ':!.flatbread-proof'
    )
    .split('\n')
    .filter(Boolean);
  const paths = new Set();
  for (const file of files) {
    const parts = file.split('/');
    for (let i = 1; i <= parts.length; i++)
      paths.add(parts.slice(0, i).join('/'));
  }
  return [...paths].filter((path) => !bed.exists(ref, path)).sort();
}

/** True when `text` names `path` whole: not inside a longer path or word. */
function namesPath(text, path) {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\w./-])${escaped}(?![\\w-]|\\.\\w)`).test(text);
}

const CHECKS = {
  atRef(bed, graph, effort, check, runCheck) {
    if (!check.check) throw new Error('atRef needs `check`');
    if (check.ref !== '*')
      return runCheck(bed.graphAt(check.ref ?? 'main'), effort, check.check);
    // Every branch where the inner check gives `equals`, as branch names,
    // PR numbers, or PR authors. A check that fails on a branch, such as one
    // naming a record the branch lacks, does not match there.
    if (!('equals' in check)) throw new Error('atRef on "*" needs `equals`');
    const hits = bed.branches().filter((branch) => {
      try {
        const got = runCheck(bed.graphAt(branch), effort, check.check);
        return JSON.stringify(got) === JSON.stringify(check.equals);
      } catch {
        return false;
      }
    });
    const report = (branch) =>
      check.report === 'pr'
        ? bed.pr(branch).number
        : check.report === 'author'
        ? bed.pr(branch).author.name
        : branch;
    const out = hits.map(report);
    return out.length === 1 ? out[0] : out;
  },

  // Records named by `Proof: <id>` trailers on commits that touch `path` (a
  // file or a folder). `commit`: "all" (the default), "latest", or
  // "introducing", the oldest; with `symbol`, only commits that add or
  // remove that text count.
  trailer(bed, _graph, _effort, check) {
    const ref = check.ref ?? 'main';
    const graph = bed.graphAt(ref);
    let shas = commitsTouching(bed, ref, check.path, check.symbol);
    if (!shas.length)
      throw new Error(`no commit on ${ref} touches ${check.path}`);
    if (check.commit === 'latest') shas = shas.slice(0, 1);
    else if (check.commit === 'introducing') shas = shas.slice(-1);
    else if (check.commit && check.commit !== 'all')
      throw new Error(`bad commit ${check.commit}`);
    const ids = shas.flatMap((sha) =>
      bed
        .git(
          'log',
          '-1',
          '--format=%(trailers:key=Proof,valueonly,separator=%x2C)',
          sha
        )
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    );
    const recs = ids.map((id) => {
      const rec = graph.records.get(id);
      if (!rec) throw new Error(`a trailer names ${id}, which ${ref} lacks`);
      return rec;
    });
    return finish(graph, recs, check);
  },

  // Records that cite a `role: code` Citation for `path` (a file or a
  // folder), and `symbol` if given. Every such Citation must be one that
  // spec/repo.mjs declares, or filler from spec/_repo-filler.mjs in a scaled
  // bed, and git must agree with it: the commit exists on the ref, touches
  // the file, and the file holds the symbol at that commit.
  // `commit: "introducing"` keeps anchors on the commit that first added the
  // symbol to the file. `citations: true` returns the Citations themselves.
  codeAnchor(bed, _graph, _effort, check) {
    const ref = check.ref ?? 'main';
    const graph = bed.graphAt(ref);
    const declared = new Map(specAnchors().map((a) => [a.key, a]));
    const anchors = [];
    for (const rec of graph.records.values()) {
      if (rec.kind !== 'citation' || rec.frontmatter.role !== 'code') continue;
      if (rec.frontmatter.retracted === true) continue;
      const key = graph.keyById.get(rec.id);
      const match = /^(\S+)#(\S+)@([0-9a-f]{7,40})$/.exec(rec.body.trim());
      if (!match)
        throw new Error(`code anchor ${key} is not <path>#<symbol>@<sha>`);
      const [, path, symbol, abbrev] = match;
      if (!under(path, check.path)) continue;
      if (check.symbol && symbol !== check.symbol) continue;
      const spec = declared.get(key);
      if (
        !isFillerKey(key) &&
        (!spec ||
          spec.path !== path ||
          spec.symbol !== symbol ||
          !bed.commitSha.get(spec.commit)?.startsWith(abbrev))
      )
        throw new Error(`code anchor ${key} is not one spec/repo.mjs declares`);
      const sha = bed.commitOf(abbrev);
      if (!bed.succeeds('merge-base', '--is-ancestor', sha, ref))
        throw new Error(`code anchor ${key} names ${abbrev}, not on ${ref}`);
      const touched = bed
        .git('show', '--name-only', '--format=', sha)
        .split('\n');
      if (!touched.includes(path))
        throw new Error(`code anchor ${key}: ${abbrev} does not touch ${path}`);
      if (!bed.git('show', `${sha}:${path}`).includes(symbol))
        throw new Error(
          `code anchor ${key}: ${path} has no ${symbol} at ${abbrev}`
        );
      anchors.push({ rec, path, symbol, sha });
    }
    let kept = anchors;
    if (check.commit === 'introducing')
      kept = anchors.filter(
        (a) => commitsTouching(bed, ref, a.path, a.symbol).at(-1) === a.sha
      );
    else if (check.commit && check.commit !== 'all')
      throw new Error(`bad commit ${check.commit}`);
    const ids = new Set(kept.map((a) => a.rec.id));
    const recs = check.citations
      ? kept.map((a) => a.rec)
      : [...graph.records.values()].filter((rec) =>
          list(rec.frontmatter.cites).some((id) => ids.has(id))
        );
    return finish(graph, recs, check);
  },

  pr(bed, _graph, _effort, check) {
    const pr = bed.pr(check.branch);
    if (check.field === 'number') return pr.number;
    if (check.field === 'author') return pr.author.name;
    if (check.field === 'login') return pr.author.login;
    if (check.field === 'isDraft') return pr.isDraft;
    throw new Error(`bad pr field ${check.field}`);
  },

  // Records on a branch measured against where it left main. `change`:
  // "added" (new on the branch), "restanded" (its standing differs),
  // "changed" (any byte of frontmatter or body differs), or "retracted".
  refDiff(bed, _graph, _effort, check) {
    const refs = check.ref === '*' ? bed.branches() : [check.ref];
    const effortId = check.effort && bed.keymap[`${check.effort}.effort`];
    if (check.effort && !effortId)
      throw new Error(`unknown Effort ${check.effort}`);
    const keys = new Set();
    for (const ref of refs) {
      const graph = bed.graphAt(ref);
      const base = bed.graphAt(bed.mergeBase('main', ref));
      for (const rec of graph.records.values()) {
        if (check.kinds && !check.kinds.includes(rec.kind)) continue;
        if (check.where && !matches(rec, check.where)) continue;
        if (check.effort && rec.frontmatter.effort !== effortId) continue;
        const old = base.records.get(rec.id);
        const hit =
          check.change === 'added'
            ? !old
            : check.change === 'restanded'
            ? old && standing(old) !== standing(rec)
            : check.change === 'retracted'
            ? old &&
              old.frontmatter.retracted !== true &&
              rec.frontmatter.retracted === true
            : check.change === 'changed'
            ? old &&
              JSON.stringify([old.frontmatter, old.body]) !==
                JSON.stringify([rec.frontmatter, rec.body])
            : (() => {
                throw new Error(`bad change ${check.change}`);
              })();
        if (hit) keys.add(graph.keyById.get(rec.id));
      }
    }
    const out = [...keys].sort();
    return check.count ? out.length : out;
  },

  // Code files (anything outside .flatbread-proof/) that a branch changes
  // since it left main, under the folder `under`. `gone: true` keeps only
  // files at a path main no longer has: the file, or a folder above it, was
  // there where the branch left main and is not on main now.
  changedPaths(bed, _graph, _effort, check) {
    const refs = check.ref === '*' ? bed.branches() : [check.ref];
    const paths = new Set();
    for (const ref of refs) {
      const base = bed.mergeBase('main', ref);
      const out = bed.git(
        'diff',
        '--name-only',
        base,
        ref,
        '--',
        check.under ?? '.'
      );
      for (const path of out ? out.split('\n') : []) {
        if (under(path, '.flatbread-proof')) continue;
        if (check.gone) {
          const parts = path.split('/');
          const prefixes = parts.map((_, i) => parts.slice(0, i + 1).join('/'));
          if (
            !prefixes.some((p) => bed.exists(base, p) && !bed.exists('main', p))
          )
            continue;
        }
        paths.add(path);
      }
    }
    const out = [...paths].sort();
    return check.count ? out.length : out;
  },

  conflicts(bed, _graph, _effort, check) {
    const [a, b] = check.refs ?? [];
    if (!a || !b) throw new Error('conflicts needs two refs');
    const out = conflicts(bed, a, b, check.kind).filter(
      (rec) => !check.kinds || check.kinds.includes(rec.kind)
    );
    const keys = [
      ...new Set(out.map((rec) => bed.graphAt(a).keyById.get(rec.id))),
    ].sort();
    return check.count ? keys.length : keys;
  },

  // Where the old file or folder `path`, and `symbol` in it, are on `ref`.
  // `report`: "path" (the default; the path itself when it never moved),
  // "symbol" (`<path>#<symbol>`), "commit" (the subject of the last commit
  // that moved or renamed it) or "commits" (every such subject, oldest
  // first).
  renamed(bed, _graph, _effort, check) {
    const ref = check.ref ?? 'main';
    const found = locate(bed, ref, check.path, check.symbol);
    // The commits that moved the file, and those that renamed or moved the
    // symbol, oldest first.
    const shas = new Set(found.trail.map((t) => t.sha));
    if (check.symbol)
      for (const sha of bed.refactor?.symbols.find(
        (e) => e.path === check.path && e.symbol === check.symbol
      )?.commits ?? [])
        if (bed.succeeds('merge-base', '--is-ancestor', sha, ref))
          shas.add(sha);
    const subjects = [...shas]
      .map((sha) => bed.git('log', '-1', '--format=%ct%x09%s', sha))
      .sort((a, b) => Number(a.split('\t')[0]) - Number(b.split('\t')[0]))
      .map((line) => line.slice(line.indexOf('\t') + 1));
    const report = check.report ?? 'path';
    if (report === 'path') return found.path;
    if (report === 'symbol') return `${found.path}#${found.symbol}`;
    if (report === 'commit') return subjects.at(-1) ?? null;
    if (report === 'commits') return subjects;
    throw new Error(`bad report ${report}`);
  },

  // Records that cite a code anchor that no longer holds on `ref`: the path
  // it names is gone ("path"), or the path is there but the symbol is not
  // ("symbol"). `stale`: "any" (the default), "path", "symbol" or "fresh"
  // (anchors that still hold). `path` and `symbol` keep anchors that name
  // them. `citations: true` returns the Citations; `report: "now"` returns
  // where each anchor's code is now, as `<path>#<symbol>`, and `report:
  // "named"` what the anchor names. Other filters are as for codeAnchor.
  staleAnchor(bed, _graph, _effort, check) {
    const ref = check.ref ?? 'main';
    const graph = bed.graphAt(ref);
    const want = check.stale ?? 'any';
    if (!['any', 'path', 'symbol', 'fresh'].includes(want))
      throw new Error(`bad stale ${want}`);
    const anchors = codeAnchors(graph);
    // A `path` filter that no anchor names is a typo, not an empty answer.
    if (check.path && !anchors.some((a) => under(a.path, check.path)))
      throw new Error(`staleAnchor: no code anchor names ${check.path}`);
    const kept = anchors.filter((a) => {
      if (check.path && !under(a.path, check.path)) return false;
      if (check.symbol && a.symbol !== check.symbol) return false;
      const status = !bed.exists(ref, a.path)
        ? 'path'
        : !hasWord(bed.show(ref, a.path), a.symbol)
        ? 'symbol'
        : 'fresh';
      return want === 'any' ? status !== 'fresh' : status === want;
    });
    if (check.report === 'named' || check.report === 'now') {
      const out = kept.map((a) => {
        if (check.report === 'named') return `${a.path}#${a.symbol}`;
        const now = locate(bed, ref, a.path, a.symbol);
        return `${now.path}#${now.symbol}`;
      });
      const sorted = [...new Set(out)].sort();
      return check.count ? sorted.length : sorted;
    }
    const ids = new Set(kept.map((a) => a.rec.id));
    const recs = check.citations
      ? kept.map((a) => a.rec)
      : [...graph.records.values()].filter((rec) =>
          list(rec.frontmatter.cites).some((id) => ids.has(id))
        );
    return finish(graph, recs, check);
  },

  // A file on `ref`, by its path then or now. `follow: true` takes an old
  // path to where it is on `ref` first. Then `exists: true` gives whether
  // the file is there, `symbol` whether it holds that word, and `pattern`
  // (a regular expression) the first capture group of its first match, or
  // the whole match.
  codeAt(bed, _graph, _effort, check) {
    const ref = check.ref ?? 'main';
    const path = check.follow ? locate(bed, ref, check.path).path : check.path;
    if (check.exists) return bed.exists(ref, path);
    // `git show` on a folder lists its entries, which would match as text.
    if (!bed.exists(ref, path)) throw new Error(`${path} is not on ${ref}`);
    if (bed.git('cat-file', '-t', `${ref}:${path}`) !== 'blob')
      throw new Error(`codeAt: ${path} on ${ref} is a folder, not a file`);
    const text = bed.show(ref, path);
    if (check.symbol) return hasWord(text, check.symbol);
    if (check.pattern) {
      const match = new RegExp(check.pattern, 'm').exec(text);
      if (!match) throw new Error(`${path} on ${ref} has no ${check.pattern}`);
      return match[1] ?? match[0];
    }
    throw new Error('codeAt needs exists, symbol or pattern');
  },

  // Commits on `ref` after a code anchor's commit that touch its file under
  // any name it has had, oldest first, as subjects. `content: true` drops
  // commits that only move the file. `anchor` is the Citation's key.
  anchorDrift(bed, _graph, _effort, check) {
    const ref = check.ref ?? 'main';
    const graph = bed.graphAt(ref);
    const anchor = codeAnchors(graph).find((a) => a.key === check.anchor);
    if (!anchor) throw new Error(`no code anchor ${check.anchor} on ${ref}`);
    const since = bed.commitOf(anchor.abbrev);
    const names = [
      anchor.path,
      ...followPath(bed, ref, anchor.path).map((t) => t.to),
    ];
    const shas = bed
      .git(
        'log',
        '--reverse',
        '--format=%H',
        `${since}..${ref}`,
        '--',
        ...names
      )
      .split('\n')
      .filter(Boolean)
      .filter((sha) => {
        if (!check.content) return true;
        // A move with no change shows as R100 for one of the names.
        const lines = bed
          .git('show', '-M', '--name-status', '--format=', sha)
          .split('\n');
        return !lines.some((line) => {
          const [code, from, to] = line.split('\t');
          return code === 'R100' && names.includes(from) && names.includes(to);
        });
      });
    const out = shas.map((sha) => bed.git('log', '-1', '--format=%s', sha));
    return check.count ? out.length : out;
  },

  // Records whose title or body names a code path, a file or a folder,
  // that an earlier commit on `ref` had and `ref` no longer has. A name
  // counts only whole: not as part of a longer path or word. `anchors:
  // false` leaves out code anchors (code Citations), whose body is a path.
  // Other filters are as for codeAnchor; `report: "paths"` gives the gone
  // paths that some kept record names instead.
  goneText(bed, _graph, _effort, check) {
    const ref = check.ref ?? 'main';
    const graph = bed.graphAt(ref);
    const gone = gonePaths(bed, ref);
    const named = new Set();
    const recs = [...graph.records.values()].filter((rec) => {
      if (
        check.anchors === false &&
        rec.kind === 'citation' &&
        rec.frontmatter.role === 'code'
      )
        return false;
      const text = `${rec.frontmatter.title ?? ''}\n${rec.body}`;
      const hits = gone.filter((path) => namesPath(text, path));
      for (const path of hits) named.add(path);
      return hits.length > 0;
    });
    const out = finish(graph, recs, check);
    if (check.report === 'paths') {
      const kept = new Set(list(out));
      const paths = gone.filter((path) =>
        recs.some(
          (rec) =>
            kept.has(graph.keyById.get(rec.id)) &&
            namesPath(`${rec.frontmatter.title ?? ''}\n${rec.body}`, path)
        )
      );
      return check.count ? paths.length : paths;
    }
    return out;
  },

  // One inner `check` on many refs: `refs` is "*" (every branch, the
  // default) or a list, and `main: true` adds main. `mode`: "union" (the
  // default; every key or value any ref gives, sorted), "table" ({ ref:
  // result }), "count" (the size of the union, for checks that give lists),
  // "every" (what every ref gives), or "refs" (the refs where it gives a
  // non-empty result). An inner check that reads git (trailer, refDiff,
  // staleAnchor and the rest) and names no `ref` gets this one.
  //
  // The one failure that is allowed is a ref that lacks a record the inner
  // check names by key: that ref gives null in a table, nothing to a union
  // or to "refs", and an empty set to "every", so it cannot drop out of the
  // intersection. Every other error fails the check, as does a ref that
  // does not exist.
  refAll(bed, _graph, effort, check, runCheck) {
    if (!check.check) throw new Error('refAll needs `check`');
    const mode = check.mode ?? 'union';
    if (!['union', 'table', 'count', 'every', 'refs'].includes(mode))
      throw new Error(`bad mode ${mode}`);
    const refs = [
      ...(check.main ? ['main'] : []),
      ...(check.refs === undefined || check.refs === '*'
        ? bed.branches()
        : list(check.refs)),
    ];
    if (!refs.length) throw new Error('refAll has no refs');
    for (const ref of refs)
      if (!bed.succeeds('rev-parse', '--verify', `${ref}^{commit}`))
        throw new Error(`refAll: no ref ${ref}`);
    const named = namedIds(bed.keymap, effort, check.check);
    const results = new Map();
    for (const ref of refs) {
      const graph = bed.graphAt(ref);
      if (named.some((id) => !graph.records.has(id))) {
        results.set(ref, null);
        continue;
      }
      // A bed check with no `ref` of its own runs on this one.
      const inner =
        'ref' in check.check ? check.check : { ...check.check, ref };
      results.set(ref, runCheck(graph, effort, inner));
    }
    if (mode === 'table') return Object.fromEntries(results);
    // "refs": the refs where the check gives something: a non-empty list,
    // true, or a number other than 0.
    if (mode === 'refs')
      return [...results]
        .filter(([, r]) =>
          Array.isArray(r) ? r.length > 0 : r !== null && r !== false && r !== 0
        )
        .map(([ref]) => ref)
        .sort();
    if (
      mode === 'count' &&
      [...results.values()].some((r) => r !== null && !Array.isArray(r))
    )
      throw new Error(
        'refAll count needs an inner check that gives a list; use table or every'
      );
    const sets = [...results.values()].map(
      (r) => new Set(r === null ? [] : list(r).map((v) => JSON.stringify(v)))
    );
    const keep =
      mode === 'every'
        ? [...sets[0]].filter((v) => sets.every((set) => set.has(v)))
        : [...new Set(sets.flatMap((set) => [...set]))];
    const out = sortValues(keep.map((v) => JSON.parse(v)));
    return mode === 'count' ? out.length : out;
  },
};

/**
 * What merging refs `a` and `b` would do to the graph, measured against
 * their merge base. A record's merged standing is the side that changed it;
 * when both changed it to different standings, it holds both. Reverse links
 * such as `superseded_by` are rebuilt from forward fields on either side.
 *
 * `kind`:
 * - "double-accept": question Issues with two or more accepted Decisions
 *   deriving from them;
 * - "double-supersede": records superseded by two or more different records;
 * - "state-differs": records whose standing each side changed, differently;
 * - "retracted-relied": records retracted on one side, and not the other,
 *   that a record still live after the merge derives from (never when one
 *   ref contains the other);
 * - "compaction-fork": the compaction heads of an Effort left with more than
 *   one.
 */
export function conflicts(bed, a, b, kind) {
  const base = bed.graphAt(bed.mergeBase(a, b));
  const sides = [bed.graphAt(a), bed.graphAt(b)];
  const ids = new Set(sides.flatMap((g) => [...g.records.keys()]));
  const merged = new Map();
  for (const id of ids) {
    const [ra, rb] = sides.map((g) => g.records.get(id));
    const r0 = base.records.get(id);
    const [sa, sb, s0] = [ra, rb, r0].map((rec) => rec && standing(rec));
    let standings;
    if (!ra || !rb) standings = [sa ?? sb];
    else if (sa === s0) standings = [sb];
    else if (sb === s0 || sa === sb) standings = [sa];
    else standings = [sa, sb];
    merged.set(id, { rec: ra ?? rb, sides: [ra, rb], standings });
  }
  const supersessors = new Map();
  for (const [id, { sides: both }] of merged)
    for (const rec of both)
      for (const target of list(rec?.frontmatter.supersedes)) {
        if (!supersessors.has(target)) supersessors.set(target, new Set());
        supersessors.get(target).add(id);
      }
  const recs = [...merged.values()];
  if (kind === 'state-differs')
    return recs.filter((m) => m.standings.length > 1).map((m) => m.rec);
  if (kind === 'double-supersede')
    return recs
      .filter((m) => (supersessors.get(m.rec.id)?.size ?? 0) > 1)
      .map((m) => m.rec);
  if (kind === 'double-accept')
    return recs
      .filter(
        (m) => m.rec.kind === 'issue' && m.rec.frontmatter.kind === 'question'
      )
      .filter(
        (q) =>
          recs.filter(
            (d) =>
              d.rec.kind === 'decision' &&
              d.standings.includes('accepted') &&
              list(d.rec.frontmatter.derives_from).includes(q.rec.id)
          ).length > 1
      )
      .map((m) => m.rec);
  if (kind === 'retracted-relied') {
    // When one ref already contains the other, nothing diverged.
    if (
      bed.succeeds('merge-base', '--is-ancestor', a, b) ||
      bed.succeeds('merge-base', '--is-ancestor', b, a)
    )
      return [];
    // A relying record counts only if it is still live after the merge.
    const liveAfterMerge = (r) =>
      r.standings.every((s) => isLiveStanding(r.rec.kind, s));
    const reliesOn = (r, id) =>
      r.sides.some((rec) => list(rec?.frontmatter.derives_from).includes(id));
    return recs
      .filter((m) =>
        [0, 1].some((side) => {
          const [mine, theirs] = [m.sides[side], m.sides[1 - side]];
          return (
            mine?.frontmatter.retracted === true &&
            theirs &&
            theirs.frontmatter.retracted !== true
          );
        })
      )
      .filter((m) =>
        recs.some((r) => liveAfterMerge(r) && reliesOn(r, m.rec.id))
      )
      .map((m) => m.rec);
  }
  if (kind === 'compaction-fork') {
    const heads = recs.filter(
      (m) =>
        isCompaction(m.rec) &&
        !m.standings.includes('retracted') &&
        !supersessors.has(m.rec.id)
    );
    const byEffort = new Map();
    for (const m of heads) {
      const effort = m.rec.frontmatter.effort;
      byEffort.set(effort, [...(byEffort.get(effort) ?? []), m.rec]);
    }
    return [...byEffort.values()].filter((group) => group.length > 1).flat();
  }
  throw new Error(`bad conflict kind ${kind}`);
}
