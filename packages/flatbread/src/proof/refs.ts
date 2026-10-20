import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, realpath, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import {
  isCompaction,
  parseDocument,
  ProofReadValidationError,
  type PrimitiveKind,
  type ReadRecord,
  type ReadRelation,
} from '@flatbread/proof';
import { standingOf } from './find.js';
import { git, NO_FETCH_ARGS, NO_FETCH_ENV } from './anchors.js';

/**
 * `proof find --refs`: records from other git refs, read without a checkout.
 * Each ref's Proof folder is listed with `git ls-tree` and read with
 * `git cat-file --batch`. A ref counts only for the records it changed since
 * its merge base with HEAD, so a branch that is merely behind the working
 * tree adds nothing and reports no conflicts. A version already in HEAD's
 * history does not count either, so a branch that was squash-merged and
 * left behind adds nothing.
 *
 * The combined graph takes each record from the working tree when it is
 * there, else from the first ref that has it. Supersession and
 * invalidation are rebuilt from the forward edges (`supersedes`,
 * `invalidates`) of every version on every side; the stored reverse fields
 * (`superseded_by`, `invalidated_by`) on either side are ignored. An
 * Issue's `resolved_by` is the union over every version, so a Decision that
 * resolves a question only on a branch still lists it. The other reverse
 * links a card lists (rejects, cited_by, ...) are built by the `find` index
 * from the combined records.
 *
 * No git command here fetches. In a partial clone, a record whose blob is
 * not on disk is left out and counted on the refs line.
 */

/** Most refs `--refs all` overlays: the newest that change Proof records. */
export const REFS_ALL_LIMIT = 12;
/** Most refs `--refs all` looks at, newest commit first. */
export const REFS_ALL_EXAMINED = 50;
export const CONFLICTS_SHOWN = 12;
const BASE = 'base';

export interface PullRequest {
  readonly number: number;
  readonly headRefName: string;
  readonly isDraft: boolean;
  readonly author: string;
}

/** One ref, as the overlay reads it. */
export interface RefSide {
  /** The ref as given, or its short name for `all`. */
  readonly name: string;
  readonly sha: string;
  /** Every record id in the ref's Proof folder. */
  readonly ids: ReadonlySet<string>;
  /**
   * The versions the ref changed since its merge base with HEAD, leaving
   * out versions already in HEAD's history.
   */
  readonly changed: ReadonlyMap<string, ReadRecord>;
  /** The ids the working tree changed or added since that merge base. */
  readonly baseChanged: ReadonlySet<string>;
  /** Of `changed`, the ids whose version is byte for byte the working tree's. */
  readonly sameAsBase: ReadonlySet<string>;
  /**
   * Of `changed`, the ids whose version here is an older one of another
   * ref's, such as `origin/feat/x` behind `feat/x`, or a branch that a
   * stacked branch builds on. They make no tag, proposal, or conflict.
   */
  readonly older?: ReadonlySet<string>;
  /** Record ids the ref deleted since its merge base with HEAD. */
  readonly deleted?: ReadonlySet<string>;
  /** No merge base with HEAD was found, as in a shallow clone. */
  readonly noMergeBase?: true;
  /** Changed records whose blob is not on disk (a partial clone). */
  readonly unavailable?: number;
  readonly pr?: PullRequest;
}

/** What `readRefSides` read, and how many refs `all` passed over. */
export interface RefSet {
  readonly sides: RefSide[];
  /**
   * With `all`: refs looked at, and refs whose Proof folder is not one
   * HEAD's history already had.
   */
  readonly examined?: number;
  readonly total?: number;
}

/** Of `changed`, the ids whose version this ref adds to the overlay. */
export function effectiveChanges(side: RefSide): string[] {
  return [...side.changed.keys()].filter(
    (id) => !side.sameAsBase.has(id) && !side.older?.has(id)
  );
}

export interface OverlayConflict {
  readonly effort: string | null;
  readonly text: string;
}

export interface Overlay {
  /** Every record, base first, reverse supersession and invalidation rebuilt. */
  readonly records: readonly ReadRecord[];
  /** Ids some ref adds or changes away from the working tree. */
  readonly proposed: ReadonlySet<string>;
  /** `main`, `only on <ref>`, or `differs on <ref>: <base> vs <ref>`. */
  tag(id: string): string;
  readonly conflicts: readonly OverlayConflict[];
}

const FORWARD: Readonly<Record<string, ReadRelation>> = {
  supersedes: 'superseded_by',
  invalidates: 'invalidated_by',
};
const REVERSE = new Set<string>(Object.values(FORWARD));
const RELIES: readonly ReadRelation[] = ['derives_from', 'cites', 'evidence'];
const DEAD = new Set([
  'superseded',
  'invalidated',
  'rejected',
  'deprecated',
  'retracted',
]);

function ids(record: ReadRecord | undefined, relation: ReadRelation): string[] {
  return [...(record?.relations[relation] ?? [])];
}

/** A record without its stored reverse supersession and invalidation. */
function withoutReverse(record: ReadRecord): ReadRecord {
  const relations = Object.fromEntries(
    Object.entries(record.relations).filter(([key]) => !REVERSE.has(key))
  );
  return { ...record, relations };
}

function withReverse(
  record: ReadRecord,
  reverse: ReadonlyMap<string, Map<ReadRelation, Set<string>>>
): ReadRecord {
  const base = withoutReverse(record);
  const links = reverse.get(record.id);
  if (!links) return base;
  const relations = { ...base.relations };
  for (const [relation, sources] of links)
    relations[relation] = [...sources].sort();
  return { ...base, relations };
}

