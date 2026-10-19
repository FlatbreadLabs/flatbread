import { FlatbreadProvider, type LoadedFlatbreadConfig } from '@flatbread/core';
import {
  canonicalizeReadQuery,
  compactionChanges,
  compactionHeads,
  parseCovers,
  RECOMPACT_CHANGE_THRESHOLD,
  staleDerivations,
  type CompactionChange,
  type CompactionStatus,
  type DigestSection,
  ProofConsistencyError,
  ProofCrossEffortRelationError,
  ProofDanglingRelationError,
  ProofInvalidCursorError,
  ProofReadValidationError,
  READ_RELATIONS,
  readQueryHash,
  renderDigest,
  type ReadEdge,
  type ReadEnvelope,
  type ReadRecord,
  type ReadRelation,
  type ConsistencyErrorShape,
  type PrimitiveKind,
} from '@flatbread/proof';
import { loadConfig } from '@flatbread/config';
import { createHash } from 'node:crypto';
import { readdir, realpath, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

export interface EffortProjectionOptions {
  readonly cwd: string;
  readonly rootDir: string;
  readonly cacheRoot: string;
  readonly consistency?:
    | { mode: 'eventual' }
    | { mode: 'strict'; min_generation: string; timeout_ms?: number };
}

type RawNode = Record<string, unknown>;
type Collection =
  | 'Effort'
  | 'Issue'
  | 'Finding'
  | 'Decision'
  | 'Constraint'
  | 'Risk'
  | 'Citation'
  | 'Blob';

const COLLECTIONS: readonly Collection[] = [
  'Effort',
  'Issue',
  'Finding',
  'Decision',
  'Constraint',
  'Risk',
  'Citation',
  'Blob',
];
const KIND_TO_COLLECTION: Record<PrimitiveKind, Collection> = {
  effort: 'Effort',
  issue: 'Issue',
  finding: 'Finding',
  decision: 'Decision',
  constraint: 'Constraint',
  risk: 'Risk',
  citation: 'Citation',
  blob: 'Blob',
};
const FRONTMATTER_FIELDS = [
  'effort',
  'title',
  'kind',
  'status',
  'state',
  'role',
  'blob',
  'created_at',
  'slug',
  'produced_in',
  'created_by',
  'retracted',
  'retracted_at',
  'retracted_reason',
  'derives_from',
  'supersedes',
  'superseded_by',
  'invalidates',
  'invalidated_by',
  'resolved_by',
  'rejected_by',
  'reopen_history',
  'mitigated_by',
  'evidence',
  'cites',
  // Read by `brief`; digests never print it.
  'covers',
] as const;
const RELATION_FIELDS = new Set([
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

function plural(collection: Collection): string {
  return collection === 'Effort'
    ? 'Efforts'
    : collection === 'Finding'
    ? 'Findings'
    : collection === 'Risk'
    ? 'Risks'
    : collection === 'Citation'
    ? 'Citations'
    : `${collection}s`;
}

function rawKey(field: string): string {
  return field;
}

function collectionForId(id: string): Collection | undefined {
  const prefix = id.split('-', 1)[0];
  return prefix === 'eff'
    ? 'Effort'
    : prefix === 'iss'
    ? 'Issue'
    : prefix === 'fnd'
    ? 'Finding'
    : prefix === 'dec'
    ? 'Decision'
    : prefix === 'con'
    ? 'Constraint'
    : prefix === 'rsk'
    ? 'Risk'
    : prefix === 'cit'
    ? 'Citation'
    : prefix === 'blb'
    ? 'Blob'
    : undefined;
}

function relationIds(value: unknown): string[] {
  if (Array.isArray(value))
    return value.flatMap((item) =>
      typeof item === 'string'
        ? [item]
        : item &&
          typeof item === 'object' &&
          typeof (item as RawNode).id === 'string'
        ? [(item as RawNode).id as string]
        : []
    );
  return typeof value === 'string'
    ? [value]
    : value &&
      typeof value === 'object' &&
      typeof (value as RawNode).id === 'string'
    ? [(value as RawNode).id as string]
    : [];
}

function toRecord(node: RawNode, collection: Collection): ReadRecord {
  const frontmatter: Record<string, unknown> = {};
  const relations: Partial<Record<ReadRelation, string[]>> = {};
  for (const field of FRONTMATTER_FIELDS) {
    if (node[field] === undefined) continue;
    const key = rawKey(field);
    const ids = relationIds(node[field]);
    if (field === 'effort' || field === 'blob') frontmatter[key] = ids[0];
    else if (RELATION_FIELDS.has(field)) relations[key as ReadRelation] = ids;
    else frontmatter[key] = node[field];
  }
  return {
    id: String(node.id),
    kind: collection.toLowerCase() as PrimitiveKind,
    path: typeof node._path === 'string' ? node._path : '',
    frontmatter,
    body_excerpt:
      node._content &&
      typeof node._content === 'object' &&
      typeof (node._content as RawNode).raw === 'string'
        ? ((node._content as RawNode).raw as string)
        : '',
    relations,
  };
}

function sortRecords(records: ReadRecord[]): ReadRecord[] {
  return records.sort((a, b) =>
    `${String(a.frontmatter.created_at ?? '')}\0${a.id}`.localeCompare(
      `${String(b.frontmatter.created_at ?? '')}\0${b.id}`
    )
  );
}

function isRetracted(record: ReadRecord): boolean {
  return record.frontmatter.retracted === true;
}

function owningEffort(record: ReadRecord): string | undefined {
  if (record.kind === 'effort') return record.id;
  return typeof record.frontmatter.effort === 'string'
    ? record.frontmatter.effort
    : undefined;
}

function encodeCursor(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function baseCursorQuery(
  query: Record<string, unknown>
): Record<string, unknown> {
  const page =
    query.page && typeof query.page === 'object'
      ? (query.page as RawNode)
      : undefined;
  return {
    ...query,
    ...(page ? { page: { ...page, cursor: undefined } } : {}),
  };
}

function decodeCursor(
  cursor: string,
  hash: string,
  generation: string
): number {
  try {
    const value = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8')
    ) as RawNode;
    if (
      value.v !== 1 ||
      value.query_hash !== hash ||
      value.served_generation !== generation ||
      !Number.isInteger(value.offset) ||
      (value.offset as number) < 0
    )
      throw new Error('cursor does not match query or served generation');
    return value.offset as number;
  } catch (error) {
    if (error instanceof ProofInvalidCursorError) throw error;
    throw new ProofInvalidCursorError(`Invalid cursor: ${String(error)}`);
  }
}

async function generation(rootDir: string): Promise<number> {
  try {
    const response = await import('node:fs/promises');
    const data = JSON.parse(
      await response.readFile(
        resolve(rootDir, '.journal/generation.json'),
        'utf8'
      )
    ) as { generation?: number };
    return Number(data.generation) || 0;
  } catch {
    return 0;
  }
}

async function servedGeneration(
  rootDir: string,
  consistency: EffortProjectionOptions['consistency']
): Promise<string> {
  const strict = consistency?.mode === 'strict' ? consistency : undefined;
  const wanted = strict
    ? parseGenerationToken(strict.min_generation)
    : undefined;
  const timeout = strict?.timeout_ms ?? 3000;
  const started = Date.now();
  let current = await generation(rootDir);
  while (
    wanted !== undefined &&
    current < wanted &&
    Date.now() - started < timeout
  ) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
    current = await generation(rootDir);
  }
  if (wanted !== undefined && current < wanted) {
    const requestedGeneration = strict?.min_generation ?? String(wanted);
    const shape: ConsistencyErrorShape = {
      error: {
        code: 'PROOF_GENERATION_WAIT_TIMEOUT',
        message: `Durable Proof generation ${wanted} was not observed (current: ${current})`,
        requested_generation: requestedGeneration,
        timeout_ms: timeout,
      },
    };
    throw new ProofConsistencyError(shape);
  }
  return String(current);
}

function parseGenerationToken(value: unknown): number {
  if (
    typeof value !== 'string' ||
    !/^(0|[1-9]\d*)$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  )
    throw new ProofReadValidationError(
      'PROOF_INVALID_GENERATION',
      'strict-min-generation must be a canonical non-negative safe integer string'
    );
  return Number(value);
}

function configForCwd(
  config: LoadedFlatbreadConfig,
  cwd: string
): LoadedFlatbreadConfig {
  return {
    ...config,
    content: config.content.map((entry) => ({
      ...entry,
      ...(entry.path
        ? {
            path: relative(
              process.cwd(),
              entry.path.startsWith('/')
                ? entry.path
                : entry.path.startsWith('Users/')
                ? `/${entry.path}`
                : resolve(cwd, entry.path)
            ),
          }
        : {}),
    })),
  };
}

class EngineProjection {
  readonly provider: FlatbreadProvider;
  private fieldsPromise?: Promise<Map<Collection, Set<string>>>;

  constructor(config: LoadedFlatbreadConfig) {
    this.provider = new FlatbreadProvider(config);
  }

  private async fields(): Promise<Map<Collection, Set<string>>> {
    if (!this.fieldsPromise)
      this.fieldsPromise = Promise.all(
        COLLECTIONS.map(async (collection) => {
          const result = await this.provider.query({
            source: `{ __type(name: "${collection}") { fields { name } } }`,
          });
          const names =
            (
              result.data as
                | { __type?: { fields?: Array<{ name: string }> } }
                | undefined
            )?.__type?.fields?.map(({ name }) => name) ?? [];
          return [collection, new Set(names)] as const;
        })
      ).then((items) => new Map(items));
    return this.fieldsPromise;
  }

  async query(
    collection: Collection,
    filter?: Record<string, unknown>
  ): Promise<ReadRecord[]> {
    const available =
      (await this.fields()).get(collection) ?? new Set<string>();
    const fields = [
      'id',
      '_path',
      'title',
      'kind',
      'status',
      'state',
      'created_at',
      'slug',
      'produced_in',
      'created_by',
      'retracted',
      'retracted_at',
      'retracted_reason',
      ...((available.has('reopen_history')
        ? ['reopen_history { at reason rejected_by }']
        : []) as string[]),
      'derives_from',
      'invalidates',
      'invalidated_by',
      'resolved_by',
      'evidence',
      'role',
      'covers',
      ...((available.has('_content') ? ['_content { raw }'] : []) as string[]),
    ].filter((field) => available.has(field.split(' ', 1)[0]));
    for (const relation of [
      'effort',
      'blob',
      'supersedes',
      'superseded_by',
      'rejected_by',
      'mitigated_by',
      'cites',
    ])
      if (available.has(relation) && !fields.includes(relation))
        fields.push(`${relation} { id }`);
    if (!fields.length) return [];
    const document = `query($filter: JSON) { all${plural(
      collection
    )}(filter: $filter) { ${fields.join(' ')} } }`;
    const result = await this.provider.query({
      source: document,
      variableValues: { filter },
    });
    if (result.errors?.length)
      throw new Error(result.errors.map((error) => error.message).join('; '));
    const nodes =
      (result.data as Record<string, RawNode[]> | undefined)?.[
        `all${plural(collection)}`
      ] ?? [];
    return nodes.map((node) => toRecord(node, collection));
  }

  async one(
    collection: Collection,
    id: string
  ): Promise<ReadRecord | undefined> {
    const records = await this.query(collection, { id: { eq: id } });
    return records.find((record) => record.id === id);
  }
}

async function loadProjection(
  options: EffortProjectionOptions
): Promise<EngineProjection> {
  const loaded = await loadConfig({ cwd: options.cwd });
  if (!loaded.config) throw new Error('Flatbread config is not defined');
  return new EngineProjection(configForCwd(loaded.config, options.cwd));
}

// Off by default: each CLI call builds the graph once and exits. A
// long-lived read server turns it on, so later reads skip the build.
let projectionCache: Map<string, Promise<EngineProjection>> | undefined;

/**
 * Keeps built graphs in memory for the life of the process. Entries are keyed
 * by the graph root's real path and a fingerprint of its record files, so
 * callers in different folders that link to one graph share it, and any
 * change to a record file makes the next read build it again. The journal
 * generation alone is not enough: it lives in a gitignored folder, and a
 * pull, merge, or checkout changes records without bumping it.
 */
export function enableProjectionCache(): void {
  projectionCache ??= new Map();
}

/**
 * A hash of every record file's path, size, and modification time under
 * `root`. Statting a few thousand files takes milliseconds, far less than
 * rebuilding the graph.
 */
async function recordFingerprint(root: string): Promise<string> {
  const hash = createHash('sha256');
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name === '.journal') continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name.endsWith('.md')) {
        const info = await stat(path).catch(() => null);
        if (info) hash.update(`${path}\0${info.size}\0${info.mtimeMs}\n`);
      }
    }
  };
  await walk(root);
  return hash.digest('hex');
}

