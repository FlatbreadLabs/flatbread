import { isLiveStanding, type ReadRecord } from '@flatbread/proof';
import {
  anchorText,
  codeAnchors,
  isCodeCitation,
  type CodeAnchor,
} from './anchors.js';
import { codeReferences, standingOf, type FindIndex } from './find.js';
import {
  CodeHistory,
  cutSubject,
  fateText,
  gitWord,
  symbolText,
  symbolWord,
  type AnchorStatus,
  type CommitAt,
  type LineChange,
} from './history.js';
import { restsOnDead } from './state.js';

/**
 * Whether a live Decision or Constraint should be read as suspect: the code
 * it rests on moved or changed after it was recorded, or it rests on a
 * record that is no longer live. It is suspect when any of these holds:
 *
 * 1. A code Citation tied to it is stale at HEAD (its path is gone, or its
 *    symbol is gone or renamed), by the history checks `--path` and the
 *    code notes use. Tied means it cites the Citation, the Citation cites,
 *    derives from, or is evidence for it, the Citation is within
 *    CHAIN_HOPS `derives_from`, `evidence`, or `cites` links of it, or its
 *    text names the Citation's symbol as code and it, or a record within
 *    those links, names the Citation's file.
 * 2. A code file its title or body names was deleted (history says so), or
 *    has at least `churnThreshold` of the lines it held at the commit that
 *    added the record rewritten or removed at HEAD (a tree diff between
 *    the two, so work merged from a branch counts too). Lines only added,
 *    a file that did not exist yet, a file that only moved, and docs
 *    (`.md`, `.txt`, …) never count. A bare name (`legacy.ts`) that HEAD
 *    lacks counts when history deleted exactly one file of that name.
 * 3. It rests on dead evidence: it derives from, cites, or gives as
 *    evidence a superseded, invalidated, rejected, or retracted record,
 *    other than one superseded by a live revision of itself (same kind and
 *    title).
 *
 * Every git read goes through one `CodeHistory`, so it is cached and
 * capped like the code notes; a check the budget cannot pay for says
 * nothing, and the result is then marked `partial`.
 */

/** Kinds a suspect check applies to. */
export const SUSPECT_KINDS: readonly string[] = ['decision', 'constraint'];
/** Links followed from a record to the code Citations its evidence holds. */
const CHAIN_HOPS = 2;
const CHAIN_RELATIONS = ['derives_from', 'evidence', 'cites'] as const;
/** Inbound links from a code Citation that tie it to the record. */
const INBOUND_LABELS = ['cited_by', 'derived_by', 'evidence_for'];
/** Anchors one check reads at HEAD, at most; linked ones first. */
const ANCHORS_CHECKED = 24;
/** Anchors read per Citation, as code notes read them. */
const ANCHORS_PER_CITATION = 2;
/** Files one record's text names that a check looks at, at most. */
const PATHS_PER_RECORD = 6;
/** Named paths HEAD lacks that one check asks history about, at most. */
const GONE_CHECKED = 6;
/** Record commits one check diffs against HEAD, at most. */
const DIFF_BASES = 16;
/** Revisions followed from a superseded record to a live one, at most. */
const REVISION_HOPS = 8;
/** Changed lines below which a named file never makes a record suspect. */
export const CHURN_MIN_LINES = 10;
/** Share of a file's lines at the record that must have changed. */
export const CHURN_SHARE = 0.25;
/** Changed lines that always count, however long the file. */
export const CHURN_CAP_LINES = 100;
const SUBJECTS_SHOWN = 3;
const DEAD_SHOWN = 3;
/** Named files that are prose, not code, which rule 2 leaves out. */
const DOC_FILE = /\.(?:md|mdx|markdown|txt|rst|adoc)$/i;
/**
 * A file name in prose, such as `package.json` or `vite.config.ts`, so its
 * dotted parts are not read as `.json` or `.config`. A name followed by
 * `(` is a call, not a file.
 */