/** Reverse supersession and invalidation over a set of records. */
function reverseIndex(
  records: Iterable<ReadRecord>
): Map<string, Map<ReadRelation, Set<string>>> {
  const reverse = new Map<string, Map<ReadRelation, Set<string>>>();
  for (const record of records)
    for (const [forward, back] of Object.entries(FORWARD))
      for (const target of ids(record, forward as ReadRelation)) {
        if (!reverse.has(target)) reverse.set(target, new Map());
        const links = reverse.get(target) as Map<ReadRelation, Set<string>>;
        if (!links.has(back)) links.set(back, new Set());
        (links.get(back) as Set<string>).add(record.id);
      }
  return reverse;
}

function prLabel(side: RefSide): string {
  if (!side.pr) return side.name;
  return `${side.name} (${side.pr.isDraft ? 'draft' : 'PR'} #${
    side.pr.number
  } by ${side.pr.author})`;
}

function stored(record: ReadRecord): string {
  const value = record.frontmatter.state ?? record.frontmatter.status;
  return value === undefined ? '' : String(value);
}

/**
 * Builds the combined graph, the per-record tags, and the conflicts. A pure
 * function of the base records and the refs, so tests need no git.
 */
export function buildOverlay(
  baseRecords: readonly ReadRecord[],
  sides: readonly RefSide[]
): Overlay {
  const base = new Map(baseRecords.map((record) => [record.id, record]));
  const differing = (side: RefSide, id: string) =>
    side.changed.has(id) && !side.sameAsBase.has(id) && !side.older?.has(id);
  // Every version of each id: the base one, then each ref's changed one.
  const versions = new Map<string, { side: string; record: ReadRecord }[]>();
  const addVersion = (side: string, record: ReadRecord) => {
    if (!versions.has(record.id)) versions.set(record.id, []);
    (versions.get(record.id) as { side: string; record: ReadRecord }[]).push({
      side,
      record,
    });
  };
  for (const record of baseRecords) addVersion(BASE, record);
  for (const side of sides)
    for (const [id, record] of side.changed)
      if (differing(side, id)) addVersion(side.name, record);

  // The combined graph: the base version, else the first ref's, with the
  // forward edges and `resolved_by` of every version.
  const combined: ReadRecord[] = [];
  for (const [, list] of versions) {
    const chosen = withoutReverse(list[0].record);
    const relations = { ...chosen.relations };
    for (const relation of [
      ...Object.keys(FORWARD),
      'resolved_by',
    ] as ReadRelation[]) {
      const all = new Set(list.flatMap(({ record }) => ids(record, relation)));
      if (all.size) relations[relation] = [...all].sort();
    }
    combined.push({ ...chosen, relations });
  }
  const combinedReverse = reverseIndex(combined);
  const records = combined.map((record) =>
    withReverse(record, combinedReverse)
  );
  const byId = new Map(records.map((record) => [record.id, record]));

  // Each side's own view, for standings: the base, or the ref's tree with
  // its changed versions and the base version of the rest.
  const sideByName = new Map(sides.map((side) => [side.name, side]));
  const views = new Map<
    string,
    {
      get(id: string): ReadRecord | undefined;
      reverse: Map<string, Map<ReadRelation, Set<string>>>;
    }
  >();
  const view = (name: string) => {
    let found = views.get(name);
    if (found) return found;
    const side = sideByName.get(name);
    const get = (id: string) =>
      !side
        ? base.get(id)
        : side.changed.get(id) ?? (side.ids.has(id) ? base.get(id) : undefined);
    const members = side
      ? [...side.ids].flatMap((id) => get(id) ?? [])
      : [...base.values()];
    found = { get, reverse: reverseIndex(members) };
    views.set(name, found);
    return found;
  };
  const standingOn = (name: string, id: string): string | undefined => {
    const { get, reverse } = view(name);
    const record = get(id);
    return record ? standingOf(withReverse(record, reverse)) : undefined;
  };

  const proposed = new Set<string>();
  for (const [id, list] of versions)
    if (list.some(({ side }) => side !== BASE)) proposed.add(id);
  for (const side of sides)
    for (const id of side.deleted ?? []) if (base.has(id)) proposed.add(id);
  const tag = (id: string): string => {
    if (base.has(id)) {
      const parts = sides.flatMap((side) => {
        if (side.deleted?.has(id)) return [`deleted on ${prLabel(side)}`];
        if (!differing(side, id)) return [];
        const from = standingOn(BASE, id) ?? 'missing';
        const to = standingOn(side.name, id) ?? 'missing';
        return [
          `differs on ${prLabel(side)}: ${from} vs ${to}${
            from === to ? ', other fields differ' : ''
          }`,
        ];
      });
      return parts.length ? parts.join('; ') : 'main';
    }
    const holders = sides.filter(
      (side) => side.changed.has(id) && !side.older?.has(id)
    );
    return holders.length
      ? `only on ${holders.map(prLabel).join(', ')}`
      : 'main';
  };

  const effortOf = (id: string): string | null => {
    const record = byId.get(id);
    if (!record) return null;
    if (record.kind === 'effort') return record.id;
    return typeof record.frontmatter.effort === 'string'
      ? record.frontmatter.effort
      : null;
  };
  const conflicts: OverlayConflict[] = [];
  const conflict = (id: string, text: string) =>
    conflicts.push({ effort: effortOf(id), text });
  const sidesText = (list: readonly string[]) => [...new Set(list)].join(', ');

  // 1. Two accepted Decisions on one question Issue. A Decision counts when
  // some side accepted it and it is not dead on the base. A ref that has it
  // dead drops it only when the base accepted it: a ref that accepted one
  // Decision and rejected the base's accepted one is a proposal, not a
  // conflict. When the base never accepted it, one ref rejecting it does
  // not outweigh another ref accepting it. A Decision is on a question when
  // it derives from it, or when some side's version of the question lists
  // it in `resolved_by`.
  const accepted = new Map<string, string[]>();
  for (const [id, list] of versions) {
    if (byId.get(id)?.kind !== 'decision') continue;
    const on = list
      .filter(({ record }) => record.frontmatter.state === 'accepted')
      .map(({ side }) => side);
    const baseAccepted = on.includes(BASE);
    const dead = list.some(
      ({ side }) =>
        (side === BASE || baseAccepted) && DEAD.has(standingOn(side, id) ?? '')
    );
    if (on.length && !dead) accepted.set(id, on);
  }
  const isQuestion = (id: string) => {
    const issue = byId.get(id);
    return issue?.kind === 'issue' && issue.frontmatter.kind === 'question';
  };
  const resolvedBy = new Map<string, Set<string>>();
  for (const [id, list] of versions) {
    if (!isQuestion(id)) continue;
    for (const { record } of list)
      for (const decision of ids(record, 'resolved_by')) {
        if (!resolvedBy.has(decision)) resolvedBy.set(decision, new Set());
        (resolvedBy.get(decision) as Set<string>).add(id);
      }
  }
  const byQuestion = new Map<string, string[]>();
  for (const id of accepted.keys()) {
    const questions = new Set([
      ...(versions.get(id) ?? []).flatMap(({ record }) =>
        ids(record, 'derives_from').filter(isQuestion)
      ),
      ...(resolvedBy.get(id) ?? []),
    ]);
    for (const question of questions) {
      if (!byQuestion.has(question)) byQuestion.set(question, []);
      (byQuestion.get(question) as string[]).push(id);
    }
  }
  const answered = new Set<string>();
  for (const [question, decisions] of [...byQuestion].sort(([a], [b]) =>
    a < b ? -1 : 1
  ))
    if (
      decisions.length > 1 &&
      decisions.some((id) =>
        (accepted.get(id) ?? []).some((side) => side !== BASE)
      )
    ) {
      answered.add(question);
      conflict(
        question,
        `two accepted Decisions on question ${question}: ${decisions
          .sort()
          .map((id) => `${id} (${sidesText(accepted.get(id) ?? [])})`)
          .join(', ')}`
      );
    }

  // Sides whose versions of `id` count against each other: every ref's,
  // and the base's when the working tree changed it since some ref split
  // off. A ref that changed a record the working tree left alone proposes.
  const involvedVersions = (id: string) => {
    const list = versions.get(id) ?? [];
    const refs = list.filter(({ side }) => side !== BASE);
    if (!refs.length) return [];
    const baseVersion = list.find(({ side }) => side === BASE);
    return baseVersion &&
      refs.some(({ side }) => sideByName.get(side)?.baseChanged.has(id))
      ? [baseVersion, ...refs]
      : refs;
  };

  // 1b. One Issue resolved by different records on two sides, when rule 1
  // has not already named it.
  for (const id of [...versions.keys()].sort()) {
    if (answered.has(id) || byId.get(id)?.kind !== 'issue') continue;
    const values = new Map<string, string[]>();
    for (const { side, record } of involvedVersions(id)) {
      const by = ids(record, 'resolved_by').sort().join(', ');
      if (!by) continue;
      if (!values.has(by)) values.set(by, []);
      (values.get(by) as string[]).push(side);
    }
    if (values.size > 1)
      conflict(
        id,
        `${id} resolved differently: ${[...values]
          .map(([by, on]) => `by ${by} on ${sidesText(on)}`)
          .join('; ')}`
      );
  }

  // 2. One record superseded by two different records. Compactions are
  // left to rule 5, since each one supersedes every head.
  const superseders = new Map<string, Map<string, string[]>>();
  for (const [id, list] of versions)
    for (const { side, record } of list)
      for (const target of ids(record, 'supersedes')) {
        if (!superseders.has(target)) superseders.set(target, new Map());
        const by = superseders.get(target) as Map<string, string[]>;
        if (!by.has(id)) by.set(id, []);
        (by.get(id) as string[]).push(side);
      }
  for (const [target, by] of [...superseders].sort(([a], [b]) =>
    a < b ? -1 : 1
  )) {
    const record = byId.get(target);
    if (by.size < 2 || (record && isCompaction(record))) continue;
    if (![...by.values()].some((list) => list.some((side) => side !== BASE)))
      continue;
    conflict(
      target,
      `${target} superseded by two records: ${[...by]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([id, list]) => `${id} (${sidesText(list)})`)
        .join(', ')}`
    );
  }

  // 3. One id with a different stored state or status on two sides, where
  // both sides changed it since they split. A ref that changed a record the
  // working tree left alone is a proposal, shown on the card's tag.
  for (const [id, list] of [...versions].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const involved = involvedVersions(id);
    if (!involved.length) continue;
    const values = new Map<string, string[]>();
    for (const { side, record } of involved) {
      const value = stored(record);
      if (!values.has(value)) values.set(value, []);
      (values.get(value) as string[]).push(side);
    }
    if (values.size < 2) continue;
    const field =
      list[0].record.frontmatter.state !== undefined ? 'state' : 'status';
    conflict(
      id,
      `${id} has different ${field}: ${[...values]
        .map(([value, on]) => `${value || 'none'} on ${sidesText(on)}`)
        .join('; ')}`
    );
  }

  // 4. A retraction on one side of a record another side relies on, where
  // the relying side changed or added the relying record since they split.
  // Retract strips the retracted id from every record on its own side, so a
  // reliance the base held before the split is already gone on the
  // retracting side, and that side's version wins the merge.
  const relyIndex = new Map<
    string,
    { side: string; id: string; field: string }[]
  >();
  for (const [id, list] of versions)
    for (const { side, record } of list) {
      if (record.frontmatter.retracted === true) continue;
      for (const field of RELIES)
        for (const target of ids(record, field)) {
          if (!relyIndex.has(target)) relyIndex.set(target, []);
          (
            relyIndex.get(target) as {
              side: string;
              id: string;
              field: string;
            }[]
          ).push({ side, id, field });
        }
    }
  for (const [id, list] of [...versions].sort(([a], [b]) => (a < b ? -1 : 1)))
    for (const { side, record } of list) {
      if (record.frontmatter.retracted !== true) continue;
      for (const rely of relyIndex.get(id) ?? []) {
        if (rely.side === side) continue;
        // A ref's versions are all changed since its split. The base's
        // count only when the working tree changed the relying record
        // since the retracting ref split off.
        if (
          rely.side === BASE &&
          !sideByName.get(side)?.baseChanged.has(rely.id)
        )
          continue;
        conflict(
          id,
          `${id} retracted on ${side}; ${rely.id} on ${rely.side} relies on it (${rely.field})`
        );
      }
    }

  // 5. Two head compactions for one Effort.
  const heads = new Map<string, string[]>();
  for (const record of records) {
    if (!isCompaction(record) || record.frontmatter.retracted === true)
      continue;
    if (ids(record, 'superseded_by').length) continue;
    const effort = effortOf(record.id) ?? '';
    if (!heads.has(effort)) heads.set(effort, []);
    (heads.get(effort) as string[]).push(record.id);
  }
  const holders = (id: string) =>
    (versions.get(id) ?? []).map(({ side }) => side);
  for (const [effort, list] of [...heads].sort(([a], [b]) => (a < b ? -1 : 1)))
    if (
      list.length > 1 &&
      list.some((id) => holders(id).some((side) => side !== BASE))
    )
      conflicts.push({
        effort: effort || null,
        text: `${effort} has ${list.length} head compactions: ${list
          .sort()
          .map((id) => `${id} (${sidesText(holders(id))})`)
          .join(', ')}`,
      });

  return { records, proposed, tag, conflicts };
}