async function makeProjection(
  options: EffortProjectionOptions
): Promise<EngineProjection> {
  if (!projectionCache) return loadProjection(options);
  const root = await realpath(options.rootDir).catch(() => options.rootDir);
  const key = `${root}\0${await generation(root)}\0${await recordFingerprint(
    root
  )}`;
  let projection = projectionCache.get(key);
  if (!projection) {
    for (const stale of [...projectionCache.keys()])
      if (stale.startsWith(`${root}\0`)) projectionCache.delete(stale);
    projection = loadProjection(options);
    projection.catch(() => projectionCache?.delete(key));
    projectionCache.set(key, projection);
  }
  return projection;
}

async function render(
  options: EffortProjectionOptions,
  query: Record<string, unknown>,
  records: ReadRecord[],
  edges: ReadEdge[],
  hints: string[] = [],
  extra: {
    checkpointLines?: string[];
    anomaly?: string;
    relatedRecords?: ReadRecord[];
    fullBody?: boolean;
    sections?: DigestSection[];
    compaction?: CompactionStatus;
  } = {}
): Promise<ReadEnvelope> {
  const served = await servedGeneration(options.rootDir, options.consistency);
  const normalized = canonicalizeReadQuery({
    ...query,
    page: {
      ...(query.page as RawNode | undefined),
      limit: (query.page as RawNode | undefined)?.limit ?? 25,
    },
    consistency: options.consistency ?? { mode: 'eventual' },
  });
  const hash = readQueryHash(normalized);
  const cursorHash = readQueryHash(baseCursorQuery(normalized));
  const page = query.page as { cursor?: string; limit?: number } | undefined;
  const limit = page?.limit ?? 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > 25)
    throw new ProofReadValidationError(
      'PROOF_INVALID_ARGUMENT',
      'page.limit must be an integer between 1 and 25'
    );
  const offset = page?.cursor
    ? decodeCursor(page.cursor, cursorHash, served)
    : 0;
  const selected = records.slice(offset, offset + limit);
  const hasMore = offset + selected.length < records.length;
  return renderDigest({
    query: normalized,
    queryHash: hash,
    generation: served,
    consistency:
      options.consistency?.mode === 'strict'
        ? { mode: 'strict', min_generation: options.consistency.min_generation }
        : { mode: 'eventual', min_generation: null },
    records: selected,
    totalKnown: records.length,
    edges,
    cacheRoot: options.cacheRoot,
    hasMore,
    cursor: page?.cursor ?? null,
    nextCursor: hasMore
      ? encodeCursor({
          v: 1,
          query_hash: cursorHash,
          served_generation: served,
          offset: offset + selected.length,
        })
      : null,
    hints,
    ...extra,
  });
}

