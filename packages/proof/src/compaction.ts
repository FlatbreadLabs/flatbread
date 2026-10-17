import { PREFIX_KIND } from './ids.js';
import type { PrimitiveKind } from './types.js';

/**
 * A compaction is a Finding with `kind: compaction`: one short, current
 * account of an Effort. Only `WriteCompaction` creates one, so the writer
 * always computes its `covers` snapshot and supersedes the previous head.
 */
export const COMPACTION_KIND = 'compaction';
/** `derives_from` names the records the body rests on, not the whole Effort. */
export const COMPACTION_DERIVES_FROM_LIMIT = 10;
/** `brief` asks for a new compaction once this many records changed. */
export const RECOMPACT_CHANGE_THRESHOLD = 5;

/**
 * Relation fields may live in `frontmatter` (writer snapshots) or be merged in
 * from a read projection; callers pass one flat field map either way.
 */
export interface CompactionRecord {
  readonly id: string;
  readonly kind: PrimitiveKind;
  readonly frontmatter: Readonly<Record<string, unknown>>;
}

export type CompactionChangeType = 'added' | 'changed' | 'left';

export interface CompactionChange {
  readonly change: CompactionChangeType;
  readonly id: string;
  readonly kind: PrimitiveKind | undefined;
  readonly title: string;
  /** Standing when the compaction was written; null when not covered. */
  readonly from: string | null;
  /** Standing now; null when no record answers to the id. */
  readonly to: string | null;
}

const COVERED_KINDS = new Set<PrimitiveKind>([
  'issue',
  'finding',
  'decision',
  'constraint',
  'risk',
]);

const LIVE_STANDINGS: Partial<Record<PrimitiveKind, ReadonlySet<string>>> = {
  issue: new Set(['open']),
  decision: new Set(['proposed', 'accepted']),
  risk: new Set(['open', 'realized']),
  finding: new Set(['live']),
  constraint: new Set(['live']),
};

function ids(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : typeof value === 'string'
    ? [value]
    : [];
}

export function isCompaction(record: CompactionRecord): boolean {
  return (
    record.kind === 'finding' && record.frontmatter.kind === COMPACTION_KIND
  );
}

/**
 * One word for where a record stands now. Retraction, supersession, and
 * invalidation outrank the stored state, because each takes the record off
 * the live graph whatever its state field still says.
 */
export function recordStanding(record: CompactionRecord): string {
  const fm = record.frontmatter;
  if (fm.retracted === true) return 'retracted';
  if (ids(fm.superseded_by).length) return 'superseded';
  if (ids(fm.invalidated_by).length) return 'invalidated';
  if (record.kind === 'issue') return String(fm.status ?? 'open');
  if (record.kind === 'decision' || record.kind === 'risk')
    return String(fm.state ?? 'proposed');
  return 'live';
}

export function isLiveStanding(
  kind: PrimitiveKind | undefined,
  standing: string | null
): boolean {
  return (
    kind !== undefined &&
    standing !== null &&
    (LIVE_STANDINGS[kind]?.has(standing) ?? false)
  );
}

function kindForId(id: string): PrimitiveKind | undefined {
  return PREFIX_KIND[id.split('-', 1)[0]];
}

/** Records a compaction covers: everything live in the Effort but itself. */
function isCoverable(record: CompactionRecord): boolean {
  return (
    COVERED_KINDS.has(record.kind) &&
    !isCompaction(record) &&
    isLiveStanding(record.kind, recordStanding(record))
  );
}

/**
 * The `covers` snapshot: `<id>@<standing>` for each live record in the Effort
 * and for each `derives_from` target, so a later read can say exactly what
 * moved. Ids never contain `@`.
 */
export function compactionCovers(
  effortRecords: readonly CompactionRecord[],
  derivesFrom: readonly string[] = []
): string[] {
  const cited = new Set(derivesFrom);
  return effortRecords
    .filter((record) => isCoverable(record) || cited.has(record.id))
    .map((record) => `${record.id}@${recordStanding(record)}`)
    .sort();
}

export function parseCovers(value: unknown): Map<string, string> {
  const covers = new Map<string, string>();
  for (const entry of ids(value)) {
    const at = entry.lastIndexOf('@');
    if (at > 0) covers.set(entry.slice(0, at), entry.slice(at + 1));
  }
  return covers;
}

/** Live compactions nothing has superseded yet; more than one is a fork. */
export function compactionHeads<T extends CompactionRecord>(
  effortRecords: readonly T[]
): T[] {
  return effortRecords.filter(
    (record) =>
      isCompaction(record) &&
      record.frontmatter.retracted !== true &&
      ids(record.frontmatter.superseded_by).length === 0
  );
}

function change(
  type: CompactionChangeType,
  id: string,
  record: CompactionRecord | undefined,
  from: string | null
): CompactionChange {
  return {
    change: type,
    id,
    kind: record?.kind ?? kindForId(id),
    title: String(record?.frontmatter.title ?? ''),
    from,
    to: record ? recordStanding(record) : null,
  };
}

/**
 * Records whose standing moved since `covers` was taken: new live records,
 * live records whose state changed, and covered live records that left the
 * live graph. Sorted by id so the digest is deterministic.
 */
export function compactionChanges(
  covers: ReadonlyMap<string, string>,
  effortRecords: readonly CompactionRecord[]
): CompactionChange[] {
  const byId = new Map(effortRecords.map((record) => [record.id, record]));
  const changes: CompactionChange[] = [];
  for (const record of effortRecords) {
    if (!isCoverable(record)) continue;
    const before = covers.get(record.id);
    if (before === undefined)
      changes.push(change('added', record.id, record, null));
    else if (before !== recordStanding(record))
      changes.push(change('changed', record.id, record, before));
  }
  for (const [id, before] of covers) {
    if (!isLiveStanding(kindForId(id), before)) continue;
    const record = byId.get(id);
    if (record && isCoverable(record)) continue;
    changes.push(change('left', id, record, before));
  }
  return changes.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * `derives_from` targets whose standing moved. Any one of them makes the
 * compaction stale: the body leans on a claim that no longer holds as written.
 */
export function staleDerivations(
  covers: ReadonlyMap<string, string>,
  derivesFrom: readonly string[],
  effortRecords: readonly CompactionRecord[]
): CompactionChange[] {
  const byId = new Map(effortRecords.map((record) => [record.id, record]));
  return [...new Set(derivesFrom)].sort().flatMap((id) => {
    const record = byId.get(id);
    const before = covers.get(id) ?? null;
    const now = record ? recordStanding(record) : null;
    return before === now ? [] : [change('changed', id, record, before)];
  });
}