/**
 * The conflicts in scope, for one Effort or all: the first CONFLICTS_SHOWN
 * texts, and how many there are.
 */
export function conflictsInScope(
  overlay: Overlay,
  effort?: string
): { texts: string[]; total: number } {
  const shown = overlay.conflicts.filter(
    (conflict) => !effort || conflict.effort === effort
  );
  return {
    texts: shown.slice(0, CONFLICTS_SHOWN).map((conflict) => conflict.text),
    total: shown.length,
  };
}

// ---------------------------------------------------------------------------
// Reading refs with git.

function invalid(message: string): never {
  throw new ProofReadValidationError('PROOF_INVALID_ARGUMENT', message);
}

function gitBytes(
  cwd: string,
  args: readonly string[],
  input: string
): Promise<{ out: Buffer; ok: boolean }> {
  return new Promise((resolveGit) => {
    const child = execFile(
      'git',
      [...NO_FETCH_ARGS, ...args],
      {
        cwd,
        env: { ...process.env, ...NO_FETCH_ENV },
        maxBuffer: 1024 * 1024 * 1024,
        encoding: 'buffer',
      },
      // Keep what git printed before it stopped, such as cat-file dying at
      // a blob a partial clone does not hold.
      (error, stdout) =>
        resolveGit({ out: stdout ?? Buffer.alloc(0), ok: !error })
    );
    child.stdin?.end(input);
  });
}