export async function getRecord(
  id: string,
  options: EffortProjectionOptions & { resolve?: 'exact' | 'head' }
): Promise<ReadEnvelope> {
  const projection = await makeProjection(options);
  const collection = collectionForId(id);
  if (!collection) return render(options, { type: 'getRecord', id }, [], []);
  const requested = await projection.one(collection, id);
  let record = requested;
  const checkpoints: string[] = [];
  let anomaly: string | undefined;
  if (record && options.resolve === 'head') {
    const seen = new Set([record.id]);
    while (true) {
      const currentRecord: ReadRecord = record;
      const nextId: string | undefined =
        currentRecord.relations.superseded_by?.[0];
      if (!nextId) break;
      if ((currentRecord.relations.superseded_by?.length ?? 0) > 1) {
        anomaly = 'supersession fork detected';
        break;
      }
      const next: ReadRecord | undefined = await projection.one(
        collection,
        nextId
      );
      if (!next || seen.has(next.id)) {
        anomaly = next ? 'supersession cycle detected' : undefined;
        break;
      }
      seen.add(next.id);
      checkpoints.unshift(
        `${currentRecord.id} | ${String(
          currentRecord.frontmatter.title ?? ''
        )} | ${String(currentRecord.frontmatter.state ?? '')} | ${String(
          currentRecord.frontmatter.created_at ?? ''
        )} | superseded_by ${next.id}`
      );
      record = next;
    }
  }
  const displayed = requested && anomaly ? requested : record;
  const foreignReferences: string[] = [];
  if (displayed) {
    for (const targetId of displayed.relations.derives_from ?? []) {
      const targetCollection = collectionForId(targetId);
      const target = targetCollection
        ? await projection.one(targetCollection, targetId)
        : undefined;
      // A direct get still opens the requested record when a stored cause is
      // dangling; relations reports the broken edge explicitly.
      if (!target) continue;
      const effort = owningEffort(target);
      if (effort && effort !== owningEffort(displayed)) {
        const state = target.frontmatter.retracted
          ? 'retracted'
          : target.frontmatter.state ?? target.frontmatter.status ?? 'none';
        foreignReferences.push(
          `foreign derives_from -> ${target.id} (${
            target.kind
          }; effort ${effort}; state ${String(state)})`
        );
      }
    }
  }
  const foreignLimit = 25;
  const overflow = foreignReferences.length - foreignLimit;
  return render(
    options,
    {
      type: 'getRecord',
      id,
      ...(options.resolve ? { resolve: options.resolve } : {}),
    },
    displayed ? [displayed] : [],
    [],
    undefined,
    {
      checkpointLines: [
        ...checkpoints.slice(-5),
        ...foreignReferences.slice(0, foreignLimit),
        ...(overflow > 0
          ? [
              `${overflow} more foreign references; use proof relations to page through them`,
            ]
          : []),
      ],
      anomaly,
      fullBody: true,
    }
  );
}

