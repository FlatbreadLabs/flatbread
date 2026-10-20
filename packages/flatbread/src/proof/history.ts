import { execFile } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import {
  NO_FETCH_ARGS,
  NO_FETCH_ENV,
  anchorText,
  type CodeAlias,
  type CodeAnchor,
  type CodeTarget,
} from './anchors.js';

/**
 * What git history at HEAD says about code that Proof records name: the
 * earlier names of a file or folder, where a path that HEAD lacks went, the
 * commit that took a symbol out of a file, and the commits that touched an
 * anchored file since its sha. Code that is in the working tree but not yet
 * committed is never called stale. Every read is local (`NO_FETCH_ENV`,
 * `NO_FETCH_ARGS`), cached for the life of one `CodeHistory`, and capped by
 * a call budget; a check the budget cannot pay for is skipped and says
 * nothing. Pickaxe searches look at the last SYMBOL_SCAN_COMMITS commits.
 * The parsers and the note text are pure.
 */

/** One step of a path's history: `from` became `to` in commit `sha`. */
export interface PathMove {
  readonly from: string;
  readonly to: string;
  /** Short sha. */
  readonly sha: string;
  readonly subject: string;
  /** git saw a copy: `from` stayed, and `to` was split from it. */
  readonly copy?: true;
  /** `from` and `to` are folders. */
  readonly dir?: true;
  /** For an earlier folder move: the moves from `to` on to the target. */
  readonly after?: readonly PathMove[];
}

/** Where a path that HEAD lacks went. */
export interface PathFate {
  readonly path: string;
  /** Renames from `path` forward, oldest first; empty when it was deleted. */
  readonly moves: readonly PathMove[];
  /** The path HEAD has it at, after `moves`. */
  readonly now?: string;
  /** The commit that deleted it, or its last new name, with no rename. */
  readonly deleted?: { readonly sha: string; readonly subject: string };
}

/** A symbol that is no longer in a file at HEAD, and what became of it. */
export interface SymbolFate {
  readonly symbol: string;
  /** The commit that took its last whole-word use out of the file. */
  readonly sha?: string;
  readonly subject?: string;
  /** The identifier that replaced it on otherwise identical lines. */
  readonly renamed?: string;
  /** Other files that have it as a whole word at HEAD. */
  readonly elsewhere?: readonly string[];
}

/** A commit, short. */
export interface ShortCommit {
  readonly sha: string;
  readonly subject: string;
}

/** What HEAD says about one code anchor. */
export interface AnchorStatus {
  readonly anchor: CodeAnchor;
  /** The path is not at HEAD: where it went, if history knows. */
  readonly path?: PathFate | 'unknown';
  /** The symbol is not in the file at HEAD. */
  readonly symbol?: SymbolFate;
  /**
   * With a sha: the commits since it that touched the file, under any of
   * its names, newest first, at most SINCE_LISTED of `count`.
   */
  readonly since?: {
    readonly count: number;
    readonly commits: readonly ShortCommit[];
    /**
     * The sha is not in HEAD's history (a rebase or squash), and the file
     * at HEAD differs from the file at the sha.
     */
    readonly offHistory?: true;
  };
}

export const HISTORY_GIT_CALLS = 60;
const FOLLOW_RENAMES = 50;
const FOLDER_ADDS = 100;
const SINCE_MAX = 200;
const SINCE_LISTED = 3;
const MAX_HOPS = 4;
const SYMBOL_SCAN_COMMITS = 500;
const ELSEWHERE_SHOWN = 3;
/** Folder moves checked for how much of the old folder moved, at most. */
const FOLDER_CHECKS = 4;
/** Working-tree files read for a symbol, at most this many bytes. */
const DISK_READ_MAX = 4 * 1024 * 1024;

interface GitOutput {
  readonly code: number;
  readonly out: string;
}

function runGit(
  cwd: string,
  args: readonly string[],
  input?: string
): Promise<GitOutput | undefined> {
  return new Promise((resolveGit) => {
    const child = execFile(
      'git',
      [...NO_FETCH_ARGS, ...args],
      {
        cwd,
        env: { ...process.env, ...NO_FETCH_ENV },
        maxBuffer: 64 * 1024 * 1024,
        encoding: 'utf8',
      },
      (error, stdout) => {
        if (!error) return resolveGit({ code: 0, out: stdout });
        const code = (error as { code?: unknown }).code;
        resolveGit(
          typeof code === 'number' ? { code, out: stdout ?? '' } : undefined
        );
      }
    );
    if (input !== undefined) child.stdin?.end(input);
  });
}

/** An extended regex for `symbol` as a whole word. */
export function wordRegex(symbol: string): string {
  return `(^|[^A-Za-z0-9_$])${symbol.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  )}([^A-Za-z0-9_$]|$)`;
}

/** A JavaScript regex for `word` as `git grep -w` sees a whole word. */
export function gitWord(word: string): string {
  return `(?<![A-Za-z0-9_])${word.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  )}(?![A-Za-z0-9_])`;
}

/** The last part of a dotted symbol, which is what code spells out. */
export function symbolWord(symbol: string): string {
  return symbol.split('.').at(-1) ?? symbol;
}

/** `log --format=%x1e%h%x1f%s --name-status` entries. */
function entries(
  out: string
): { sha: string; subject: string; files: string[][] }[] {
  return out
    .split('\x1e')
    .filter((entry) => entry.trim())
    .map((entry) => {
      const [head, ...rest] = entry.split('\n');
      const [sha, subject = ''] = head.split('\x1f');
      return {
        sha: sha.trim(),
        subject,
        files: rest.filter(Boolean).map((line) => line.split('\t')),
      };
    });
}

/**
 * Former names from `git log --follow --diff-filter=RCA --name-status`,
 * newest first: each rename or copy whose new name is the path's name at
 * that point. The walk stops at the commit that added the name it has
 * reached, so a path reused after a move does not inherit the moved file's
 * history. A name the path had and has again is not a former name.
 */