/** A map that drops its least recently used entry past `limit`. */
class Lru<V> {
  private readonly map = new Map<string, V>();
  constructor(private readonly limit: number) {}
  has(key: string): boolean {
    return this.map.has(key);
  }
  get(key: string): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key) as V;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }
  set(key: string, value: V): void {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.limit)
      this.map.delete(this.map.keys().next().value as string);
  }
}

/** The repository holding `rootDir`, and the Proof folder inside it. */
export async function proofRepository(
  rootDir: string
): Promise<{ top: string; root: string } | undefined> {
  const top = (await git(rootDir, ['rev-parse', '--show-toplevel']))?.trim();
  if (!top) return undefined;
  const real = await realpath(rootDir).catch(() => rootDir);
  const realTop = await realpath(top).catch(() => top);
  return { top: realTop, root: relative(realTop, real).split(sep).join('/') };
}

const KINDS: Readonly<Record<string, PrimitiveKind>> = {
  eff: 'effort',
  iss: 'issue',
  fnd: 'finding',
  dec: 'decision',
  con: 'constraint',
  rsk: 'risk',
  cit: 'citation',
  blb: 'blob',
};
const RELATION_FIELDS = new Set<string>([
  'derives_from',
  'supersedes',
  'superseded_by',
  'invalidates',
  'invalidated_by',
  'rejected_by',
  'mitigated_by',
  'resolved_by',
  'evidence',
  'cites',
]);

/** A record file's bytes as the `find` index reads one. */
export function recordFromFile(
  path: string,
  bytes: Buffer | string
): ReadRecord | undefined {
  let parsed;
  try {
    parsed = parseDocument(bytes);
  } catch {
    return undefined;
  }
  const { frontmatter: data, body } = parsed;
  const id = typeof data.id === 'string' ? data.id : undefined;
  const kind = id ? KINDS[id.split('-', 1)[0]] : undefined;
  if (!id || !kind) return undefined;
  const frontmatter: Record<string, unknown> = {};
  const relations: Partial<Record<ReadRelation, string[]>> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || value === undefined) continue;
    if (RELATION_FIELDS.has(key))
      relations[key as ReadRelation] = (
        Array.isArray(value) ? value : [value]
      ).filter((item): item is string => typeof item === 'string');
    else frontmatter[key] = value instanceof Date ? value.toISOString() : value;
  }
  return { id, kind, path, frontmatter, body_excerpt: body, relations };
}