/**
 * Which records a browse read returns by retraction: live ones only (the
 * default), live and retracted together, or retracted ones only. Digests mark
 * every retracted record, so it cannot pass for a live one.
 */
export type RetractedMode = 'exclude' | 'include' | 'only';
const RETRACTED_MODES: readonly RetractedMode[] = [
  'exclude',
  'include',
  'only',
];

export async function effortRecords(
  effortId: string,
  options: EffortProjectionOptions & {
    kinds?: PrimitiveKind[];
    where?: {
      state?: string[];
      status?: string[];
      kind?: string[];
      created_at?: { gte?: string; lte?: string };
    };
    retracted?: RetractedMode;
    page?: { cursor?: string; limit?: number };
  }
): Promise<ReadEnvelope> {
  const retracted = options.retracted ?? 'exclude';
  if (!RETRACTED_MODES.includes(retracted))
    throw new ProofReadValidationError(
      'PROOF_INVALID_ARGUMENT',
      `Invalid retracted mode: ${String(
        retracted
      )}. Expected exclude, include, or only.`
    );
  const projection = await makeProjection(options);
  const kinds = options.kinds?.length
    ? [...new Set(options.kinds)].sort()
    : ([
        'issue',
        'finding',
        'decision',
        'constraint',
        'risk',
        'citation',
      ] as PrimitiveKind[]);
  const where = options.where ?? {};
  // Default kinds include citation but omit blob (opt in via --kinds). The
  // generated relation field materializes as an object, so its `eq` comparator
  // does not match the stored identifier. Scalar predicates still execute in
  // Flatbread; effort ownership is normalized and intersected here.
  const filter: Record<string, unknown> = {};
  if (where.state?.length) filter.state = { in: where.state };
  if (where.status?.length) filter.status = { in: where.status };
  if (where.kind?.length) filter.kind = { in: where.kind };
  if (where.created_at?.gte) filter.created_at = { gte: where.created_at.gte };
  if (where.created_at?.lte)
    filter.created_at = {
      ...(filter.created_at as RawNode),
      lte: where.created_at.lte,
    };
  const records = sortRecords(
    (
      await Promise.all(
        kinds.map((kind) => projection.query(KIND_TO_COLLECTION[kind], filter))
      )
    )
      .flat()
      .filter(
        (record) =>
          record.frontmatter.effort === effortId &&
          (retracted === 'include' ||
            (retracted === 'only') === isRetracted(record))
      )
  );
  return render(
    options,
    {
      type: 'effortRecords',
      effort_id: effortId,
      kinds,
      ...(Object.keys(where).length ? { where } : {}),
      // Left out by default, so existing queries keep their hashes.
      ...(retracted === 'exclude' ? {} : { retracted }),
      page: options.page,
    },
    records,
    [],
    [
      `blockingDecisions("${effortId}")`,
      ...kinds
        .slice(0, 8)
        .map((kind) => `effortRecords("${effortId}", { kinds: ["${kind}"] })`),
    ]
  );
}

