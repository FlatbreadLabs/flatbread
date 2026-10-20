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
// | `changedPaths` | `ref`, `under`, `count`                                 | code files a branch changes                    |
// | `conflicts`    | `refs` (two), `kind`, `kinds`, `count`                  | records in that conflict if both refs merged   |
//
// `ref` defaults to main; `"*"` means every branch but main. A graph on a
// ref is written out with `git archive` into a temporary folder and read
// like any other. Branch records have keys in the key map like main's, and
// a key whose record is missing on a ref fails the check that names it.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isCompaction, isLiveStanding } from '@flatbread/proof';
import { headRecord, matches, readGraph, standing } from './graph.mjs';
import { specAnchors, specCommits } from '../spec/repo.mjs';

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
  return bed;
}

/** Commits on `ref` that touch `path`, newest first. */
function commitsTouching(bed, ref, path, symbol) {
  const argv = ['log', '--format=%H', ref];
  if (symbol) argv.push(`-S${symbol}`);
  const out = bed.git(...argv, '--', path);
  return out ? out.split('\n') : [];
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
  // spec/repo.mjs declares, and git must agree with it: the commit exists on
  // the ref, touches the file, and the file holds the symbol at that commit.
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
        !spec ||
        spec.path !== path ||
        spec.symbol !== symbol ||
        !bed.commitSha.get(spec.commit)?.startsWith(abbrev)
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
  // since it left main, under the folder `under`.
  changedPaths(bed, _graph, _effort, check) {
    const refs = check.ref === '*' ? bed.branches() : [check.ref];
    const paths = new Set();
    for (const ref of refs) {
      const out = bed.git(
        'diff',
        '--name-only',
        bed.mergeBase('main', ref),
        ref,
        '--',
        check.under ?? '.'
      );
      for (const path of out ? out.split('\n') : [])
        if (!under(path, '.flatbread-proof')) paths.add(path);
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