function isRecordPath(path: string): boolean {
  return path.endsWith('.md') && !path.includes('/.journal/');
}

/** `git ls-tree` of the Proof folder: record path to blob sha. */
const treeCache = new Lru<Map<string, string>>(512);
async function proofTree(
  top: string,
  root: string,
  commit: string
): Promise<Map<string, string>> {
  const key = `${top}\0${root}\0${commit}`;
  const cached = treeCache.get(key);
  if (cached) return cached;
  const out = await git(top, [
    'ls-tree',
    '-r',
    '-z',
    commit,
    '--',
    root || '.',
  ]);
  const tree = new Map<string, string>();
  for (const entry of (out ?? '').split('\0')) {
    const tab = entry.indexOf('\t');
    if (tab < 0) continue;
    const [, type, sha] = entry.slice(0, tab).split(' ');
    const path = entry.slice(tab + 1);
    if (type !== 'blob' || !isRecordPath(path)) continue;
    tree.set(path, sha);
  }
  treeCache.set(key, tree);
  return tree;
}

/** `git merge-base`, cached; a pair of commits always has the same one. */
const mergeBaseCache = new Lru<string | null>(4096);
async function mergeBase(
  top: string,
  a: string,
  b: string
): Promise<string | undefined> {
  const key = `${top}\0${a}\0${b}`;
  if (!mergeBaseCache.has(key))
    mergeBaseCache.set(
      key,
      (await git(top, ['merge-base', a, b]))?.trim() || null
    );
  return mergeBaseCache.get(key) ?? undefined;
}

/**
 * Every blob sha a record file held in HEAD's history, so a ref version
 * that main already took, as by a squash merge, counts as merged; and every
 * tree the Proof folder had there, so a ref whose Proof folder is one of
 * them adds nothing and needs no closer look.
 */
const historyCache = new Lru<{ blobs: Set<string>; trees: Set<string> }>(8);
async function headHistory(
  top: string,
  root: string,
  head: string
): Promise<{ blobs: Set<string>; trees: Set<string> }> {
  const key = `${top}\0${root}\0${head}`;
  const cached = historyCache.get(key);
  if (cached) return cached;
  const blobs = new Set((await proofTree(top, root, head)).values());
  const trees = new Set<string>();
  const out = await git(top, [
    'log',
    '--raw',
    '-t',
    '--no-renames',
    '--no-abbrev',
    `--format=${root ? '' : '%T'}`,
    head,
    '--',
    root || '.',
  ]);
  for (const line of (out ?? '').split('\n')) {
    const tab = line.indexOf('\t');
    if (!line.startsWith(':') || tab < 0) {
      if (!root && /^[0-9a-f]{40,64}$/.test(line.trim()))
        trees.add(line.trim());
      continue;
    }
    const path = line.slice(tab + 1);
    const shas = line
      .slice(1, tab)
      .split(' ')
      .slice(2, 4)
      .filter((sha) => !/^0+$/.test(sha));
    for (const sha of shas)
      if (isRecordPath(path)) blobs.add(sha);
      else if (path === root) trees.add(sha);
  }
  const found = { blobs, trees };
  historyCache.set(key, found);
  return found;
}

/** The Proof folder's tree at each commit, in one `cat-file` call. */
async function proofTreeOids(
  top: string,
  root: string,
  commits: readonly string[]
): Promise<Map<string, string>> {
  const out = await git(
    top,
    ['cat-file', '--batch-check=%(objectname) %(objecttype)'],
    `${commits
      .map((commit) => (root ? `${commit}:${root}` : `${commit}^{tree}`))
      .join('\n')}\n`
  );
  const oids = new Map<string, string>();
  (out ?? '').split('\n').forEach((line, i) => {
    const [oid, type] = line.split(' ');
    if (type === 'tree' && i < commits.length) oids.set(commits[i], oid);
  });
  return oids;
}

/** Whether the repository is a partial clone, whose blobs may be missing. */
const partialCache = new Map<string, Promise<boolean>>();
function isPartialClone(top: string): Promise<boolean> {
  let found = partialCache.get(top);
  if (!found) {
    found = Promise.all([
      git(top, ['config', '--get', 'extensions.partialClone']),
      git(top, ['config', '--get-regexp', '^remote\\..*\\.promisor$']),
    ]).then(
      ([extension, promisor]) =>
        Boolean(extension?.trim()) || /\strue$/m.test(promisor ?? '')
    );
    partialCache.set(top, found);
  }
  return found;
}

/**
 * Blobs `commit` holds that `exclude` does not and that are not on disk.
 * `rev-list --missing=print` lists them without fetching.
 */
async function missingBlobs(
  top: string,
  commit: string,
  exclude: string | undefined
): Promise<Set<string>> {
  const out = await git(top, [
    'rev-list',
    '--objects',
    '--missing=print',
    commit,
    ...(exclude ? [`^${exclude}`] : []),
  ]);
  return new Set(
    (out ?? '')
      .split('\n')
      .filter((line) => line.startsWith('?'))
      .map((line) => line.slice(1).trim())
  );
}