export async function listEfforts(
  statuses: string[],
  options: EffortProjectionOptions & {
    page?: { cursor?: string; limit?: number };
  }
): Promise<ReadEnvelope> {
  const allowed = new Set(['active', 'paused', 'completed', 'abandoned']);
  const normalizedStatuses = [...new Set(statuses)];
  const invalid = normalizedStatuses.filter((status) => !allowed.has(status));
  if (invalid.length)
    throw new ProofReadValidationError(
      'PROOF_INVALID_ARGUMENT',
      `Invalid effort status: ${invalid.join(
        ', '
      )}. Expected active, paused, completed, or abandoned.`
    );
  const projection = await makeProjection(options);
  const records = sortRecords(
    (
      await projection.query('Effort', {
        status: { in: normalizedStatuses },
      })
    ).filter(
      (record) =>
        normalizedStatuses.includes(String(record.frontmatter.status)) &&
        !isRetracted(record)
    )
  );
  return render(
    options,
    {
      type: 'listEfforts',
      status: normalizedStatuses.sort(),
      page: options.page,
    },
    records,
    [],
    records.flatMap((record) => [
      `effortRecords("${record.id}")`,
      `blockingDecisions("${record.id}")`,
    ])
  );
}

export async function relations(
  effortId: string,
  fromId: string,
  relationNames: ReadRelation[],
  options: EffortProjectionOptions & {
    page?: { cursor?: string; limit?: number };
  }
): Promise<ReadEnvelope> {
  if (
    !relationNames.length ||
    relationNames.some(
      (name) => !(READ_RELATIONS as readonly string[]).includes(name)
    )
  )
    throw new Error('relations must contain only valid ReadRelation values');
  const projection = await makeProjection(options);
  const collection = collectionForId(fromId);
  const source = collection
    ? await projection.one(collection, fromId)
    : undefined;
  const sourceInEffort = source ? owningEffort(source) === effortId : false;
  if (!source || !sourceInEffort)
    throw new Error(`Record ${fromId} does not exist in effort ${effortId}`);
  const selected = new Map<string, ReadRecord>();
  const dangling: { relation: ReadRelation; to_id: string }[] = [];
  const foreign: {
    relation: ReadRelation;
    to_id: string;
    target_effort_id: string | null;
  }[] = [];
  for (const relation of relationNames) {
    for (const targetId of source.relations[relation] ?? []) {
      const targetCollection = collectionForId(targetId);
      const target = targetCollection
        ? await projection.one(targetCollection, targetId)
        : undefined;
      // A stored id that no record answers to means the graph is corrupt. Report
      // it instead of returning provenance that dropped the edge in silence.
      if (!target) {
        dangling.push({ relation, to_id: targetId });
        continue;
      }
      const targetEffort = owningEffort(target);
      if (targetEffort !== effortId) {
        if (relation === 'derives_from' && targetEffort) {
          selected.set(`${relation}\0${target.id}`, {
            ...target,
            foreign_reference: { relation, effort_id: targetEffort },
          });
        } else {
          foreign.push({
            relation,
            to_id: target.id,
            target_effort_id: targetEffort ?? null,
          });
        }
        continue;
      }
      selected.set(target.id, target);
    }
  }
  if (dangling.length) throw new ProofDanglingRelationError(fromId, dangling);
  if (foreign.length)
    throw new ProofCrossEffortRelationError(effortId, fromId, foreign);
  const records = sortRecords([...selected.values()]);
  const edges = records.flatMap((record) =>
    record.foreign_reference
      ? []
      : relationNames
          .filter((relation) =>
            (source.relations[relation] ?? []).includes(record.id)
          )
          .map((relation) => ({ from_id: fromId, relation, to_id: record.id }))
  );
  return render(
    options,
    {
      type: 'relations',
      effort_id: effortId,
      from_id: fromId,
      relations: [...new Set(relationNames)].sort(),
      page: options.page,
    },
    records,
    edges,
    [`getRecord("${fromId}")`]
  );
}