export function parseFollow(out: string, path: string): PathMove[] {
  const moves: PathMove[] = [];
  const seen = new Set<string>([path]);
  let current = path;
  for (const { sha, subject, files } of entries(out))
    for (const [status, from, to] of files) {
      if (status?.startsWith('A') && from === current) return moves;
      if (/^[RC]/.test(status) && to === current && from && from !== to) {
        if (!seen.has(from))
          moves.push({
            from,
            to,
            sha,
            subject,
            ...(status.startsWith('C') ? { copy: true as const } : {}),
          });
        seen.add(from);
        current = from;
      }
    }
  return moves;
}

/**
 * The files a `-U0` diff adds a whole-word use of `word` to, by their new
 * names.
 */
export function filesAddingWord(diff: string, word: string): string[] {
  const files = new Set<string>();
  const regex = new RegExp(wordRegex(word));
  let file: string | undefined;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      file = line.startsWith('+++ b/') ? line.slice(6) : undefined;
      continue;
    }
    if (line.startsWith('+') && file && regex.test(line.slice(1)))
      files.add(file);
  }
  return [...files];
}

/**
 * The folder move a file move stands for: the two paths less their common
 * trailing segments, or undefined when only the file name changed.
 */
export function folderOf(
  from: string,
  to: string
): { from: string; to: string } | undefined {
  const a = from.split('/');
  const b = to.split('/');
  let same = 0;
  while (
    same < a.length - 1 &&
    same < b.length - 1 &&
    a[a.length - 1 - same] === b[b.length - 1 - same]
  )
    same++;
  if (!same) return undefined;
  return {
    from: a.slice(0, a.length - same).join('/'),
    to: b.slice(0, b.length - same).join('/'),
  };
}

/**
 * The identifier that replaced `symbol` in a `-U0` diff: a removed line that
 * uses it as a whole word and an added line that is the same but for that
 * word, everywhere it appears. The most common replacement wins. With
 * `reverse`, the identifier `symbol` replaced.
 */