const FILE_NAME =
  /(?<![\w$@./-])(?:[\w$@-]+\/)*[\w$@-]+(?:\.[\w$-]+)*\.(?:ts|tsx|js|jsx|mjs|cjs|json|jsonc|ya?ml|toml|md|mdx|css|scss|less|html|svg|xml|txt|lock|sh|py|rs|go|rb|java|kt|swift|c|h|cc|cpp|hpp|cs|sql|vue|svelte|glsl|hlsl|wgsl)(?![\w$(])/gi;

/**
 * Lines a named file must have had rewritten or removed since the record
 * for the record to be suspect, from the lines it had then. A one-line
 * fix, an import reordered, or a rename elsewhere in the file changes a
 * few lines and says nothing about the record; a quarter of the file
 * rewritten, or a hundred lines of a long one, is a change in structure
 * the record may not survive.
 */
export function churnThreshold(lines: number): number {
  return Math.max(
    CHURN_MIN_LINES,
    Math.min(CHURN_CAP_LINES, Math.ceil(lines * CHURN_SHARE))
  );
}

export interface SuspectReason {
  /** True for a reason about code; false for dead evidence. */
  readonly code: boolean;
  readonly text: string;
}

export interface Suspect {
  readonly id: string;
  readonly kind: string;
  readonly reasons: readonly SuspectReason[];
}

/**
 * Suspect records by id. `partial` is set when a cap or the git budget
 * stopped the check before it looked at everything, so a record missing
 * here may still be suspect; `proof get` checks one record on its own.
 */
export class SuspectMap extends Map<string, Suspect> {
  partial = false;
}

/** Whether a check behind `suspects` stopped short. */
export function suspectPartial(
  suspects: ReadonlyMap<string, Suspect> | undefined
): boolean {
  return suspects instanceof SuspectMap && suspects.partial;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** A live Decision or Constraint. */
export function suspectable(record: ReadRecord): boolean {
  return (
    SUSPECT_KINDS.includes(record.kind) &&
    record.frontmatter.retracted !== true &&
    isLiveStanding(record.kind, standingOf(record))
  );
}

/**
 * Whether `body` names `word` as code: as a whole word when it could only
 * be an identifier (camelCase, snake_case, a digit, or ALL_CAPS), and
 * otherwise only as `word(`, `.word`, `#word`, or in backticks, so a symbol
 * that is also an English word is not found in prose. The dotted parts of
 * a file name (`package.json`, `vite.config.ts`) are not `.word`.
 */
export function namesSymbol(body: string, word: string): boolean {
  if (word.length < 3) return false;
  const codeLike =
    /[a-z][A-Z]/.test(word) ||
    /[A-Za-z0-9]_[A-Za-z0-9]/.test(word) ||
    /[A-Za-z]\d/.test(word) ||
    /^[A-Z][A-Z0-9_]{3,}$/.test(word);
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (codeLike) return new RegExp(gitWord(word)).test(body);
  return new RegExp(
    `(?:(?<![\\w$])${escaped}\\(|[.#]${escaped}(?![\\w$])|\`${escaped}\`)`
  ).test(body.replace(FILE_NAME, ' '));
}

function anchorsOf(citation: ReadRecord): CodeAnchor[] {
  return codeAnchors(citation.body_excerpt).slice(0, ANCHORS_PER_CITATION);
}

function words(record: ReadRecord): string {
  return `${text(record.frontmatter.title)}\n${record.body_excerpt}`;
}

/** The records within CHAIN_HOPS `CHAIN_RELATIONS` links of `record`. */
function chain(record: ReadRecord, index: FindIndex): ReadRecord[] {
  const found: ReadRecord[] = [];
  let frontier = [record.id];
  const seen = new Set(frontier);
  for (let hop = 0; hop < CHAIN_HOPS && frontier.length; hop++) {
    const next: string[] = [];
    for (const id of frontier)
      for (const relation of CHAIN_RELATIONS)
        for (const target of index.records.get(id)?.relations[relation] ?? []) {
          if (seen.has(target)) continue;
          seen.add(target);
          const one = index.records.get(target);
          if (one) found.push(one);
          next.push(target);
        }
    frontier = next;
  }
  return found;
}

/** The code Citations a record's links tie it to, nearest first. */
function linkedCitations(
  record: ReadRecord,
  index: FindIndex,
  linked: readonly ReadRecord[]
): ReadRecord[] {
  const found = new Map<string, ReadRecord>();
  const add = (one: ReadRecord | undefined) => {
    if (one && isCodeCitation(one) && one.frontmatter.retracted !== true)
      found.set(one.id, one);
  };
  const inbound = index.inbound.get(record.id);
  for (const label of INBOUND_LABELS)
    for (const id of inbound?.get(label) ?? []) add(index.records.get(id));
  for (const one of linked) add(one);
  return [...found.values()];
}

/** Files a text names, as written. */
function namedFiles(value: string): string[] {
  return codeReferences(value)
    .filter(
      (ref) =>
        /\.[\w-]+$/.test(ref) &&
        !ref.endsWith('()') &&
        !ref.startsWith('#') &&
        !ref.includes('..') &&
        !/^[a-z]+:/i.test(ref)
    )
    .map((ref) => ref.replace(/^\.\//, ''));
}

/** Whether one of `refs` stands for `path`: it, or the end of it. */
function namesFile(refs: readonly string[], path: string): boolean {
  return refs.some((ref) => path === ref || path.endsWith(`/${ref}`));
}

/**
 * The files at HEAD a named path may stand for: itself, or else every file
 * whose path ends with it (`keys/keymap.ts` for `src/keys/keymap.ts`).
 */
function filesFor(
  named: string,
  files: readonly string[],
  set: ReadonlySet<string>
): string[] {
  if (set.has(named)) return [named];
  return files.filter((file) => file.endsWith(`/${named}`));
}

/**
 * What a stale anchor's history says, as `path: …`; undefined for an
 * anchor whose path and symbol hold at HEAD.
 */
function staleClause(status: AnchorStatus): string | undefined {
  const { anchor } = status;
  const parts: string[] = [];
  let file = anchor.path;
  if (status.path === 'unknown') parts.push('not at HEAD or in its history');
  else if (status.path) {
    parts.push(`file ${fateText(status.path)}`);
    file = status.path.now ?? file;
  }
  if (status.symbol) parts.push(symbolText(status.symbol, file));
  return parts.length ? `${anchor.path}: ${parts.join('; ')}` : undefined;
}

/**
 * Whether a superseded record was replaced by a live revision of itself: a
 * chain of `superseded_by` links through records of its kind and title
 * that ends at a live one.
 */
function revised(
  record: ReadRecord,
  get: (id: string) => ReadRecord | undefined
): boolean {
  const title = text(record.frontmatter.title);
  let current = record;
  for (let hop = 0; hop < REVISION_HOPS; hop++) {
    if (standingOf(current) !== 'superseded') return false;
    const next = (current.relations.superseded_by ?? [])
      .map(get)
      .find(
        (one): one is ReadRecord =>
          one !== undefined &&
          one.kind === record.kind &&
          text(one.frontmatter.title) === title
      );
    if (!next) return false;
    if (
      next.frontmatter.retracted !== true &&
      isLiveStanding(next.kind, standingOf(next))
    )
      return true;
    current = next;
  }
  return false;
}

/**
 * The suspect records among `candidates`: live Decisions and Constraints
 * whose code moved or changed after they were recorded, or that rest on
 * dead evidence, with why. `index` gives every record and its inbound
 * links; without `history`, only dead evidence is checked.
 */
export async function findSuspects(
  candidates: readonly ReadRecord[],
  index: FindIndex,
  history: CodeHistory | undefined
): Promise<SuspectMap> {
  const found = new SuspectMap();
  const targets = [
    ...new Map(
      candidates.filter(suspectable).map((record) => [record.id, record])
    ).values(),
  ];
  const reasons = new Map<string, SuspectReason[]>(
    targets.map((record) => [record.id, []])
  );
  const push = (id: string, reason: SuspectReason) => {
    const list = reasons.get(id) as SuspectReason[];
    if (!list.some((one) => one.text === reason.text)) list.push(reason);
  };
  if (targets.length && history && (await history.head())) {
    // 1. Stale code Citations: linked ones, then ones the text names in a
    // file it, or its chain, names too.
    const tied = new Map<string, CodeAnchor[]>();
    const bySymbol = new Map<string, CodeAnchor[]>();
    for (const citation of index.records.values()) {
      if (!isCodeCitation(citation) || citation.frontmatter.retracted === true)
        continue;
      for (const anchor of anchorsOf(citation))
        if (anchor.symbol) {
          const word = symbolWord(anchor.symbol);
          if (!bySymbol.has(word)) bySymbol.set(word, []);
          (bySymbol.get(word) as CodeAnchor[]).push(anchor);
        }
    }
    const linkedAnchors: CodeAnchor[] = [];
    const namedAnchors: CodeAnchor[] = [];
    for (const record of targets) {
      const links = chain(record, index);
      const linked = linkedCitations(record, index, links).flatMap(anchorsOf);
      const body = words(record);
      const refs = [record, ...links].flatMap((one) => namedFiles(words(one)));
      const named: CodeAnchor[] = [];
      if (refs.length)
        for (const [word, anchors] of bySymbol)
          if (namesSymbol(body, word))
            for (const anchor of anchors)
              if (namesFile(refs, anchor.path)) named.push(anchor);
      tied.set(record.id, [...linked, ...named]);
      linkedAnchors.push(...linked);
      namedAnchors.push(...named);
    }
    const anchors = [
      ...new Map(
        [...linkedAnchors, ...namedAnchors].map((anchor) => [
          anchorText(anchor),
          anchor,
        ])
      ).values(),
    ];
    if (anchors.length > ANCHORS_CHECKED) found.partial = true;
    const statuses = await history.anchorStatuses(anchors, ANCHORS_CHECKED);
    for (const record of targets)
      for (const anchor of tied.get(record.id) ?? []) {
        const status = statuses.get(anchorText(anchor));
        const clause = status && staleClause(status);
        if (clause) push(record.id, { code: true, text: clause });
      }

    // 2. Code files the text names: deleted, or rewritten since.
    const files = (await history.headFiles()) ?? [];
    const fileSet = new Set(files);
    const proof = history.proofRoot ? `${history.proofRoot}/` : undefined;
    const inProof = (file: string) => !!proof && file.startsWith(proof);
    const resolved = new Map<string, string[]>();
    const gone = new Map<string, Set<string>>();
    const bare = new Map<string, Set<string>>();
    const addTo = (map: Map<string, Set<string>>, key: string, id: string) => {
      if (!map.has(key)) map.set(key, new Set());
      (map.get(key) as Set<string>).add(id);
    };
    for (const record of targets) {
      const list: string[] = [];
      for (const ref of namedFiles(words(record))
        .filter((ref) => !DOC_FILE.test(ref))
        .slice(0, PATHS_PER_RECORD)) {
        const matches = filesFor(ref, files, fileSet);
        if (matches.length === 1) {
          if (!inProof(matches[0]) && !list.includes(matches[0]))
            list.push(matches[0]);
        } else if (!matches.length)
          addTo(ref.includes('/') ? gone : bare, ref, record.id);
      }
      resolved.set(record.id, list);
    }
    // A bare name HEAD lacks counts when history deleted one such file.
    if (bare.size > GONE_CHECKED) found.partial = true;
    const deleted = await history.deletedPaths(
      [...bare.keys()].slice(0, GONE_CHECKED)
    );
    for (const [name, paths] of deleted) {
      const left = [...new Set(paths)].filter(
        (path) => !fileSet.has(path) && !inProof(path)
      );
      if (left.length === 1)
        for (const id of bare.get(name) ?? []) addTo(gone, left[0], id);
    }
    if (gone.size > GONE_CHECKED) found.partial = true;
    const fates = await history.pathFates([...gone.keys()], GONE_CHECKED);
    /** Named files that only moved, by record and HEAD path: the old path. */
    const moved = new Map<string, string>();
    for (const [path, fate] of fates)
      for (const id of gone.get(path) ?? [])
        if (fate.now && !fate.deleted) {
          if (inProof(fate.now)) continue;
          moved.set(`${id}\0${fate.now}`, path);
          const list = resolved.get(id) ?? [];
          if (!list.includes(fate.now)) list.push(fate.now);
          resolved.set(id, list);
        } else
          push(id, {
            code: true,
            text: `${path} is gone at HEAD: ${fateText(fate)}`,
          });
    // Lines each file had when the record was committed that HEAD has
    // rewritten or removed: one tree diff per record commit, so merged
    // branch work counts and lines only added never do.
    const added = await history.recordCommits();
    const byBase = new Map<string, ReadRecord[]>();
    for (const record of targets) {
      const commit = added.get(record.id);
      if (!commit || !resolved.get(record.id)?.length) continue;
      if (!byBase.has(commit.sha)) byBase.set(commit.sha, []);
      (byBase.get(commit.sha) as ReadRecord[]).push(record);
    }
    if (byBase.size > DIFF_BASES) found.partial = true;
    const allFiles = new Set<string>();
    const flagged: {
      id: string;
      file: string;
      from?: string;
      base: CommitAt;
      removed: number;
      then: number;
    }[] = [];
    const diffs = new Map<string, Map<string, LineChange> | undefined>();
    for (const [sha, records] of [...byBase].slice(0, DIFF_BASES)) {
      const paths = new Set<string>();
      for (const record of records)
        for (const file of resolved.get(record.id) ?? []) {
          paths.add(file);
          allFiles.add(file);
          const from = moved.get(`${record.id}\0${file}`);
          if (from) paths.add(from);
        }
      const diff = await history.diffStat(sha, [...paths]);
      if (!diff) found.partial = true;
      diffs.set(sha, diff);
    }
    const lines = allFiles.size
      ? await history.lineCounts([...allFiles])
      : new Map<string, number>();
    for (const [sha, records] of [...byBase].slice(0, DIFF_BASES))
      for (const record of records)
        for (const file of resolved.get(record.id) ?? []) {
          const change = diffs.get(sha)?.get(file);
          const size = lines.get(file);
          if (!change || size === undefined) continue;
          // Lines the file had at the record; none means it is new since.
          const then = size - change.added + change.deleted;
          if (then <= 0 || change.deleted < churnThreshold(then)) continue;
          flagged.push({
            id: record.id,
            file,
            from: moved.get(`${record.id}\0${file}`),
            base: added.get(record.id) as CommitAt,
            removed: change.deleted,
            then,
          });
        }
    // What decides a flag is read; the subjects below are only shown.
    if (history.capped || history.timedOut) found.partial = true;
    const commits = flagged.length
      ? await history.recentCommits(
          [
            ...new Set(
              flagged.flatMap((one) => [one.file, one.from ?? []].flat())
            ),
          ],
          Math.min(...flagged.map((one) => one.base.time))
        )
      : [];
    for (const one of flagged) {
      const after = (commits ?? []).filter(
        (commit) =>
          commit.sha !== one.base.sha &&
          commit.time > one.base.time &&
          (commit.files.includes(one.file) ||
            (!!one.from && commit.files.includes(one.from)))
      );
      const listed = after
        .slice(0, SUBJECTS_SHOWN)
        .map(
          (commit) =>
            `${commit.sha.slice(0, 7)} "${cutSubject(commit.subject, 50)}"`
        );
      const more = after.length - listed.length;
      push(one.id, {
        code: true,
        text: `${one.file}${one.from ? ` (moved from ${one.from})` : ''}: ${
          one.removed
        } of the ${
          one.then
        } lines it had when this was recorded are rewritten or removed (git diff ${one.base.sha.slice(
          0,
          7
        )} HEAD)${
          listed.length
            ? `; since then: ${listed.join(', ')}${
                more > 0 ? `, +${more} more` : ''
              }`
            : ''
        }`,
      });
    }
  }

  // 3. Dead evidence, less records a live revision of themselves replaced.
  const get = (id: string) => index.records.get(id);
  for (const record of targets) {
    const dead = restsOnDead(record, get).filter((id) => {
      const one = get(id);
      return !one || !revised(one, get);
    });
    if (!dead.length) continue;
    const shown = dead
      .slice(0, DEAD_SHOWN)
      .map((id) => `${id} (${standingOf(get(id) as ReadRecord)})`);
    push(record.id, {
      code: false,
      text: `it rests on ${shown.join(', ')}${
        dead.length > DEAD_SHOWN ? `, +${dead.length - DEAD_SHOWN} more` : ''
      }`,
    });
  }

  for (const record of targets) {
    const list = reasons.get(record.id) ?? [];
    if (list.length)
      found.set(record.id, {
        id: record.id,
        kind: record.kind,
        reasons: [
          ...list.filter((reason) => reason.code),
          ...list.filter((reason) => !reason.code),
        ],
      });
  }
  return found;
}

function kindWord(kind: string): string {
  return kind === 'constraint' ? 'Constraint' : 'Decision';
}

/**
 * The warning a read prints before a suspect record's body: what changed,
 * and that the code wins.
 */
export function suspectBanner(suspect: Suspect): string {
  const code = suspect.reasons.filter((reason) => reason.code);
  const dead = suspect.reasons.filter((reason) => !reason.code);
  const kind = kindWord(suspect.kind);
  if (!code.length)
    return `SUSPECT — this ${kind} rests on records that are no longer live: ${dead
      .map((reason) => reason.text.replace(/^it rests on /, ''))
      .join('; ')}. Check what replaced them before relying on it.`;
  return `SUSPECT — the code this ${kind} rests on changed after it was recorded: ${code
    .map((reason) => reason.text)
    .join('; ')}${
    dead.length ? `; also, ${dead.map((reason) => reason.text).join('; ')}` : ''
  }. Read the code first; where they disagree, the code is the current behaviour.`;
}

/** The short marker a listing prints after a suspect record's id. */
export function suspectMarker(suspect: Suspect): string {
  const code = suspect.reasons.some((reason) => reason.code);
  const dead = suspect.reasons.some((reason) => !reason.code);
  return `suspect: ${[code ? 'code changed' : '', dead ? 'dead evidence' : '']
    .filter(Boolean)
    .join(', ')}`;
}
