import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { ProofReadValidationError, type ReadRecord } from '@flatbread/proof';
import type { FindIndex, FindVia } from './find.js';

/**
 * `proof find --path`: the records that govern a piece of code. Three
 * sources tie a record to code, strongest first:
 *
 * - a Citation with `role: code` whose body names the code as
 *   `<path>#<symbol>@<sha>` or `<path>`. The records that cite it govern
 *   the code, and so do the records it derives from. A code Citation that
 *   nothing cites stands for itself.
 * - a git commit that touches the path and carries `Proof: <id>` trailers.
 * - a record body that names the path, or the symbol, exactly.
 *
 * Everything here but the git read is a pure function of its inputs.
 */

export const STRENGTH = { citation: 3, trailer: 2, text: 1 } as const;

/** What `--path` names: a file, a folder, a symbol, or a file and a symbol. */
export interface CodeTarget {
  /** Repository-relative, with `/` separators and no leading `./`. */
  readonly path?: string;
  /** Whether files under `path` count. */
  readonly dir: boolean;
  /** Whether `path` itself counts: false for a folder that exists. */
  readonly file: boolean;
  readonly symbol?: string;
  /** As the card header prints it. */
  readonly label: string;
  /** `path` is not in the working tree. */
  readonly absent?: true;
}

/** One code reference in a code Citation's body. */
export interface CodeAnchor {
  readonly path: string;
  readonly symbol?: string;
  readonly sha?: string;
}

const CODE_EXTENSION =
  /\.(?:ts|tsx|js|jsx|mjs|cjs|rs|go|py|rb|java|kt|swift|c|h|cc|cpp|hpp|cs|json|ya?ml|toml|md|css|scss|html|sql|sh|glsl|hlsl|wgsl|vue|svelte)$/i;
const IDENTIFIER = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;
/**
 * `<path>`, `<path>#<symbol>`, `<path>@<sha>`, or `<path>#<symbol>@<sha>`.
 * A path starts after a space or opening punctuation, so the middle of a URL
 * never matches.
 */
const ANCHOR =
  /(?<![\w./:-])((?:\.\/)?(?:[\w.-]+\/)*[\w.-]+)(?:#([A-Za-z_$][\w$.]*))?(?:@([0-9a-f]{7,40}))?(?![\w/])/g;

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clean(path: string): string {
  return (
    path
      .replace(/\\/g, '/')
      .replace(/^(?:\.\/)+/, '')
      .replace(/^\/+/, '')
      // A sentence's full stop after a path is not part of it.
      .replace(/[/.]+$/, '')
  );
}

/** True for text that reads as a path: it has a folder or a code extension. */
function pathLike(text: string): boolean {
  return text.includes('/') || CODE_EXTENSION.test(text);
}

/** Whether a ref's tree holds a repository-relative path, and as what. */
export type RefTreeLookup = (
  path: string
) => Promise<'file' | 'dir' | undefined>;

/**
 * Reads a `--path` value. `file#symbol` names both. A value that exists on
 * disk relative to `cwd`, or else relative to `repoRoot`, is that file or
 * folder, made relative to `repoRoot`. A value on neither is `absent`; with
 * `inRefs`, a ref's tree that holds it, read from `cwd` or from
 * `repoRoot`, says whether it is a file or a folder. Otherwise a bare
 * identifier, or one ending in `()`, names a symbol, and anything else is a
 * path already relative to `repoRoot`, matched as a file and as a folder.
 */
export async function parseCodeTarget(
  value: string,
  cwd: string,
  repoRoot: string,
  inRefs?: RefTreeLookup
): Promise<CodeTarget> {
  const raw = value.trim();
  const hash = raw.indexOf('#');
  const pathPart = hash >= 0 ? raw.slice(0, hash) : raw;
  const symbolPart =
    hash >= 0 ? raw.slice(hash + 1).replace(/\(\)$/, '') : undefined;
  if (!pathPart && symbolPart)
    return { dir: false, file: false, symbol: symbolPart, label: raw };
  const absolute = isAbsolute(pathPart) ? pathPart : resolve(cwd, pathPart);
  const fromRoot = relative(repoRoot, absolute).split(sep).join('/');
  const inRepo = !fromRoot.startsWith('..') && !isAbsolute(fromRoot);
  const asGiven = clean(pathPart);
  const atCwd = await stat(absolute).catch(() => null);
  const info =
    atCwd ??
    (asGiven && !isAbsolute(pathPart)
      ? await stat(resolve(repoRoot, asGiven)).catch(() => null)
      : null);
  let inRef: { path: string; kind: 'file' | 'dir' } | undefined;
  if (!info && inRefs)
    for (const candidate of new Set([inRepo ? clean(fromRoot) : '', asGiven]))
      if (candidate && !candidate.includes('..')) {
        const kind = await inRefs(candidate);
        if (kind) {
          inRef = { path: candidate, kind };
          break;
        }
      }
  if (
    !info &&
    !inRef &&
    hash < 0 &&
    (raw.endsWith('()') || (!pathLike(raw) && IDENTIFIER.test(raw)))
  )
    return {
      dir: false,
      file: false,
      symbol: raw.replace(/\(\)$/, ''),
      label: raw,
    };
  const path = inRef?.path ?? clean(atCwd && inRepo ? fromRoot : pathPart);
  if (!path)
    throw new ProofReadValidationError(
      'PROOF_INVALID_ARGUMENT',
      `--path ${raw} names the whole repository; give a file, folder, or symbol below its root`
    );
  const dir = info ? info.isDirectory() : inRef ? inRef.kind === 'dir' : true;
  const file = info
    ? !info.isDirectory()
    : inRef
    ? inRef.kind === 'file'
    : !pathPart.endsWith('/');
  return {
    path,
    dir,
    file,
    ...(symbolPart ? { symbol: symbolPart } : {}),
    label: `${path}${dir && !file ? '/' : ''}${
      symbolPart ? `#${symbolPart}` : ''
    }`,
    ...(info ? {} : { absent: true as const }),
  };
}

/** Code references in a code Citation's body, in order, each once. */
export function codeAnchors(body: string): CodeAnchor[] {
  const anchors: CodeAnchor[] = [];
  const seen = new Set<string>();
  for (const match of body.matchAll(ANCHOR)) {
    const path = clean(match[1]);
    if (!pathLike(path) || path.includes('..')) continue;
    const key = `${path}#${match[2] ?? ''}@${match[3] ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    anchors.push({
      path,
      ...(match[2] ? { symbol: match[2] } : {}),
      ...(match[3] ? { sha: match[3] } : {}),
    });
  }
  return anchors;
}