export async function blockingDecisions(
  effortId: string,
  options: EffortProjectionOptions & {
    page?: { cursor?: string; limit?: number };
  }
): Promise<ReadEnvelope> {
  const projection = await makeProjection(options);
  const issues = (
    await projection.query('Issue', {
      kind: { eq: 'blocker' },
      status: { eq: 'open' },
    })
  ).filter(
    (issue) => issue.frontmatter.effort === effortId && !isRetracted(issue)
  );
  const blockerIds = new Set(issues.map((issue) => issue.id));
  const decisions = sortRecords(
    (
      await projection.query('Decision', {
        state: { eq: 'proposed' },
      })
    ).filter(
      (decision) =>
        decision.frontmatter.effort === effortId &&
        !isRetracted(decision) &&
        (decision.relations.derives_from ?? []).some((id) => blockerIds.has(id))
    )
  );
  return render(
    options,
    { type: 'blockingDecisions', effort_id: effortId, page: options.page },
    decisions,
    [],
    [
      ...decisions.slice(0, 10).map((record) => `getRecord("${record.id}")`),
      ...issues
        .slice(0, 10)
        .map(
          () =>
            `effortRecords("${effortId}", { kinds: ["issue"], where: { kind: ["blocker"], status: ["open"] } })`
        ),
    ],
    { relatedRecords: issues }
  );
}