export function renamedIdentifier(
  diff: string,
  symbol: string,
  reverse = false
): string | undefined {
  const removed: string[] = [];
  const added: string[] = [];
  for (const line of diff.split('\n')) {
    if (line.startsWith('---') || line.startsWith('+++')) continue;
    const body = line.slice(1).trim().replace(/\s+/g, ' ');
    if (line.startsWith('-')) removed.push(body);
    else if (line.startsWith('+')) added.push(body);
  }
  const [from, to] = reverse ? [added, removed] : [removed, added];
  const split = (text: string) => text.split(/([A-Za-z_$][\w$]*)/);
  const votes = new Map<string, number>();
  const word = new RegExp(wordRegex(symbol));
  for (const old of from) {
    if (!word.test(old)) continue;
    const before = split(old);
    for (const next of to) {
      const after = split(next);
      if (after.length !== before.length) continue;
      let replacement: string | undefined;
      let same = true;
      for (let i = 0; i < before.length && same; i++) {
        if (before[i] === after[i]) continue;
        if (
          i % 2 === 1 &&
          before[i] === symbol &&
          after[i] !== symbol &&
          (replacement === undefined || replacement === after[i])
        )
          replacement = after[i];
        else same = false;
      }
      if (same && replacement)
        votes.set(replacement, (votes.get(replacement) ?? 0) + 1);
    }
  }
  return [...votes].sort(
    (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)
  )[0]?.[0];
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

export function cutSubject(subject: string, max = 60): string {
  return subject.length > max ? `${subject.slice(0, max - 1)}…` : subject;
}

function commitText(commit: ShortCommit): string {
  return `${shortSha(commit.sha)} "${cutSubject(commit.subject)}"`;
}

/** `renamed to b in 1a2b3c4 "…", then to c in …`, for a path's moves. */
export function movesText(moves: readonly PathMove[]): string {
  return moves
    .slice(0, 2)
    .map(
      (move, i) =>
        `${i ? 'then ' : ''}${
          move.copy ? 'split into' : move.dir ? 'moved to' : 'renamed to'
        } ${move.to}${move.dir ? '/' : ''} in ${commitText(move)}`
    )
    .join(', ')
    .concat(moves.length > 2 ? `, then ${moves.length - 2} more moves` : '');
}

/** Where a gone path went, as a clause: `renamed to …` or `deleted in …`. */
export function fateText(fate: PathFate): string {
  const moved = fate.moves.length ? movesText(fate.moves) : '';
  const deleted = fate.deleted ? `deleted in ${commitText(fate.deleted)}` : '';
  return [moved, deleted].filter(Boolean).join(', then ') || 'not at HEAD';
}

/** What became of a symbol, as a clause. */
export function symbolText(fate: SymbolFate, file: string): string {
  const where = fate.sha ? ` in ${commitText(fate as ShortCommit)}` : '';
  if (fate.renamed) return `#${fate.symbol} renamed to ${fate.renamed}${where}`;
  if (fate.elsewhere?.length)
    return `#${fate.symbol} moved to ${fate.elsewhere.join(', ')}${
      fate.sha ? ` (out of ${file}${where})` : ''
    }`;
  return `#${fate.symbol} no longer in ${file}${
    fate.sha ? `; removed${where}` : ''
  }`;
}

/**
 * The line a card or digest prints for an anchor that no longer holds, or
 * undefined for one that does: path at HEAD, symbol in it, and, with a sha,
 * no commit since that touched the file.
 */
export function anchorNote(
  status: AnchorStatus,
  owner?: string
): string | undefined {
  const parts: string[] = [];
  const { anchor } = status;
  let file = anchor.path;
  if (status.path === 'unknown')
    parts.push(`${anchor.path} is not at HEAD or in its history`);
  else if (status.path) {
    parts.push(`file ${fateText(status.path)}`);
    file = status.path.now ?? file;
  }
  if (status.symbol) parts.push(symbolText(status.symbol, file));
  const named = new Set<string>();
  if (status.path && status.path !== 'unknown') {
    for (const move of status.path.moves) named.add(shortSha(move.sha));
    if (status.path.deleted) named.add(shortSha(status.path.deleted.sha));
  }
  if (status.symbol?.sha) named.add(shortSha(status.symbol.sha));
  if (status.since?.offHistory && anchor.sha)
    parts.push(
      `the file at HEAD differs from ${shortSha(
        anchor.sha
      )}, which is not in HEAD's history (rebased or squashed)`
    );
  else if (status.since?.count && anchor.sha) {
    const listed = status.since.commits
      .slice(0, SINCE_LISTED)
      .map((commit) =>
        named.has(shortSha(commit.sha))
          ? `${shortSha(commit.sha)} (above)`
          : commitText(commit)
      );
    const more = status.since.count - listed.length;
    parts.push(
      `${status.since.count}${status.since.count >= SINCE_MAX ? '+' : ''} ${
        status.since.count === 1 ? 'commit' : 'commits'
      } touched it since ${shortSha(anchor.sha)}: ${listed.join(', ')}${
        more > 0 ? `, +${more} more` : ''
      }`
    );
  }
  if (!parts.length) return undefined;
  const stale = Boolean(status.path || status.symbol);
  // `changed since:` reads oddly before a clause that is not a count.
  if (!stale && status.since?.offHistory)
    return `anchor ${owner ? `${owner} ` : ''}${anchorText(
      anchor
    )} changed: ${parts.join('; ')}`;
  return `anchor ${owner ? `${owner} ` : ''}${anchorText(anchor)}${
    stale ? ' is stale' : ' changed since'
  }: ${parts.join('; ')}`;
}

/** The line for a path a body names that HEAD lacks. */
export function pathNote(fate: PathFate, owner?: string): string {
  return `path ${fate.path}${
    owner ? ` (in ${owner})` : ''
  } is stale: ${fateText(fate)}`;
}

/**
 * Git history reads for one Proof read. Results are cached for the life of
 * the object, and at most `maxCalls` git commands run; past that, every
 * read answers as if git had nothing to say.
 */
export class CodeHistory {
  private calls = 0;
  private readonly memo = new Map<string, Promise<GitOutput | undefined>>();
  private readonly kinds = new Map<
    string,
    Promise<'file' | 'dir' | undefined>
  >();
  private readonly objects = new Map<string, Promise<string | undefined>>();
  private readonly disk = new Map<
    string,
    Promise<'file' | 'dir' | undefined>
  >();
  private readonly texts = new Map<string, Promise<string | undefined>>();
  private headSha?: Promise<string | undefined>;
  private windowBase?: Promise<string | undefined>;
  /** Set once a read was skipped because the call budget ran out. */
  capped = false;

  constructor(
    readonly top: string,
    /** The Proof folder, relative to `top`, which symbol searches skip. */
    readonly proofRoot = '',
    readonly maxCalls = HISTORY_GIT_CALLS
  ) {}

  /** Git commands this object has run. */
  get used(): number {
    return this.calls;
  }

  /**
   * Books `count` git commands that run elsewhere, such as trailer reads,
   * against the budget; false, and nothing booked, when they do not fit.
   */
  take(count: number): boolean {
    if (this.calls + count > this.maxCalls) {
      this.capped = true;
      return false;
    }
    this.calls += count;
    return true;
  }

  private run(
    args: readonly string[],
    input?: string
  ): Promise<GitOutput | undefined> {
    const key = JSON.stringify([args, input ?? null]);
    let result = this.memo.get(key);
    if (!result) {
      if (this.calls >= this.maxCalls) {
        this.capped = true;
        return Promise.resolve(undefined);
      }
      this.calls++;
      result = runGit(this.top, args, input);
      this.memo.set(key, result);
    }
    return result;
  }

  private async ok(
    args: readonly string[],
    input?: string
  ): Promise<string | undefined> {
    const result = await this.run(args, input);
    return result?.code === 0 ? result.out : undefined;
  }

  head(): Promise<string | undefined> {
    return (this.headSha ??= this.ok([
      'rev-parse',
      '--verify',
      '-q',
      'HEAD',
    ]).then((out) => out?.trim() || undefined));
  }

  /**
   * The commit SYMBOL_SCAN_COMMITS back from HEAD, which bounds every
   * pickaxe search; undefined when history is shorter.
   */
  private scanBase(): Promise<string | undefined> {
    return (this.windowBase ??= this.head().then(async (head) =>
      head
        ? (
            await this.ok([
              'rev-list',
              '--max-count=1',
              `--skip=${SYMBOL_SCAN_COMMITS}`,
              head,
            ])
          )?.trim() || undefined
        : undefined
    ));
  }

  /** What HEAD's tree holds at each path, in one `cat-file` call. */
  async kindsAtHead(
    paths: readonly string[]
  ): Promise<Map<string, 'file' | 'dir' | undefined>> {
    const wanted = [
      ...new Set(paths.filter((path) => path && !/[\n\0]/.test(path))),
    ].filter((path) => !this.kinds.has(path));
    if (wanted.length) {
      const read = this.head().then((head) =>
        head
          ? this.ok(
              ['cat-file', '--batch-check=%(objecttype)'],
              `${wanted.map((path) => `${head}:${path}`).join('\n')}\n`
            )
          : undefined
      );
      wanted.forEach((path, i) =>
        this.kinds.set(
          path,
          read.then((out) => {
            const type = out?.split('\n')[i]?.trim();
            return type === 'blob'
              ? 'file'
              : type === 'tree'
              ? 'dir'
              : undefined;
          })
        )
      );
    }
    const found = new Map<string, 'file' | 'dir' | undefined>();
    for (const path of paths)
      found.set(
        path,
        await (this.kinds.get(path) ?? Promise.resolve(undefined))
      );
    return found;
  }

  async kindAtHead(path: string): Promise<'file' | 'dir' | undefined> {
    return (await this.kindsAtHead([path])).get(path);
  }

  /**
   * The object names of revision specs such as `<sha>^{commit}` or
   * `<sha>:<path>`, in one `cat-file` call; undefined for one git lacks.
   */
  async objectNames(
    specs: readonly string[]
  ): Promise<Map<string, string | undefined>> {
    const wanted = [
      ...new Set(specs.filter((spec) => spec && !/[\n\0]/.test(spec))),
    ].filter((spec) => !this.objects.has(spec));
    if (wanted.length) {
      const read = this.ok(
        ['cat-file', '--batch-check=%(objectname)'],
        `${wanted.join('\n')}\n`
      );
      wanted.forEach((spec, i) =>
        this.objects.set(
          spec,
          read.then((out) => {
            const name = out?.split('\n')[i]?.trim();
            return name && /^[0-9a-f]{40,64}$/.test(name) ? name : undefined;
          })
        )
      );
    }
    const found = new Map<string, string | undefined>();
    for (const spec of specs)
      found.set(
        spec,
        await (this.objects.get(spec) ?? Promise.resolve(undefined))
      );
    return found;
  }

  /** Whether `ancestor` is in `of`'s history; undefined when git cannot say. */
  async isAncestor(ancestor: string, of: string): Promise<boolean | undefined> {
    const result = await this.run([
      'merge-base',
      '--is-ancestor',
      ancestor,
      of,
    ]);
    return result?.code === 0 ? true : result?.code === 1 ? false : undefined;
  }

  /** A commit's committer time in ms; undefined when git cannot say. */
  async commitTime(sha: string): Promise<number | undefined> {
    const out = await this.ok(['show', '-s', '--format=%ct', sha, '--']);
    const seconds = Number(out?.trim());
    return out && Number.isFinite(seconds) ? seconds * 1000 : undefined;
  }

  /** What the working tree holds at a path. */
  diskKind(path: string): Promise<'file' | 'dir' | undefined> {
    let kind = this.disk.get(path);
    if (!kind) {
      kind = path.split('/').includes('..')
        ? Promise.resolve(undefined)
        : stat(join(this.top, path)).then(
            (info) =>
              info.isDirectory() ? 'dir' : info.isFile() ? 'file' : undefined,
            () => undefined
          );
      this.disk.set(path, kind);
    }
    return kind;
  }

  /** Whether the working tree's copy of a file uses `symbol` as a word. */
  async onDiskHas(path: string, symbol: string): Promise<boolean> {
    if ((await this.diskKind(path)) !== 'file') return false;
    let text = this.texts.get(path);
    if (!text) {
      text = stat(join(this.top, path))
        .then((info) =>
          info.size <= DISK_READ_MAX
            ? readFile(join(this.top, path), 'utf8')
            : undefined
        )
        .catch(() => undefined);
      this.texts.set(path, text);
    }
    const body = await text;
    return (
      body !== undefined && new RegExp(gitWord(symbolWord(symbol))).test(body)
    );
  }

  /**
   * Whether `word` is in any of `paths` at `rev`; undefined when git
   * cannot say.
   */
  async wordAt(
    rev: string,
    word: string,
    paths: readonly string[]
  ): Promise<boolean | undefined> {
    if (!paths.length) return false;
    const result = await this.run([
      'grep',
      '-q',
      '-I',
      '-w',
      '-F',
      '-e',
      word,
      rev,
      '--',
      ...paths,
    ]);
    return result?.code === 0 ? true : result?.code === 1 ? false : undefined;
  }

  /**
   * A file's or folder's former names at HEAD, newest first. A file
   * follows renames and splits (`git log --follow`) back to the commit
   * that added it; a copy that left its source untouched is not a former
   * name. A folder takes the renames into it from the commits that added
   * files under it, as file moves, plus a folder move when the old folder
   * is gone at HEAD and most of its files moved, followed back up to
   * MAX_HOPS folders. A path HEAD lacks has none.
   */
  async formerNames(path: string, dir: boolean): Promise<PathMove[]> {
    const head = await this.head();
    if (!head) return [];
    if ((await this.kindAtHead(path)) !== (dir ? 'dir' : 'file')) return [];
    if (dir) return this.folderNames(path, 0);
    const out = await this.ok([
      'log',
      '--follow',
      '-M',
      '--diff-filter=RCA',
      '--name-status',
      `--max-count=${FOLLOW_RENAMES}`,
      '--format=%x1e%h%x1f%s',
      head,
      '--',
      path,
    ]);
    const moves = out ? parseFollow(out, path) : [];
    // A copy is a split only if the same commit took lines out of the
    // source; a copy of a template or boilerplate is where the file began.
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      if (!move.copy) continue;
      const stat = await this.ok([
        'show',
        '--numstat',
        '--format=',
        move.sha,
        '--',
        move.from,
      ]);
      const removed = (stat ?? '')
        .split('\n')
        .some((line) => Number(line.split('\t')[1]) > 0);
      if (!removed) return moves.slice(0, i);
    }
    return moves;
  }

  private async folderNames(path: string, hop: number): Promise<PathMove[]> {
    const head = (await this.head()) as string;
    const adds = await this.ok([
      'log',
      '--diff-filter=A',
      `--max-count=${FOLDER_ADDS}`,
      '--format=%H',
      head,
      '--',
      `${path}/`,
    ]);
    const shas = (adds ?? '').split('\n').filter(Boolean);
    if (!shas.length) return [];
    const out = await this.ok([
      'log',
      '--no-walk=unsorted',
      '-M',
      '--diff-filter=R',
      '--name-status',
      '--format=%x1e%h%x1f%s',
      ...shas,
    ]);
    const files: PathMove[] = [];
    const folders = new Map<
      string,
      { move: PathMove; moved: number; first: string }
    >();
    for (const { sha, subject, files: lines } of entries(out ?? ''))
      for (const [status, from, to] of lines) {
        if (!status?.startsWith('R') || !from || !to) continue;
        if (!to.startsWith(`${path}/`) || from.startsWith(`${path}/`)) continue;
        if (!hop) files.push({ from, to, sha, subject });
        let folder = folderOf(from, to);
        // `a/x/f` to `b/a/x/f` strips to `a` and `b/a`; for target `b/a/x`,
        // the move is `a/x` to `b/a/x`.
        if (folder && path.startsWith(`${folder.to}/`)) {
          const extra = path.slice(folder.to.length);
          folder = from.startsWith(`${folder.from}${extra}/`)
            ? { from: `${folder.from}${extra}`, to: path }
            : undefined;
        }
        if (
          !folder ||
          !(folder.to === path || folder.to.startsWith(`${path}/`))
        )
          continue;
        const key = `${folder.from}\0${folder.to}`;
        const known = folders.get(key);
        // Entries come newest first, so the last one seen is the first move.
        if (known)
          folders.set(key, { ...known, moved: known.moved + 1, first: sha });
        else
          folders.set(key, {
            move: { ...folder, sha, subject, dir: true },
            moved: 1,
            first: sha,
          });
      }
    const gone = await this.kindsAtHead(
      [...folders.values()].map(({ move }) => move.from)
    );
    const moved: PathMove[] = [];
    let checks = 0;
    for (const { move, moved: count, first } of folders.values()) {
      if (gone.get(move.from) || move.from === path) continue;
      if (checks++ >= FOLDER_CHECKS) break;
      // Most of the old folder's files must have moved, or it was one file
      // moving out of a folder that went away for other reasons.
      const listed = await this.ok([
        'ls-tree',
        '-r',
        '--name-only',
        `${first}^`,
        '--',
        `${move.from}/`,
      ]);
      if (listed === undefined) continue;
      const total = listed.split('\n').filter(Boolean).length;
      if (count * 2 > total) moved.push(move);
    }
    const earlier: PathMove[] = [];
    if (hop + 1 < MAX_HOPS)
      for (const move of moved)
        for (const prior of await this.folderNames(move.from, hop + 1))
          if (prior.dir && prior.from !== path)
            earlier.push({
              ...prior,
              after: [...(prior.after ?? []), move],
            });
    return [...moved, ...earlier, ...files];
  }

  /**
   * Where a path HEAD lacks went: the commit that deleted it (or, for a
   * folder, a file under it), and whether that commit renamed it. With
   * `after`, the first deletion after that commit, so a later file at the
   * same path does not count; else the newest. Follows up to MAX_HOPS
   * renames. Undefined when HEAD's history never had the path.
   */
  async whereWent(path: string, after?: string): Promise<PathFate | undefined> {
    const head = await this.head();
    if (!head) return undefined;
    const moves: PathMove[] = [];
    let current = path;
    let since = after;
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      let deletion: string | undefined;
      if (since) {
        const list = await this.ok([
          'log',
          '--reverse',
          '--diff-filter=D',
          '--format=%H%x1f%s',
          `${since}..${head}`,
          '--',
          current,
        ]);
        deletion = list?.split('\n').find(Boolean);
      }
      if (deletion === undefined)
        deletion = await this.ok([
          'log',
          '-1',
          '--diff-filter=D',
          '--format=%H%x1f%s',
          head,
          '--',
          current,
        ]);
      const [sha, subject = ''] = (deletion ?? '').trim().split('\x1f');
      if (!sha) break;
      const out = await this.ok([
        'log',
        '--no-walk',
        '-M',
        '--diff-filter=R',
        '--name-status',
        '--format=%x1e%h%x1f%s',
        sha,
      ]);
      // Without the commit's renames, history cannot say it was a delete.
      if (out === undefined) break;
      const lines = entries(out).flatMap((entry) => entry.files);
      const exact = lines.find(([, from]) => from === current);
      let move: PathMove | undefined;
      if (exact) move = { from: current, to: exact[2], sha, subject };
      else {
        // A folder: the new folder most of its files moved to.
        const votes = new Map<string, number>();
        for (const [, from, to] of lines) {
          if (!from?.startsWith(`${current}/`) || !to) continue;
          const rest = from.slice(current.length);
          if (to.endsWith(rest)) {
            const folder = to.slice(0, to.length - rest.length);
            if (folder) votes.set(folder, (votes.get(folder) ?? 0) + 1);
          }
        }
        const best = [...votes].sort((a, b) => b[1] - a[1])[0]?.[0];
        if (best) move = { from: current, to: best, sha, subject, dir: true };
      }
      if (!move)
        return {
          path,
          moves,
          deleted: { sha, subject },
        };
      moves.push(move);
      if (await this.kindAtHead(move.to)) return { path, moves, now: move.to };
      current = move.to;
      since = sha;
    }
    return moves.length ? { path, moves } : undefined;
  }

  /**
   * Which `symbol` words each file has at HEAD, in one `git grep` call.
   * Keys are `path\0word`.
   */
  async symbolsAtHead(
    pairs: readonly { path: string; symbol: string }[]
  ): Promise<Set<string> | undefined> {
    const head = await this.head();
    if (!head || !pairs.length) return new Set();
    const words = [...new Set(pairs.map((pair) => symbolWord(pair.symbol)))];
    const paths = [...new Set(pairs.map((pair) => pair.path))];
    const result = await this.run([
      'grep',
      '-I',
      '-w',
      '-o',
      '-F',
      ...words.flatMap((word) => ['-e', word]),
      head,
      '--',
      ...paths,
    ]);
    if (!result || result.code > 1) return undefined;
    const found = new Set<string>();
    for (const line of result.out.split('\n')) {
      if (!line.startsWith(`${head}:`)) continue;
      const rest = line.slice(head.length + 1);
      const cut = rest.lastIndexOf(':');
      if (cut > 0) found.add(`${rest.slice(0, cut)}\0${rest.slice(cut + 1)}`);
    }
    return found;
  }

  /**
   * Whether a file has `symbol` as a word now: at HEAD (from `atHead`, or
   * one `git grep`) or in the working tree. Undefined when git cannot say
   * and the working tree lacks it.
   */
  async hasSymbolNow(
    path: string,
    symbol: string,
    atHead?: Promise<Set<string> | undefined>
  ): Promise<boolean | undefined> {
    const present = await (atHead ?? this.symbolsAtHead([{ path, symbol }]));
    if (present?.has(`${path}\0${symbolWord(symbol)}`)) return true;
    if (await this.onDiskHas(path, symbol)) return true;
    return present ? false : undefined;
  }

  /**
   * Whether the working tree, untracked files too, uses `symbol` as a word
   * outside the Proof folder.
   */
  async inWorkingTree(symbol: string): Promise<boolean> {
    const result = await this.run([
      'grep',
      '-q',
      '-I',
      '-w',
      '-F',
      '--untracked',
      '-e',
      symbolWord(symbol),
      '--',
      '.',
      ...(this.proofRoot ? [`:(exclude)${this.proofRoot}`] : []),
    ]);
    return result?.code === 0;
  }

  /** Files at HEAD outside the Proof folder that use `symbol` as a word. */
  async filesWithSymbol(symbol: string): Promise<string[] | undefined> {
    const head = await this.head();
    if (!head) return undefined;
    const result = await this.run([
      'grep',
      '-I',
      '-w',
      '-l',
      '-F',
      '-e',
      symbolWord(symbol),
      head,
      '--',
      '.',
      ...(this.proofRoot ? [`:(exclude)${this.proofRoot}`] : []),
    ]);
    if (!result || result.code > 1) return undefined;
    return result.out
      .split('\n')
      .filter((line) => line.startsWith(`${head}:`))
      .map((line) => line.slice(head.length + 1));
  }

  /**
   * Files among `candidates` that commit `sha` added a whole-word use of
   * `symbol` to: where code that left a file in that commit went.
   */
  async addedIn(
    sha: string,
    symbol: string,
    candidates: readonly string[]
  ): Promise<string[]> {
    if (!candidates.length) return [];
    const diff = await this.ok([
      'show',
      '-M',
      '-U0',
      '--format=',
      sha,
      '--',
      '.',
      ...(this.proofRoot ? [`:(exclude)${this.proofRoot}`] : []),
    ]);
    const added = new Set(filesAddingWord(diff ?? '', symbolWord(symbol)));
    return candidates.filter((file) => added.has(file));
  }

  /**
   * The newest commit after `from` (or in all of HEAD's history), within
   * the last SYMBOL_SCAN_COMMITS commits, that changed how often `symbol`
   * appears as a whole word in `paths` (all files when empty), and the
   * identifier that replaced it there, if one did. A file's names come in
   * `paths`, so a rename does not count as a removal. With `reverse`, the
   * oldest such commit, and the identifier `symbol` replaced.
   */
  async symbolChange(
    symbol: string,
    paths: readonly string[],
    from?: string,
    reverse = false
  ): Promise<{ sha: string; subject: string; renamed?: string } | undefined> {
    const head = await this.head();
    if (!head) return undefined;
    const base = await this.scanBase();
    const word = symbolWord(symbol);
    const scope = paths.length
      ? paths
      : ['.', ...(this.proofRoot ? [`:(exclude)${this.proofRoot}`] : [])];
    const out = await this.ok([
      'log',
      ...(reverse ? [] : ['-1']),
      '-M',
      '--format=%H%x1f%s',
      '--pickaxe-regex',
      `-S${wordRegex(word)}`,
      head,
      ...(from ? [`^${from}`] : []),
      ...(base ? [`^${base}`] : []),
      '--',
      ...scope,
    ]);
    const lines = (out ?? '').split('\n').filter(Boolean);
    // Newest first; the commit that introduced the name is the oldest.
    const [sha, subject = ''] =
      (reverse ? lines.at(-1) : lines[0])?.split('\x1f') ?? [];
    if (!sha) return undefined;
    const diff = await this.ok([
      'show',
      '-M',
      '-U0',
      '--format=',
      sha,
      '--',
      ...scope,
    ]);
    const renamed = diff ? renamedIdentifier(diff, word, reverse) : undefined;
    return { sha, subject, ...(renamed ? { renamed } : {}) };
  }

  /**
   * Commits since `sha` that touched any of `paths`, newest first; none
   * when the file at HEAD (`now`) is the file at the sha (`then`). A sha
   * HEAD's history lacks gives `offHistory` when the files differ.
   */
  async since(
    sha: string,
    then: string,
    now: string,
    paths: readonly string[]
  ): Promise<AnchorStatus['since']> {
    const head = await this.head();
    if (!head || !/^[0-9a-f]{4,40}$/.test(sha)) return undefined;
    const names = await this.objectNames([
      `${sha}^{commit}`,
      `${sha}:${then}`,
      `${head}:${now}`,
    ]);
    const commit = names.get(`${sha}^{commit}`);
    if (!commit) return undefined;
    const before = names.get(`${sha}:${then}`);
    const current = names.get(`${head}:${now}`);
    if (before && before === current) return undefined;
    const inHistory = await this.isAncestor(commit, head);
    if (inHistory === undefined) return undefined;
    if (!inHistory)
      return before && current
        ? { count: 0, commits: [], offHistory: true }
        : undefined;
    const out = await this.ok([
      'log',
      '-M',
      `--max-count=${SINCE_MAX}`,
      '--format=%H%x1f%s',
      `${commit}..${head}`,
      '--',
      ...paths,
    ]);
    if (out === undefined) return undefined;
    const commits = out
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [full, subject = ''] = line.split('\x1f');
        return { sha: full, subject };
      });
    return {
      count: commits.length,
      commits: commits.slice(0, SINCE_LISTED + 2),
    };
  }

  /**
   * Where a symbol that left `file` went: the files at HEAD outside
   * `names` that the commit which took it out added it to.
   */
  private async movedTo(
    word: string,
    sha: string | undefined,
    names: ReadonlySet<string>
  ): Promise<string[] | undefined> {
    if (!sha) return undefined;
    const users = (await this.filesWithSymbol(word))?.filter(
      (file) => !names.has(file)
    );
    if (!users?.length) return undefined;
    const moved = await this.addedIn(sha, word, users);
    return moved.length ? moved.slice(0, ELSEWHERE_SHOWN) : undefined;
  }

  /** What became of a symbol that `names` (a file's names) no longer have. */
  async symbolFate(
    symbol: string,
    names: ReadonlySet<string>,
    from?: string
  ): Promise<SymbolFate> {
    const word = symbolWord(symbol);
    const change = await this.symbolChange(word, [...names], from);
    const elsewhere = change?.renamed
      ? undefined
      : await this.movedTo(word, change?.sha, names);
    return {
      symbol,
      ...(change ? { sha: change.sha, subject: change.subject } : {}),
      ...(change?.renamed ? { renamed: change.renamed } : {}),
      ...(elsewhere?.length ? { elsewhere } : {}),
    };
  }

  /**
   * What HEAD says about an anchor: where its path went, whether its
   * symbol is still in the file, and the commits since its sha. A path or
   * symbol the working tree has is never stale.
   */
  async anchorStatus(
    anchor: CodeAnchor,
    symbols?: Promise<Set<string> | undefined>
  ): Promise<AnchorStatus> {
    const head = await this.head();
    if (!head) return { anchor };
    const kind = await this.kindAtHead(anchor.path);
    // Not committed yet: history has nothing to say about it.
    const disk = kind ? undefined : await this.diskKind(anchor.path);
    let now: string | undefined = anchor.path;
    let path: AnchorStatus['path'];
    const names = new Set<string>([anchor.path]);
    if (!kind && !disk) {
      const fate = await this.whereWent(anchor.path, anchor.sha);
      path = fate ?? (this.capped ? undefined : 'unknown');
      now = fate?.now;
      for (const move of fate?.moves ?? []) names.add(move.to);
      // Budget ran out before history could say: no claim either way.
      if (!fate && this.capped) return { anchor };
    }
    let symbol: SymbolFate | undefined;
    if (anchor.symbol && now && (kind ?? disk ?? 'file') === 'file') {
      const present = await this.hasSymbolNow(
        now,
        anchor.symbol,
        disk ? Promise.resolve(new Set()) : symbols
      );
      if (present === false)
        symbol = await this.symbolFate(anchor.symbol, names, anchor.sha);
    }
    const since =
      anchor.sha && now && !disk
        ? await this.since(anchor.sha, anchor.path, now, [...names])
        : undefined;
    return {
      anchor,
      ...(path ? { path } : {}),
      ...(symbol ? { symbol } : {}),
      ...(since?.count || since?.offHistory ? { since } : {}),
    };
  }

  /**
   * Statuses for several anchors, at most `max`, with one `cat-file` for
   * their paths, one for their shas, and one `git grep` for all of them.
   */
  async anchorStatuses(
    anchors: readonly CodeAnchor[],
    max = 8
  ): Promise<Map<string, AnchorStatus>> {
    const list = [
      ...new Map(anchors.map((a) => [anchorText(a), a])).values(),
    ].slice(0, max);
    const found = new Map<string, AnchorStatus>();
    const head = await this.head();
    if (!list.length || !head) return found;
    const kinds = await this.kindsAtHead(list.map((anchor) => anchor.path));
    await this.objectNames(
      list.flatMap((anchor) =>
        anchor.sha && kinds.get(anchor.path)
          ? [
              `${anchor.sha}^{commit}`,
              `${anchor.sha}:${anchor.path}`,
              `${head}:${anchor.path}`,
            ]
          : []
      )
    );
    const symbols = this.symbolsAtHead(
      list.flatMap((anchor) =>
        anchor.symbol && kinds.get(anchor.path) === 'file'
          ? [{ path: anchor.path, symbol: anchor.symbol }]
          : []
      )
    );
    const statuses = await Promise.all(
      list.map((anchor) =>
        this.anchorStatus(
          anchor,
          kinds.get(anchor.path) === 'file' ? symbols : undefined
        )
      )
    );
    for (const status of statuses) found.set(anchorText(status.anchor), status);
    return found;
  }

  /**
   * Where each path HEAD and the working tree lack went, for paths history
   * knows; at most `max`.
   */
  async pathFates(
    paths: readonly string[],
    max = 6
  ): Promise<Map<string, PathFate>> {
    const fates = new Map<string, PathFate>();
    const list = [...new Set(paths)];
    if (!list.length || !(await this.head())) return fates;
    const kinds = await this.kindsAtHead(list);
    const gone: string[] = [];
    for (const path of list)
      if (!kinds.get(path) && !(await this.diskKind(path))) gone.push(path);
    const checked = gone.slice(0, max);
    const found = await Promise.all(
      checked.map((path) => this.whereWent(path))
    );
    checked.forEach((path, i) => {
      const fate = found[i];
      if (fate && (fate.moves.length || fate.deleted)) fates.set(path, fate);
    });
    return fates;
  }
}