/** Parsed records by blob sha; a blob never changes. */
const blobCache = new Lru<ReadRecord | null>(20_000);
async function readBlobs(
  top: string,
  wanted: ReadonlyMap<string, string>,
  absent: ReadonlySet<string>
): Promise<{ records: Map<string, ReadRecord>; unavailable: number }> {
  const missing = [...new Set(wanted.values())].filter(
    (sha) => !blobCache.has(sha) && !absent.has(sha)
  );
  const read = new Set<string>();
  if (missing.length) {
    const { out } = await gitBytes(
      top,
      ['cat-file', '--batch'],
      `${missing.join('\n')}\n`
    );
    const paths = new Map([...wanted].map(([path, sha]) => [sha, path]));
    let at = 0;
    while (at < out.length) {
      const newline = out.indexOf(10, at);
      if (newline < 0) break;
      const [sha, type, size] = out.subarray(at, newline).toString().split(' ');
      if (type === 'missing' || size === undefined) {
        at = newline + 1;
        continue;
      }
      const length = Number(size);
      if (newline + 1 + length > out.length) break;
      const bytes = out.subarray(newline + 1, newline + 1 + length);
      at = newline + 1 + length + 1;
      read.add(sha);
      blobCache.set(
        sha,
        recordFromFile(paths.get(sha) ?? '', Buffer.from(bytes)) ?? null
      );
    }
  }
  const records = new Map<string, ReadRecord>();
  let unavailable = 0;
  for (const [path, sha] of wanted) {
    if (!blobCache.has(sha)) {
      unavailable++;
      continue;
    }
    const record = blobCache.get(sha);
    if (record) records.set(path, { ...record, path });
  }
  return { records, unavailable };
}

function blobSha(bytes: Buffer): string {
  return createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');
}

function idOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1, -'.md'.length);
}

/** Whether a ref changes anything, counting records not on disk. */
function addsAnything(side: RefSide): boolean {
  return Boolean(
    effectiveChanges(side).length || side.deleted?.size || side.unavailable
  );
}

/** A side as `readSide` builds it, with what the pairwise check needs. */
interface ReadSide extends RefSide {
  readonly blobs: ReadonlyMap<string, { path: string; sha: string }>;
  readonly older: Set<string>;
}

interface RepoContext {
  readonly top: string;
  readonly root: string;
  readonly head?: string;
  readonly prs: readonly PullRequest[];
  readonly remotes: readonly string[];
  readonly partial: boolean;
  /** Record paths the working tree has that git does not track. */
  readonly untracked: () => Promise<Set<string>>;
}

/**
 * The pull request for a ref: one whose head branch is the ref's branch,
 * else one whose head branch is the ref with a remote name in front.
 */
export function matchPullRequest(
  name: string,
  prs: readonly PullRequest[],
  remotes: readonly string[]
): PullRequest | undefined {
  const branch = name.replace(/^refs\/(?:heads|remotes)\//, '');
  return (
    prs.find((candidate) => candidate.headRefName === branch) ??
    prs.find((candidate) =>
      remotes.some((remote) => branch === `${remote}/${candidate.headRefName}`)
    )
  );
}

/** What one ref changed in the Proof folder since its merge base with HEAD. */
async function readSide(
  repo: RepoContext,
  name: string,
  sha: string
): Promise<ReadSide> {
  const { top, root, head } = repo;
  const tree = await proofTree(top, root, sha);
  const split = head ? await mergeBase(top, head, sha) : undefined;
  // With no merge base, as in a shallow clone, HEAD stands in for it, so
  // only working-tree edits count as the base's changes.
  const since = split ?? head;
  const before = since
    ? await proofTree(top, root, since)
    : new Map<string, string>();
  const merged = head
    ? (await headHistory(top, root, head)).blobs
    : new Set<string>();
  const changedPaths = new Map(
    [...tree].filter(
      ([path, blob]) => before.get(path) !== blob && !merged.has(blob)
    )
  );
  // A deletion needs a merge base: against HEAD, every record main added
  // after the ref split off would read as deleted.
  const deleted = new Set(
    split ? [...before.keys()].filter((path) => !tree.has(path)).map(idOf) : []
  );
  const pr = matchPullRequest(name, repo.prs, repo.remotes);
  const empty = {
    name,
    sha,
    ids: new Set([...tree.keys()].map(idOf)),
    deleted,
    ...(head && !split ? { noMergeBase: true as const } : {}),
    ...(pr ? { pr } : {}),
  };
  if (!changedPaths.size && !deleted.size)
    return {
      ...empty,
      changed: new Map(),
      baseChanged: new Set(),
      sameAsBase: new Set(),
      blobs: new Map(),
      older: new Set(),
    };
  const absent = repo.partial
    ? await missingBlobs(top, sha, since)
    : new Set<string>();
  const { records: parsed, unavailable } = await readBlobs(
    top,
    changedPaths,
    absent
  );
  const changed = new Map<string, ReadRecord>();
  const blobs = new Map<string, { path: string; sha: string }>();
  const sameAsBase = new Set<string>();
  for (const [path, record] of parsed) {
    changed.set(record.id, record);
    blobs.set(record.id, { path, sha: changedPaths.get(path) as string });
    const bytes = await readFile(join(top, path)).catch(() => undefined);
    if (bytes && blobSha(bytes) === changedPaths.get(path))
      sameAsBase.add(record.id);
  }
  // What the working tree changed or added since the split: tracked edits
  // against that commit, and record files git does not track yet.
  const baseChanged = new Set<string>();
  if (since) {
    const out = await git(top, [
      'diff',
      '--name-only',
      '--no-renames',
      '-z',
      since,
      '--',
      root || '.',
    ]);
    for (const path of (out ?? '').split('\0'))
      if (isRecordPath(path)) baseChanged.add(idOf(path));
  }
  for (const path of await repo.untracked()) baseChanged.add(idOf(path));
  return {
    ...empty,
    changed,
    baseChanged,
    sameAsBase,
    blobs,
    older: new Set(),
    ...(unavailable ? { unavailable } : {}),
  };
}

/**
 * Marks versions that are older ones of another ref's. When two refs hold
 * different versions of a record, and one of them is the version at the two
 * refs' own merge base, the other ref changed it later: a local branch ahead
 * of its remote-tracking ref, or a branch stacked on another.
 */
async function markOlder(repo: RepoContext, sides: readonly ReadSide[]) {
  for (let i = 0; i < sides.length; i++)
    for (let j = i + 1; j < sides.length; j++) {
      const [a, b] = [sides[i], sides[j]];
      const shared = [...a.blobs].filter(
        ([id, blob]) => b.blobs.has(id) && b.blobs.get(id)?.sha !== blob.sha
      );
      if (!shared.length) continue;
      const split = await mergeBase(repo.top, a.sha, b.sha);
      if (!split) continue;
      const tree = await proofTree(repo.top, repo.root, split);
      for (const [id, blob] of shared) {
        const at = tree.get(blob.path);
        if (at === blob.sha) a.older.add(id);
        else if (at === b.blobs.get(id)?.sha) b.older.add(id);
      }
    }
}

/**
 * For `all`: of a local branch and its remote-tracking ref (`feat/x` and
 * `origin/feat/x`), the one the other contains, since it shows nothing the
 * other does not.
 */
async function trackingPairs(
  repo: RepoContext,
  sides: readonly ReadSide[]
): Promise<Set<ReadSide>> {
  const byName = new Map(sides.map((side) => [side.name, side]));
  const isAncestor = async (a: string, b: string) =>
    (await git(repo.top, ['merge-base', '--is-ancestor', a, b])) !== undefined;
  const redundant = new Set<ReadSide>();
  for (const side of sides) {
    const remote = repo.remotes.find((name) =>
      side.name.startsWith(`${name}/`)
    );
    const local = remote && byName.get(side.name.slice(remote.length + 1));
    if (!local) continue;
    if (await isAncestor(side.sha, local.sha)) redundant.add(side);
    else if (await isAncestor(local.sha, side.sha)) redundant.add(local);
  }
  return redundant;
}

/** Pull requests from a gitignored `.flatbread/proof/prs.json`, if any. */
export async function readPullRequests(
  cacheRoot: string
): Promise<PullRequest[]> {
  try {
    const data = JSON.parse(
      await readFile(join(cacheRoot, 'prs.json'), 'utf8')
    );
    if (!Array.isArray(data)) return [];
    return data.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const author =
        typeof entry.author === 'string'
          ? entry.author
          : typeof entry.author?.login === 'string'
          ? entry.author.login
          : 'unknown';
      return typeof entry.number === 'number' &&
        typeof entry.headRefName === 'string'
        ? [
            {
              number: entry.number,
              headRefName: entry.headRefName,
              isDraft: entry.isDraft === true,
              author,
            },
          ]
        : [];
    });
  } catch {
    return [];
  }
}