// Citations and Blobs are never live records, but `derives_from` may name
// them, so `brief` loads them to check whether those targets moved.
const BRIEF_COLLECTIONS: readonly Collection[] = [
  'Issue',
  'Finding',
  'Decision',
  'Constraint',
  'Risk',
  'Citation',
  'Blob',
];
const BRIEF_LINE_LIMIT = 50;
const BRIEF_CHECKPOINT_LIMIT = 5;

/** Relation fields join the frontmatter so standing reads one flat map. */
function standingRecord(record: ReadRecord) {
  return {
    id: record.id,
    kind: record.kind,
    frontmatter: { ...record.frontmatter, ...record.relations },
  };
}

function changeLines(changes: readonly CompactionChange[]): string[] {
  const lines = changes
    .slice(0, BRIEF_LINE_LIMIT)
    .map(
      (change) =>
        `- ${change.change} | ${change.id} | ${change.kind ?? 'unknown'} | ${
          change.from ?? 'none'
        } -> ${change.to ?? 'missing'} | ${change.title}`
    );
  if (changes.length > BRIEF_LINE_LIMIT)
    lines.push(
      `- … ${changes.length - BRIEF_LINE_LIMIT} more; write a new compaction`
    );
  return lines;
}

/**
 * Where an Effort stands, in one bounded read: the head compaction in full,
 * older compactions as one-line checkpoints, and each record whose standing
 * moved since the head's `covers` snapshot. Nothing here is generated; every
 * line comes from stored records, so the digest is deterministic.
 */