function pathMatches(path: string, target: CodeTarget): boolean {
  if (target.path === undefined) return false;
  return (
    (target.file && path === target.path) ||
    (target.dir && path.startsWith(`${target.path}/`))
  );
}

/**
 * Whether an anchor names the target. A file anchor with no symbol covers
 * every symbol in the file; a bare symbol target matches `#symbol` in any
 * file.
 */
export function anchorMatches(anchor: CodeAnchor, target: CodeTarget): boolean {
  if (target.path === undefined) return anchor.symbol === target.symbol;
  return (
    pathMatches(anchor.path, target) &&
    (!target.symbol || !anchor.symbol || anchor.symbol === target.symbol)
  );
}

export function anchorText(anchor: CodeAnchor): string {
  return `${anchor.path}${anchor.symbol ? `#${anchor.symbol}` : ''}${
    anchor.sha ? `@${anchor.sha.slice(0, 7)}` : ''
  }`;
}

/**
 * Whether a body names the target exactly. A path must stand as a whole
 * token: `src/a.ts` does not name `src/a.tsx`. A symbol is named as
 * `symbol(`, `obj.symbol(`, or `#symbol`. A file and a symbol need both.
 */
export function namesTarget(body: string, target: CodeTarget): boolean {
  const symbol = target.symbol
    ? new RegExp(
        `(?:(?<![\\w$])${escape(target.symbol)}\\(|#${escape(
          target.symbol
        )}(?![\\w$]))`
      ).test(body)
    : true;
  if (target.path === undefined) return symbol;
  const before = '(?<![\\w./-])(?:\\./)?';
  const file =
    target.file &&
    new RegExp(`${before}${escape(target.path)}(?![\\w/-]|\\.\\w)`).test(body);
  const under =
    target.dir &&
    new RegExp(`${before}${escape(target.path)}/[\\w.-]`).test(body);
  return Boolean(file || under) && symbol;
}

function isCodeCitation(record: ReadRecord): boolean {
  return (
    record.kind === 'citation' &&
    String(record.frontmatter.role ?? '').toLowerCase() === 'code'
  );
}

/** A commit's `Proof:` trailer ids, with the commit's short sha and subject. */
export interface TrailerCommit {
  readonly sha: string;
  readonly subject: string;
  readonly ids: readonly string[];
}

/**
 * The records that govern `target`, each with its ties. `usable` says
 * whether a code Citation may count: the caller leaves out retracted ones
 * unless the query asks for them. Trailer ids missing from the index are
 * skipped.
 */
export function governingRecords(
  index: FindIndex,
  target: CodeTarget,
  commits: readonly TrailerCommit[],
  usable: (record: ReadRecord) => boolean
): Map<string, FindVia[]> {
  const governed = new Map<string, FindVia[]>();
  const add = (record: string, strength: number, text: string) => {
    if (!index.records.has(record)) return;
    if (!governed.has(record)) governed.set(record, []);
    (governed.get(record) as FindVia[]).push({ strength, record, text });
  };
  for (const record of index.records.values()) {
    if (record.kind === 'effort') continue;
    if (isCodeCitation(record)) {
      if (!usable(record)) continue;
      const anchors = codeAnchors(record.body_excerpt).filter((anchor) =>
        anchorMatches(anchor, target)
      );
      if (!anchors.length) continue;
      const named = anchors.slice(0, 2).map(anchorText).join(', ');
      const citers =
        index.inbound.get(record.id)?.get('cited_by') ?? ([] as string[]);
      const causes = record.relations.derives_from ?? [];
      for (const id of citers)
        add(id, STRENGTH.citation, `cites ${record.id}: ${named}`);
      for (const id of causes)
        add(id, STRENGTH.citation, `${record.id} derives from it: ${named}`);
      if (!citers.length && !causes.length)
        add(record.id, STRENGTH.citation, `code citation: ${named}`);
    } else if (namesTarget(record.body_excerpt, target))
      add(record.id, STRENGTH.text, `body names ${target.label}`);
  }
  for (const commit of commits)
    for (const id of commit.ids)
      add(
        id,
        STRENGTH.trailer,
        `commit ${commit.sha.slice(0, 7)} "${
          commit.subject.length > 50
            ? `${commit.subject.slice(0, 49)}…`
            : commit.subject
        }"`
      );
  return governed;
}

/**
 * Keeps every git read local. In a partial clone, git fetches a missing
 * object from the promisor remote on first use; GIT_NO_LAZY_FETCH stops
 * that on git 2.44 and later (and on builds that carry the change), and
 * `protocol.allow=never` refuses every transport on older ones.
 */
export const NO_FETCH_ENV = { GIT_NO_LAZY_FETCH: '1' } as const;
export const NO_FETCH_ARGS = ['-c', 'protocol.allow=never'] as const;

/** Runs git in `cwd`; resolves to stdout, or undefined when git fails. */
export function git(
  cwd: string,
  args: readonly string[],
  input?: string
): Promise<string | undefined> {
  return new Promise((resolveGit) => {
    const child = execFile(
      'git',
      [...NO_FETCH_ARGS, ...args],
      {
        cwd,
        env: { ...process.env, ...NO_FETCH_ENV },
        maxBuffer: 512 * 1024 * 1024,
        encoding: 'utf8',
      },
      (error, stdout) => resolveGit(error ? undefined : stdout)
    );
    if (input !== undefined) child.stdin?.end(input);
  });
}

const trailerCache = new Map<string, TrailerCommit[]>();

/**
 * Commits reachable from `revs` that touch `path` and carry `Proof:`
 * trailers, newest first. One trailer may list several ids, split on commas
 * or spaces. Cached by the resolved commit shas and the path, so a moved
 * branch reads again.
 */
export async function trailerCommits(
  repoRoot: string,
  revs: readonly string[],
  path: string
): Promise<TrailerCommit[]> {
  // Names such as HEAD move, so the key holds the commits they name now.
  const shas = (await git(repoRoot, ['rev-parse', ...revs]))
    ?.split('\n')
    .filter(Boolean);
  if (!shas?.length) return [];
  const key = `${repoRoot}\0${shas.join(',')}\0${path}`;
  const cached = trailerCache.get(key);
  if (cached) return cached;
  const out = await git(repoRoot, [
    'log',
    '--format=%x1e%H%x1f%s%x1f%(trailers:key=Proof,valueonly,separator=%x2c)',
    ...shas,
    '--',
    path || '.',
  ]);
  const commits: TrailerCommit[] = [];
  for (const entry of (out ?? '').split('\x1e')) {
    const [sha, subject, trailers] = entry.split('\x1f');
    if (!sha || !trailers?.trim()) continue;
    const ids = trailers
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length) commits.push({ sha: sha.trim(), subject, ids });
  }
  if (trailerCache.size > 64) trailerCache.clear();
  trailerCache.set(key, commits);
  return commits;
}