/**
 * The branches `all` looks at: local and remote, newest commit first, one
 * name per commit, leaving out HEAD's commit and symbolic refs.
 */
export async function branchCandidates(
  top: string,
  head: string | undefined
): Promise<{ short: string; sha: string }[]> {
  const out = await git(top, [
    'for-each-ref',
    '--sort=-committerdate',
    '--format=%(refname)%00%(objectname)%00%(refname:short)%00%(symref)',
    'refs/heads',
    'refs/remotes',
  ]);
  const seen = new Set<string>(head ? [head] : []);
  const candidates: { short: string; sha: string }[] = [];
  for (const line of (out ?? '').split('\n')) {
    const [, sha, short, symref] = line.split('\0');
    if (!sha || symref || seen.has(sha)) continue;
    seen.add(sha);
    candidates.push({ short, sha });
  }
  return candidates;
}

/**
 * What `path` is in each commit's tree: `file`, `dir`, or left out when the
 * tree does not have it. One `cat-file --batch-check` call, the batch form
 * of `git cat-file -e <commit>:<path>`; it reads trees only, never blobs.
 */
export async function pathInTrees(
  top: string,
  commits: readonly string[],
  path: string
): Promise<Map<string, 'file' | 'dir'>> {
  const found = new Map<string, 'file' | 'dir'>();
  if (!commits.length || !path || /[\n\0]/.test(path)) return found;
  const out = await git(
    top,
    ['cat-file', '--batch-check=%(objecttype)'],
    `${commits.map((commit) => `${commit}:${path}`).join('\n')}\n`
  );
  (out ?? '').split('\n').forEach((line, i) => {
    if (i >= commits.length) return;
    const type = line.trim();
    if (type === 'blob') found.set(commits[i], 'file');
    else if (type === 'tree') found.set(commits[i], 'dir');
  });
  return found;
}

/**
 * Reads the refs to overlay. `all` skips local and remote branches whose
 * Proof folder HEAD's history already had, looks at the REFS_ALL_EXAMINED
 * others with the newest commits, and keeps those that change a Proof
 * record since their merge base with HEAD, at most REFS_ALL_LIMIT.
 * One commit reached by two names is read once, under the first name.
 */