export async function effortBrief(
  effortId: string,
  options: EffortProjectionOptions
): Promise<ReadEnvelope> {
  const projection = await makeProjection(options);
  if (!(await projection.one('Effort', effortId)))
    throw new ProofReadValidationError(
      'PROOF_INVALID_ARGUMENT',
      `Effort ${effortId} does not exist`
    );
  const records = (
    await Promise.all(
      BRIEF_COLLECTIONS.map((collection) => projection.query(collection))
    )
  )
    .flat()
    .filter((record) => record.frontmatter.effort === effortId);
  const byId = new Map(records.map((record) => [record.id, record]));
  const standing = records.map(standingRecord);
  const heads = sortRecords(
    compactionHeads(standing).map((head) => byId.get(head.id) as ReadRecord)
  );
  const head = heads.at(-1);
  const sections: DigestSection[] = [];
  const checkpoints: string[] = [];
  const anomalies: string[] = [];
  let changes: CompactionChange[];
  let stale: CompactionChange[] = [];
  let invalidated = false;
  if (!head) {
    changes = compactionChanges(new Map(), standing);
    sections.push({
      heading: 'Live records (no compaction yet)',
      lines: changeLines(changes),
    });
  } else {
    const covers = parseCovers(head.frontmatter.covers);
    changes = compactionChanges(covers, standing);
    stale = staleDerivations(
      covers,
      head.relations.derives_from ?? [],
      standing
    );
    invalidated = (head.relations.invalidated_by ?? []).length > 0;
    if (heads.length > 1)
      anomalies.push(
        `compaction fork: ${heads.length} head compactions; the next WriteCompaction supersedes all of them`
      );
    if (invalidated) anomalies.push('head compaction was invalidated');
    // Walk `supersedes` back from the head. Bodies stay out: one line each.
    const ancestors = new Map<string, ReadRecord>();
    const queue = [...(head.relations.supersedes ?? [])];
    while (queue.length) {
      const id = queue.shift() as string;
      const ancestor = byId.get(id);
      if (!ancestor || ancestors.has(id)) continue;
      ancestors.set(id, ancestor);
      queue.push(...(ancestor.relations.supersedes ?? []));
    }
    const lineage = sortRecords([...ancestors.values()]).reverse();
    checkpoints.push(
      ...lineage
        .slice(0, BRIEF_CHECKPOINT_LIMIT)
        .map(
          (record) =>
            `${record.id} | ${String(
              record.frontmatter.title ?? ''
            )} | ${String(
              record.frontmatter.created_at ?? ''
            )} | superseded_by ${(record.relations.superseded_by ?? []).join(
              ', '
            )}`
        )
    );
    if (lineage.length > BRIEF_CHECKPOINT_LIMIT)
      checkpoints.push(
        `… ${lineage.length - BRIEF_CHECKPOINT_LIMIT} older compactions`
      );
    sections.push({
      heading: 'Changes since compaction',
      lines: changes.length ? changeLines(changes) : ['- none'],
    });
    if (stale.length)
      sections.push({
        heading: 'Stale derivations',
        lines: changeLines(stale),
      });
  }
  const compaction: CompactionStatus = {
    head_id: head?.id ?? null,
    heads: heads.length,
    stale: stale.length > 0 || invalidated,
    changes: changes.length,
    recompact:
      !head ||
      heads.length > 1 ||
      stale.length > 0 ||
      invalidated ||
      changes.length >= RECOMPACT_CHANGE_THRESHOLD,
  };
  const edges: ReadEdge[] = head
    ? (['derives_from', 'supersedes', 'cites'] as const).flatMap((relation) =>
        (head.relations[relation] ?? []).map((to_id) => ({
          from_id: head.id,
          relation,
          to_id,
        }))
      )
    : [];
  const changedIds = [...stale, ...changes]
    .filter((change) => change.to !== null)
    .map((change) => `getRecord("${change.id}")`);
  return render(
    options,
    { type: 'effortBrief', effort_id: effortId },
    head ? [head] : [],
    edges,
    [
      ...(head
        ? [`relations("${effortId}", "${head.id}", ["derives_from"])`]
        : [`effortRecords("${effortId}")`]),
      ...new Set(changedIds),
    ],
    {
      checkpointLines: checkpoints,
      anomaly: anomalies.length ? anomalies.join('; ') : undefined,
      fullBody: true,
      sections,
      compaction,
    }
  );
}
