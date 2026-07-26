import { FlatbreadProvider, type LoadedFlatbreadConfig } from '@flatbread/core';
import {
  canonicalizeReadQuery,
  EffortGraphConsistencyError,
  EffortGraphInvalidCursorError,
  EffortGraphReadValidationError,
  READ_RELATIONS,
  readQueryHash,
  renderDigest,
  type ReadEdge,
  type ReadEnvelope,
  type ReadRecord,
  type ReadRelation,
  type ConsistencyErrorShape,
  type PrimitiveKind,
} from '@flatbread/effort-graph';
import { loadConfig } from '@flatbread/config';
import { relative, resolve } from 'node:path';

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
  'derives_from',
  'supersedes',
  'superseded_by',
  'invalidates',
  'invalidated_by',
  'resolved_by',
  'rejected_by',
  'mitigated_by',
  'evidence',
  'cites',
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
    if (error instanceof EffortGraphInvalidCursorError) throw error;
    throw new EffortGraphInvalidCursorError(`Invalid cursor: ${String(error)}`);
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
        code: 'EFFORT_GRAPH_GENERATION_WAIT_TIMEOUT',
        message: `Durable Effort Graph generation ${wanted} was not observed (current: ${current})`,
        requested_generation: requestedGeneration,
        timeout_ms: timeout,
      },
    };
    throw new EffortGraphConsistencyError(shape);
  }
  return String(current);
}

function parseGenerationToken(value: unknown): number {
  if (
    typeof value !== 'string' ||
    !/^(0|[1-9]\d*)$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  )
    throw new EffortGraphReadValidationError(
      'EFFORT_GRAPH_INVALID_GENERATION',
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
      'derives_from',
      'invalidates',
      'invalidated_by',
      'resolved_by',
      'evidence',
      'role',
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

async function makeProjection(
  options: EffortProjectionOptions
): Promise<EngineProjection> {
  const loaded = await loadConfig({ cwd: options.cwd });
  if (!loaded.config) throw new Error('Flatbread config is not defined');
  return new EngineProjection(configForCwd(loaded.config, options.cwd));
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
    throw new EffortGraphReadValidationError(
      'EFFORT_GRAPH_INVALID_ARGUMENT',
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
  return render(
    options,
    {
      type: 'getRecord',
      id,
      ...(options.resolve ? { resolve: options.resolve } : {}),
    },
    requested && anomaly ? [requested] : record ? [record] : [],
    [],
    undefined,
    { checkpointLines: checkpoints.slice(-5), anomaly, fullBody: true }
  );
}

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
    page?: { cursor?: string; limit?: number };
  }
): Promise<ReadEnvelope> {
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
      .filter((record) => record.frontmatter.effort === effortId)
  );
  return render(
    options,
    {
      type: 'effortRecords',
      effort_id: effortId,
      kinds,
      ...(Object.keys(where).length ? { where } : {}),
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
    throw new EffortGraphReadValidationError(
      'EFFORT_GRAPH_INVALID_ARGUMENT',
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
    ).filter((record) =>
      normalizedStatuses.includes(String(record.frontmatter.status))
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
  const sourceInEffort =
    source?.kind === 'effort' && fromId === effortId
      ? true
      : source?.frontmatter.effort === effortId;
  if (!source || !sourceInEffort)
    throw new Error(`Record ${fromId} does not exist in effort ${effortId}`);
  const selected = new Map<string, ReadRecord>();
  for (const relation of relationNames) {
    for (const targetId of source.relations[relation] ?? []) {
      const targetCollection = collectionForId(targetId);
      if (!targetCollection) continue;
      const target = await projection.one(targetCollection, targetId);
      if (target?.frontmatter.effort === effortId)
        selected.set(target.id, target);
    }
  }
  const records = sortRecords([...selected.values()]);
  const edges = records.flatMap((record) =>
    relationNames
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
  ).filter((issue) => issue.frontmatter.effort === effortId);
  const blockerIds = new Set(issues.map((issue) => issue.id));
  const decisions = sortRecords(
    (
      await projection.query('Decision', {
        state: { eq: 'proposed' },
      })
    ).filter(
      (decision) =>
        decision.frontmatter.effort === effortId &&
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