const ALIASES_MAX = 12;

interface PathOption {
  readonly path?: string;
  readonly dir: boolean;
  readonly file: boolean;
  readonly name: string;
  readonly how: string;
  readonly until?: string;
  readonly split?: true;
}
interface SymbolOption {
  readonly symbol?: string;
  readonly how: string;
}

/**
 * A `--path` target's aliases from git history at HEAD, and the notes that
 * say what history found:
 *
 * - a file at HEAD: its former names (renames and splits, `--follow`);
 * - a folder at HEAD: the folders and files renamed into it;
 * - a path HEAD lacks: the name it has now, if a rename took it there;
 * - a symbol: in a file, the name it had before a rename, or, when the
 *   file lacks it, the name a rename gave it; a bare symbol HEAD's code
 *   lacks, the name a rename in the last SYMBOL_SCAN_COMMITS commits gave
 *   it.
 *
 * Aliases pair each path name with each symbol name, at most ALIASES_MAX.
 */
export async function targetAliases(
  target: CodeTarget,
  history: CodeHistory
): Promise<{ aliases: CodeAlias[]; notes: string[] }> {
  const notes: string[] = [];
  const paths: PathOption[] = [];
  if (!(await history.head())) return { aliases: [], notes };
  let current: string | undefined = target.path;
  let currentKind: 'file' | 'dir' | undefined;
  if (target.path !== undefined && !target.absent) {
    const folder = target.dir && !target.file;
    currentKind = folder ? 'dir' : 'file';
    const moves = await history.formerNames(target.path, folder);
    if (folder) {
      const folders = moves.filter((move) => move.dir);
      for (const move of moves)
        if (
          move.dir ||
          !folders.some((other) => move.from.startsWith(`${other.from}/`))
        )
          paths.push({
            path: move.from,
            dir: Boolean(move.dir),
            file: !move.dir,
            name: `${move.from}${move.dir ? '/' : ''}`,
            how: movesText([move, ...(move.after ?? [])]),
            until: move.sha,
          });
    } else
      moves.forEach((move, i) => {
        const chain = moves.slice(0, i + 1).reverse();
        paths.push({
          path: move.from,
          dir: false,
          file: true,
          name: move.from,
          // Oldest first, from this name forward to the target.
          how: movesText(chain),
          until: move.sha,
          ...(chain.some((step) => step.copy) ? { split: true as const } : {}),
        });
      });
    if (paths.length)
      notes.push(
        `note: ${target.label.replace(/#.*$/, '')} has had other names: ${paths
          .slice(0, 2)
          .map((option) => `${option.name} (${option.how})`)
          .join('; ')}${
          paths.length > 2 ? `; +${paths.length - 2} more` : ''
        }. Records on those names are listed too.`
      );
  } else if (target.path !== undefined) {
    const fate = await history.whereWent(target.path);
    if (fate) {
      notes.push(
        `note: ${target.label.replace(/#.*$/, '')} is not at HEAD: ${fateText(
          fate
        )}.`
      );
      current = fate.now;
      currentKind = fate.now ? await history.kindAtHead(fate.now) : undefined;
      fate.moves.forEach((move, i) => {
        const now = move.to === fate.now;
        paths.push({
          path: move.to,
          dir: Boolean(move.dir) || (now && currentKind === 'dir'),
          file: !move.dir && !(now && currentKind === 'dir'),
          name: `${move.to}${move.dir ? '/' : ''}`,
          how: `${now ? 'its name at HEAD' : 'a later name'}: ${
            target.label
          } ${movesText(fate.moves.slice(0, i + 1))}`,
        });
      });
    }
  }
  const symbols: SymbolOption[] = [];
  if (target.symbol) {
    const word = symbolWord(target.symbol);
    const files = [
      ...new Set(
        [current, target.path, ...paths.map((option) => option.path)].filter(
          (path): path is string => Boolean(path)
        )
      ),
    ];
    if (target.path !== undefined && current && currentKind === 'file') {
      const present = await history.hasSymbolNow(current, target.symbol);
      if (present === false) {
        const fate = await history.symbolFate(target.symbol, new Set(files));
        if (fate.renamed && fate.sha)
          symbols.push({
            symbol: fate.renamed,
            how: `#${target.symbol} renamed to ${fate.renamed} in ${commitLine(
              fate as ShortCommit
            )}`,
          });
        notes.push(`note: ${symbolText(fate, current)}.`);
      } else if (present) {
        const intro = await history.symbolChange(word, files, undefined, true);
        // A rename only if the old name left the file and the new one was
        // not there before: a call site that swapped one function for
        // another, both still in the file, renamed nothing.
        if (
          intro?.renamed &&
          (await history.hasSymbolNow(current, intro.renamed)) === false &&
          (await history.wordAt(`${intro.sha}^`, word, files)) === false
        ) {
          symbols.push({
            symbol: intro.renamed,
            how: `#${intro.renamed} renamed to ${target.symbol} in ${commitLine(
              intro
            )}`,
          });
          notes.push(
            `note: #${target.symbol} was #${intro.renamed} until ${commitLine(
              intro
            )}; records on the old name are listed too.`
          );
        }
      }
    } else if (target.path === undefined) {
      const users = await history.filesWithSymbol(word);
      const change =
        users && !users.length && !(await history.inWorkingTree(word))
          ? await history.symbolChange(word, [])
          : undefined;
      if (change) {
        if (change.renamed)
          symbols.push({
            symbol: change.renamed,
            how: `${target.symbol} renamed to ${change.renamed} in ${commitLine(
              change
            )}`,
          });
        notes.push(
          `note: ${target.symbol} is not in the code at HEAD; ${
            change.renamed
              ? `renamed to ${change.renamed}`
              : 'its last use was removed'
          } in ${commitLine(change)}.`
        );
      }
    }
  }
  const own: PathOption = {
    ...(target.path !== undefined ? { path: target.path } : {}),
    dir: target.dir,
    file: target.file,
    name: target.label.replace(/#.*$/, ''),
    how: '',
  };
  const aliases: CodeAlias[] = [];
  for (const option of [own, ...paths])
    for (const symbol of [{ symbol: target.symbol, how: '' }, ...symbols]) {
      if (option === own && !symbol.how) continue;
      aliases.push({
        ...(option.path !== undefined ? { path: option.path } : {}),
        dir: option.dir,
        file: option.file,
        ...(symbol.symbol ? { symbol: symbol.symbol } : {}),
        name: `${option.name}${symbol.symbol ? `#${symbol.symbol}` : ''}`,
        how: [option.how, symbol.how].filter(Boolean).join('; '),
        ...(option.until ? { until: option.until } : {}),
        ...(option.split ? { split: true as const } : {}),
      });
    }
  return { aliases: aliases.slice(0, ALIASES_MAX), notes };
}

function commitLine(commit: ShortCommit): string {
  return commitText(commit);
}