export async function readRefSides(
  rootDir: string,
  cacheRoot: string,
  refs: readonly string[] | 'all'
): Promise<RefSet> {
  const found = await proofRepository(rootDir);
  if (!found) invalid('--refs needs the Proof root inside a git repository');
  const { top, root } = found;
  const head = (
    await git(top, ['rev-parse', '--verify', '-q', 'HEAD'])
  )?.trim();
  let untracked: Promise<Set<string>> | undefined;
  const repo: RepoContext = {
    top,
    root,
    ...(head ? { head } : {}),
    prs: await readPullRequests(cacheRoot),
    remotes: ((await git(top, ['remote'])) ?? '').split('\n').filter(Boolean),
    partial: await isPartialClone(top),
    untracked: () =>
      (untracked ??= git(top, [
        'ls-files',
        '--others',
        '--exclude-standard',
        '-z',
        '--',
        root || '.',
      ]).then((out) => new Set((out ?? '').split('\0').filter(isRecordPath)))),
  };
  const sides: ReadSide[] = [];
  if (refs === 'all') {
    const candidates = await branchCandidates(top, head);
    // A ref whose Proof folder is one HEAD's history already had adds
    // nothing, and costs no more git calls than this one.
    const oids = await proofTreeOids(
      top,
      root,
      candidates.map(({ sha }) => sha)
    );
    const known = head
      ? (await headHistory(top, root, head)).trees
      : new Set<string>();
    const touching = candidates.filter(({ sha }) => {
      const oid = oids.get(sha);
      return oid !== undefined && !known.has(oid);
    });
    const examined = touching.slice(0, REFS_ALL_EXAMINED);
    for (const { short, sha } of examined) {
      const side = await readSide(repo, short, sha);
      if (addsAnything(side)) sides.push(side);
      if (sides.length >= REFS_ALL_LIMIT) break;
    }
    await markOlder(repo, sides);
    const redundant = await trackingPairs(repo, sides);
    return {
      sides: sides.filter((side) => !redundant.has(side) && addsAnything(side)),
      examined: examined.length,
      total: touching.length,
    };
  }
  for (const name of refs) {
    const sha = (
      await git(top, ['rev-parse', '--verify', '-q', `${name}^{commit}`])
    )?.trim();
    if (!sha) invalid(`Unknown git ref: ${name}`);
    sides.push(await readSide(repo, name, sha));
  }
  await markOlder(repo, sides);
  return { sides };
}

/**
 * What a ref changes, as the refs line and `proof branches` count it:
 * records a card can show (every kind but Effort) that it adds, changes, or
 * deletes, and Efforts apart.
 */
export function changeCounts(side: RefSide): {
  records: number;
  efforts: number;
} {
  const changed = effectiveChanges(side);
  const efforts = changed.filter(
    (id) => side.changed.get(id)?.kind === 'effort'
  ).length;
  return {
    records: changed.length - efforts + (side.deleted?.size ?? 0),
    efforts,
  };
}

/** The refs line a card set prints after its header. */
export function refsLine(set: RefSet): string {
  const examined =
    set.total !== undefined && set.examined !== undefined
      ? set.total > set.examined
        ? `; examined the newest ${set.examined} of ${set.total} refs that change the Proof folder`
        : ''
      : '';
  if (!set.sides.length) return `refs: none change Proof records${examined}`;
  const shallow = set.sides.some((side) => side.noMergeBase);
  return `refs: ${set.sides
    .map((side) => {
      const { records, efforts } = changeCounts(side);
      const notes = [
        `${records} changed`,
        ...(side.deleted?.size ? [`${side.deleted.size} deleted`] : []),
        ...(efforts ? [`${efforts} Effort${efforts > 1 ? 's' : ''}`] : []),
        ...(side.unavailable
          ? [
              `${side.unavailable} record${
                side.unavailable > 1 ? 's' : ''
              } not available locally`,
            ]
          : []),
        ...(side.noMergeBase ? ['no merge base: shallow clone?'] : []),
      ];
      return `${prLabel(side)} ${side.sha.slice(0, 7)} (${notes.join(', ')})`;
    })
    .join(', ')}${examined}${
    shallow
      ? '; with no merge base, a ref counts every record that differs from HEAD; git fetch --deepen=200 finds one'
      : ''
  }`;
}

/**
 * Writes `.flatbread/proof/prs.json` from `gh pr list`, the only networked
 * step. Fails with a plain message when gh is missing or not signed in.
 */
export async function refreshPullRequests(
  rootDir: string,
  cacheRoot: string
): Promise<{ path: string; count: number; ignored: boolean }> {
  const repo = await proofRepository(rootDir);
  const cwd = repo?.top ?? rootDir;
  const result = await new Promise<{ out?: string; error?: string }>(
    (resolveGh) =>
      execFile(
        'gh',
        [
          'pr',
          'list',
          '--state',
          'open',
          '--limit',
          '200',
          '--json',
          'number,headRefName,isDraft,author',
        ],
        { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
        (error, stdout, stderr) =>
          resolveGh(
            error
              ? {
                  error:
                    (error as NodeJS.ErrnoException).code === 'ENOENT'
                      ? 'gh is not installed. Install the GitHub CLI (https://cli.github.com) or write .flatbread/proof/prs.json by hand.'
                      : `gh pr list failed: ${
                          String(stderr).trim() || error.message
                        }. Run gh auth login if gh is not signed in.`,
                }
              : { out: stdout }
          )
      )
  );
  // The CLI prints an Error whose message is JSON as that JSON.
  const ghError = (message: string) =>
    new Error(
      JSON.stringify({ error: { code: 'PROOF_GH_UNAVAILABLE', message } })
    );
  if (result.error) throw ghError(result.error);
  let list: unknown;
  try {
    list = JSON.parse(result.out ?? '');
  } catch {
    throw ghError('gh pr list did not print JSON');
  }
  const prs = (Array.isArray(list) ? list : []).map(
    (entry: Record<string, unknown>) => ({
      number: entry.number,
      headRefName: entry.headRefName,
      isDraft: entry.isDraft === true,
      author:
        typeof entry.author === 'object' && entry.author
          ? (entry.author as { login?: string }).login ?? 'unknown'
          : String(entry.author ?? 'unknown'),
    })
  );
  const path = join(cacheRoot, 'prs.json');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(prs, null, 2)}\n`);
  const ignored =
    repo !== undefined &&
    (await git(repo.top, ['check-ignore', '-q', path])) !== undefined;
  return { path, count: prs.length, ignored };
}
