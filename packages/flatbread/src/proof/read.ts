import { FlatbreadProvider, type LoadedFlatbreadConfig } from '@flatbread/core';
import {
  canonicalizeReadQuery,
  COMPACTION_STALE_RULE,
  compactionChanges,
  compactionHeads,
  compactionReport,
  isCompaction,
  RECOMPACT_CHANGE_THRESHOLD,
  type CompactionChange,
  type CompactionStatus,
  type DigestSection,
  ProofConsistencyError,
  ProofCrossEffortRelationError,
  ProofDanglingRelationError,
  ProofInvalidCursorError,
  ProofReadValidationError,
  DecisionFrontmatterSchema,
  IssueFrontmatterSchema,
  RiskFrontmatterSchema,
  READ_RELATIONS,
  readQueryHash,
  renderDigest,
  type ReadCapReason,
  type ReadEdge,
  type ReadEnvelope,
  type ReadRecord,
  type ReadRelation,
  type ConsistencyErrorShape,
  type PrimitiveKind,
} from '@flatbread/proof';
import { loadConfig } from '@flatbread/config';
import {
  buildFindIndex,
  FIND_DEFAULT_LIMIT,
  FIND_MAX_LIMIT,
  findRecords,
  renderFindCards,
  standingOf,
  headsOf,
  type FindHit,
  type FindIndex,
  type FindResult,
  type FindVia,
} from './find.js';
import {
  git,
  governingRecords,
  parseCodeTarget,
  trailerCommits,
  type CodeTarget,
  type TrailerCommit,
} from './anchors.js';
import {
  branchCandidates,
  buildOverlay,
  changeCounts,
  conflictsInScope,
  pathInTrees,
  proofRepository,
  readRefSides,
  refsLine,
  type Overlay,
  type RefSide,
} from './refs.js';
import {
  buildEffortState,
  DEAD_STANDINGS,
  restsOnDead,
  type EffortState,
} from './state.js';
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
  private findIndexPromise?: Promise<FindIndex>;
  private overlays = new Map<
    string,
    Promise<{ overlay: Overlay; index: FindIndex }>
  >();

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

  /**
   * The `find` index over every record. It lives on the projection, so a
   * cached projection keeps its index and a rebuilt one builds a new one.
   */
  findIndex(): Promise<FindIndex> {
    if (!this.findIndexPromise) {
      this.findIndexPromise = Promise.all(
        COLLECTIONS.map((collection) => this.query(collection))
      ).then((records) => buildFindIndex(records.flat()));
      this.findIndexPromise.catch(() => (this.findIndexPromise = undefined));
    }
    return this.findIndexPromise;
  }

  /**
   * The `find` index over the base records and the given refs, kept for the
   * last few ref sets. Keyed by each ref's commit, so a moved ref builds anew.
   */
  overlayIndex(
    sides: readonly RefSide[]
  ): Promise<{ overlay: Overlay; index: FindIndex }> {
    // The pull request and the per-side id sets go in the key too: tags and
    // conflicts read them, and the sets follow the working tree.
    const sorted = (set?: ReadonlySet<string>) => [...(set ?? [])].sort();
    const key = sides
      .map(
        (side) =>
          `${side.name}@${side.sha}${JSON.stringify([
            side.pr ?? {},
            sorted(side.baseChanged),
            sorted(side.sameAsBase),
            sorted(side.older),
            sorted(side.deleted),
          ])}`
      )
      .join('\0');
    let found = this.overlays.get(key);
    if (!found) {
      found = this.findIndex().then((base) => {
        const overlay = buildOverlay([...base.records.values()], sides);
        return { overlay, index: buildFindIndex(overlay.records) };
      });
      found.catch(() => this.overlays.delete(key));
      if (this.overlays.size >= 4)
        this.overlays.delete(this.overlays.keys().next().value as string);
      this.overlays.set(key, found);
    }
    return found;
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
    capReasons?: ReadCapReason[];
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
  const sections =
    displayed && isCompaction(standingRecord(displayed))
      ? await compactionSections(projection, displayed)
      : undefined;
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
      ...(sections ? { sections } : {}),
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

/**
 * Every word `proof records --standing` takes: the stored states and
 * statuses, `live` for a Finding or Constraint, and the standings that come
 * from links. They are the words cards and `proof state` print.
 */
const STANDINGS: readonly string[] = [
  'open',
  'resolved',
  'deferred',
  'wontfix',
  'proposed',
  'accepted',
  'rejected',
  'deprecated',
  'realized',
  'mitigated',
  'live',
  'superseded',
  'invalidated',
  'retracted',
];
/** The values `--state` and `--status` match, as the record schemas store them. */
const STORED_STATES: readonly string[] = [
  ...new Set([
    ...DecisionFrontmatterSchema.shape.state.options,
    ...RiskFrontmatterSchema.shape.state.options,
  ]),
];
const STORED_STATUSES: readonly string[] =
  IssueFrontmatterSchema.shape.status.options;

/**
 * Refuses a `--state` or `--status` value no record stores. An agent that
 * asks for `--state invalidated` would otherwise get an empty, complete
 * page, so the message says which flags filter by standing instead.
 */
function checkStored(
  field: 'state' | 'status',
  values: readonly string[] | undefined,
  stored: readonly string[]
): void {
  const bad = (values ?? []).filter((value) => !stored.includes(value));
  if (!bad.length) return;
  const example = bad.find((value) => STANDINGS.includes(value));
  const dead =
    example && DEAD_STANDINGS.includes(example) ? example : 'invalidated';
  throw new ProofReadValidationError(
    'PROOF_INVALID_ARGUMENT',
    `${bad.map((value) => `\`${value}\``).join(', ')} ${
      bad.length === 1 ? 'is not a stored' : 'are not stored'
    } ${field}. Stored ${field} values: ${stored.join(
      ', '
    )}. Standing that links or retraction decide (superseded, invalidated, retracted) is filtered with \`--standing ${
      example ?? 'invalidated'
    }\`; it takes ${STANDINGS.join(
      ', '
    )}. \`--rests-on ${dead}\` lists live records that derive from, cite, or give as evidence a record in that standing.`
  );
}

function checkWords(
  flag: string,
  values: readonly string[] | undefined,
  allowed: readonly string[]
): void {
  const bad = (values ?? []).filter((value) => !allowed.includes(value));
  if (bad.length)
    throw new ProofReadValidationError(
      'PROOF_INVALID_ARGUMENT',
      `Invalid ${flag}: ${bad.join(', ')}. Expected ${allowed.join(', ')}.`
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
    retracted?: RetractedMode;
    /** Keeps records whose standing, as `proof state` prints it, is one of these. */
    standing?: string[];
    /** Keeps live records that rest on a record in one of these dead standings. */
    restsOn?: string[];
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
  checkStored('state', options.where?.state, STORED_STATES);
  checkStored('status', options.where?.status, STORED_STATUSES);
  const standing = options.standing?.length
    ? [...new Set(options.standing)].sort()
    : undefined;
  const restsOn = options.restsOn?.length
    ? [...new Set(options.restsOn)].sort()
    : undefined;
  checkWords('standing', standing, STANDINGS);
  checkWords('rests-on standing', restsOn, DEAD_STANDINGS);
  // Retracted records are hidden by default; asking for that standing
  // shows them.
  const shown: RetractedMode =
    standing?.includes('retracted') && retracted === 'exclude'
      ? 'include'
      : retracted;
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
          (shown === 'include' || (shown === 'only') === isRetracted(record)) &&
          (!standing || standing.includes(standingOf(record)))
      )
  );
  if (restsOn) {
    // A support may be any kind, in any Effort. The `find` index holds
    // every record, as `proof state` reads them, and a served graph keeps it.
    const index = await projection.findIndex();
    const get = (id: string) => index.records.get(id);
    records.splice(
      0,
      records.length,
      ...records.filter((record) => restsOnDead(record, get, restsOn).length)
    );
  }
  return render(
    options,
    {
      type: 'effortRecords',
      effort_id: effortId,
      kinds,
      ...(Object.keys(where).length ? { where } : {}),
      // Left out by default, so existing queries keep their hashes.
      ...(retracted === 'exclude' ? {} : { retracted }),
      ...(standing ? { standing } : {}),
      ...(restsOn ? { rests_on: restsOn } : {}),
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

function changeLines(
  changes: readonly CompactionChange[],
  limit = BRIEF_LINE_LIMIT,
  rest = 'write a new compaction'
): string[] {
  const lines = changes
    .slice(0, limit)
    .map(
      (change) =>
        `- ${change.change} | ${change.id} | ${change.kind ?? 'unknown'} | ${
          change.from ?? 'none'
        } -> ${change.to ?? 'missing'} | ${change.title}`
    );
  if (changes.length > limit)
    lines.push(`- … ${changes.length - limit} more${rest ? `; ${rest}` : ''}`);
  return lines;
}

/** Most change lines `get` shows on a compaction. */
const GET_CHANGE_LIMIT = 25;

/**
 * What `get` adds on a compaction: whether it is its Effort's head, whether
 * it is stale and why, and each record whose standing moved since it was
 * written. `brief` works these out the same way for the head, so a reader
 * who opens any compaction directly gets the same answer.
 */
async function compactionSections(
  projection: EngineProjection,
  compaction: ReadRecord
): Promise<DigestSection[]> {
  const effortId = owningEffort(compaction);
  const records = (
    await Promise.all(
      BRIEF_COLLECTIONS.map((collection) => projection.query(collection))
    )
  )
    .flat()
    .filter((record) => record.frontmatter.effort === effortId);
  const byId = new Map(records.map((record) => [record.id, record]));
  const standing = records.map(standingRecord);
  const heads = compactionHeads(standing).map((head) => head.id);
  const report = compactionReport(standingRecord(compaction), standing);
  const derivesFrom = [...new Set(compaction.relations.derives_from ?? [])];
  const dated = (id: string) =>
    `${id} (${
      String(byId.get(id)?.frontmatter.created_at ?? '').slice(0, 10) ||
      'undated'
    })`;
  const supersededBy = compaction.relations.superseded_by ?? [];
  const invalidatedBy = compaction.relations.invalidated_by ?? [];
  const head = heads.includes(compaction.id)
    ? heads.length > 1
      ? `yes, one of ${heads.length} heads; the next WriteCompaction supersedes all of them`
      : 'yes'
    : supersededBy.length
    ? `no; superseded by ${supersededBy.map(dated).join(', ')}`
    : compaction.frontmatter.retracted === true
    ? 'no; retracted'
    : 'no';
  const reasons = [
    ...(report.stale.length
      ? [
          `${report.stale.length} of the ${derivesFrom.length} ${
            derivesFrom.length === 1 ? 'record' : 'records'
          } it derives from changed standing: ${report.stale
            .map(
              (change) =>
                `${change.id} ${change.from ?? 'none'} -> ${
                  change.to ?? 'missing'
                }`
            )
            .join(', ')}.`,
        ]
      : []),
    ...(report.invalidated
      ? [`Invalidated by ${invalidatedBy.map(dated).join(', ')}.`]
      : []),
  ];
  const tally = (type: CompactionChange['change']) =>
    report.changes.filter((change) => change.change === type).length;
  const differ = report.changes.length;
  return [
    {
      heading: 'Compaction',
      lines: [
        `- Head compaction of its Effort: ${head}`,
        report.isStale
          ? `- Stale: yes. ${reasons.join(' ')} ${COMPACTION_STALE_RULE}`
          : `- Stale: no. None of the ${derivesFrom.length} ${
              derivesFrom.length === 1 ? 'record' : 'records'
            } it derives from changed standing, and nothing invalidated it. ${COMPACTION_STALE_RULE}`,
        `- Since it was written, ${differ} ${
          differ === 1 ? 'record differs' : 'records differ'
        } from the live set it covers. This count is exact: ${tally(
          'added'
        )} new live, ${tally('left')} covered and no longer live, ${tally(
          'changed'
        )} covered with a new standing.`,
      ],
    },
    {
      heading: 'Changes since compaction',
      lines: differ
        ? changeLines(
            report.changes,
            GET_CHANGE_LIMIT,
            // Nothing pages the rest. For the head, `brief` lists more.
            heads.includes(compaction.id) && effortId
              ? `the count above is exact; \`proof brief ${effortId}\` lists up to ${BRIEF_LINE_LIMIT}`
              : 'the count above is exact'
          )
        : ['- none'],
    },
  ];
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
    ({ changes, stale, invalidated } = compactionReport(
      standingRecord(head),
      standing
    ));
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

/** A `find` envelope: the usual read fields plus the hit cards inline. */
export interface FindEnvelope extends ReadEnvelope {
  find: {
    query: string;
    effort_id: string | null;
    searched: number;
    matched: number;
    shown: number;
    terms: { matched: string[]; missing: string[] };
    /** Searching every Effort: the Efforts whose best 3 hits score highest. */
    efforts?: { id: string; mass: number }[];
    /** In card order; `matched_id` names an older version when it matched. */
    hits: {
      id: string;
      matched_id?: string;
      score: number;
      /** With `--path`: what ties the hit's chain to the code. */
      via?: string[];
      /** With `--refs`: `main`, `only on <ref>`, or `differs on <ref>: …`. */
      branch?: string;
    }[];
    /** With `--path`: the code searched, as the header prints it. */
    path?: string;
    /**
     * With `--path` and no hits: the path is not in the working tree, and
     * which refs have it.
     */
    note?: string;
    /** With `--refs`: the refs overlaid. */
    refs?: {
      name: string;
      sha: string;
      changed: number;
      pr?: { number: number; draft: boolean; author: string };
    }[];
    /** With `--refs`: the first 12 conflicts in scope, as the cards list them. */
    conflicts?: string[];
    /** With `--refs`: how many conflicts there are in scope. */
    conflicts_total?: number;
  };
  /** The hit cards as Markdown, so the agent needs no second Read. */
  cards: string;
}

const FIND_KINDS: readonly PrimitiveKind[] = [
  'issue',
  'finding',
  'decision',
  'constraint',
  'risk',
  'citation',
  'blob',
];

/**
 * An as-of date: `YYYY-MM-DD` (read as UTC midnight) or a date-time with `Z`
 * or an offset. Other forms are refused, because JavaScript reads them in the
 * machine's own time zone and the hits would differ between machines.
 */
const AS_OF =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/;

function roundScore(score: number): number {
  return Math.round(score * 1000) / 1000;
}

/**
 * Finds records by what they say: BM25 over titles, full bodies, a few
 * frontmatter fields, and Blob payloads, one hit per supersession chain.
 * The envelope carries the cards inline and writes them, with each hit's
 * record, to the usual digest.
 */
export async function effortFind(
  query: string,
  options: EffortProjectionOptions & {
    effort?: string;
    kinds?: PrimitiveKind[];
    asOf?: string;
    retracted?: RetractedMode;
    limit?: number;
    /** `--path`: a file, folder, symbol, or `file#symbol`. */
    path?: string;
    /** `--refs`: ref names, or `all`. */
    refs?: readonly string[] | 'all';
  }
): Promise<FindEnvelope> {
  const invalid = (message: string): never => {
    throw new ProofReadValidationError('PROOF_INVALID_ARGUMENT', message);
  };
  const retracted = options.retracted ?? 'exclude';
  if (!RETRACTED_MODES.includes(retracted))
    invalid(
      `Invalid retracted mode: ${String(
        retracted
      )}. Expected exclude, include, or only.`
    );
  const limit = options.limit ?? FIND_DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > FIND_MAX_LIMIT)
    invalid(`limit must be an integer between 1 and ${FIND_MAX_LIMIT}`);
  if (
    options.asOf !== undefined &&
    (!AS_OF.test(options.asOf) || Number.isNaN(Date.parse(options.asOf)))
  )
    invalid(
      `Invalid as-of date: ${options.asOf}. Expected YYYY-MM-DD or an ISO date-time with Z or an offset.`
    );
  const kinds = options.kinds?.length
    ? [...new Set(options.kinds)].sort()
    : undefined;
  const badKinds = (kinds ?? []).filter((kind) => !FIND_KINDS.includes(kind));
  if (badKinds.length)
    invalid(
      `Invalid kinds for find: ${badKinds.join(
        ', '
      )}. Expected ${FIND_KINDS.join(', ')}.`
    );
  const text = String(query ?? '').trim();
  const codePath = options.path?.trim() || undefined;
  if (options.path !== undefined && !codePath)
    invalid('--path needs a file, folder, or symbol');
  const refs =
    options.refs === 'all'
      ? 'all'
      : options.refs?.length
      ? options.refs
      : undefined;
  if (options.refs !== undefined && !refs)
    invalid('--refs needs ref names or all');
  if (!text && !codePath && !refs)
    invalid('find needs at least one word to search for');
  const projection = await makeProjection(options);
  let index = await projection.findIndex();
  let overlay: Overlay | undefined;
  let refSet: Awaited<ReturnType<typeof readRefSides>> | undefined;
  let sides: RefSide[] = [];
  if (refs) {
    refSet = await readRefSides(options.rootDir, options.cacheRoot, refs);
    sides = refSet.sides;
    ({ overlay, index } = await projection.overlayIndex(sides));
  }
  const conflicts = overlay
    ? conflictsInScope(overlay, options.effort)
    : undefined;
  if (options.effort && index.records.get(options.effort)?.kind !== 'effort')
    invalid(`Effort ${options.effort} does not exist`);
  let governed: Map<string, FindVia[]> | undefined;
  let pathLabel: string | undefined;
  let pathNote: (() => Promise<string | undefined>) | undefined;
  if (codePath) {
    const repo = await proofRepository(options.rootDir);
    // For a path the working tree lacks: the refs that hold it, from the
    // named refs, or else from the branches `--refs all` looks at. Each
    // path costs one `cat-file --batch-check`, and only when asked.
    let pool: Promise<{ name: string; sha: string }[]> | undefined;
    const refPool = () =>
      (pool ??= !repo
        ? Promise.resolve([])
        : refs && refs !== 'all'
        ? Promise.resolve(sides.map(({ name, sha }) => ({ name, sha })))
        : git(repo.top, ['rev-parse', '--verify', '-q', 'HEAD'])
            .then((head) =>
              branchCandidates(repo.top, head?.trim() || undefined)
            )
            .then((list) =>
              list.map(({ short, sha }) => ({ name: short, sha }))
            ));
    const held = new Map<
      string,
      Promise<{ name: string; sha: string; kind: 'file' | 'dir' }[]>
    >();
    const holdersOf = (path: string) => {
      let list = held.get(path);
      if (!list) {
        list = refPool().then(async (pooled) => {
          const kinds = repo
            ? await pathInTrees(
                repo.top,
                pooled.map(({ sha }) => sha),
                path
              )
            : new Map<string, 'file' | 'dir'>();
          return pooled.flatMap((ref) => {
            const kind = kinds.get(ref.sha);
            return kind ? [{ ...ref, kind }] : [];
          });
        });
        held.set(path, list);
      }
      return list;
    };
    // With --refs, a path only a ref has is read from that ref's tree.
    const target = await parseCodeTarget(
      codePath,
      options.cwd,
      repo?.top ?? options.cwd,
      refs && repo
        ? async (path) => (await holdersOf(path))[0]?.kind
        : undefined
    );
    pathLabel = target.label;
    // Trailers need a path; a bare symbol has none to give git log. With
    // --refs, the commits of every ref that holds the path count too, so a
    // branch that changes code and no record still ties its trailers.
    const holders =
      refs && target.absent && target.path !== undefined
        ? await holdersOf(target.path)
        : [];
    const commits: TrailerCommit[] =
      repo && target.path !== undefined
        ? await trailerCommits(
            repo.top,
            [
              ...new Set([
                'HEAD',
                ...sides.map((side) => side.sha),
                ...holders.map((holder) => holder.sha),
              ]),
            ],
            target.path
          )
        : [];
    pathNote = () => codeTargetNote(target, codePath, refs, repo, holdersOf);
    governed = governingRecords(
      index,
      target,
      commits,
      (record) =>
        retracted !== 'exclude' || record.frontmatter.retracted !== true
    );
  } else if (overlay && !text)
    governed = new Map(
      [...overlay.proposed].map((id) => [
        id,
        [{ strength: 0, record: id, text: '' }],
      ])
    );
  const found = findRecords(index, text, {
    effort: options.effort,
    kinds,
    asOf: options.asOf,
    retracted,
    limit,
    ...(governed ? { governed } : {}),
  });
  const note = pathNote && !found.matched ? await pathNote() : undefined;
  const result: FindResult =
    codePath || overlay
      ? {
          ...found,
          header: findHeader(
            text,
            pathLabel,
            options.refs,
            found,
            options.effort
          ),
          ...(note ? { notes: [note] } : {}),
          ...(overlay && refSet && conflicts
            ? {
                notes: [refsLine(refSet), ...(note ? [note] : [])],
                hits: found.hits.map((hit) =>
                  branchOf(overlay as Overlay, hit)
                ),
                conflicts: conflicts.texts,
                conflictsTotal: conflicts.total,
              }
            : {}),
        }
      : found;
  const cards = renderFindCards(index, result);
  const envelope = await render(
    options,
    {
      type: 'effortFind',
      query: text,
      effort_id: options.effort ?? null,
      ...(kinds ? { kinds } : {}),
      ...(options.asOf ? { as_of: options.asOf } : {}),
      ...(retracted === 'exclude' ? {} : { retracted }),
      limit,
      ...(codePath ? { path: codePath } : {}),
      ...(refs ? { refs: refs === 'all' ? 'all' : [...refs].sort() } : {}),
    },
    result.hits.map((hit) => hit.record),
    [],
    result.hits.map((hit) => `getRecord("${hit.record.id}")`),
    {
      sections: [{ heading: 'Find hits', lines: cards.split('\n') }],
      // A ranked search that shows fewer records than matched is not complete.
      capReasons: result.matched > result.hits.length ? ['find_limit'] : [],
    }
  );
  const summary = `${result.hits.length} shown of ${result.matched} matching (${
    result.searched
  } searched); matched: ${result.found.join(' ') || 'none'}; missing: ${
    result.missing.join(' ') || 'none'
  }${conflicts ? `; refs ${sides.length}; conflicts ${conflicts.total}` : ''}${
    note ? `; ${note}` : ''
  }`;
  return {
    ...envelope,
    summary:
      [...summary].length <= 640
        ? summary
        : `${[...summary].slice(0, 639).join('')}…`,
    find: {
      query: text,
      effort_id: result.effort,
      searched: result.searched,
      matched: result.matched,
      shown: result.hits.length,
      terms: { matched: [...result.found], missing: [...result.missing] },
      ...(result.efforts
        ? {
            efforts: result.efforts.map((effort) => ({
              id: effort.id,
              mass: roundScore(effort.mass),
            })),
          }
        : {}),
      hits: result.hits.map((hit) => ({
        id: hit.record.id,
        ...(hit.matched.id !== hit.record.id
          ? { matched_id: hit.matched.id }
          : {}),
        score: roundScore(hit.score),
        ...(codePath
          ? {
              via: (hit.via ?? []).map((via) =>
                via.record === hit.record.id
                  ? via.text
                  : `${via.text} (on ${via.record})`
              ),
            }
          : {}),
        ...(hit.branch ? { branch: hit.branch } : {}),
      })),
      ...(pathLabel ? { path: pathLabel } : {}),
      ...(note ? { note } : {}),
      ...(overlay
        ? {
            refs: sides.map((side) => ({
              name: side.name,
              sha: side.sha,
              changed: changeCounts(side).records,
              ...(side.pr
                ? {
                    pr: {
                      number: side.pr.number,
                      draft: side.pr.isDraft,
                      author: side.pr.author,
                    },
                  }
                : {}),
            })),
            conflicts: conflicts?.texts ?? [],
            conflicts_total: conflicts?.total ?? 0,
          }
        : {}),
    },
    cards,
  };
}

/**
 * A hit with its `branch:` line. When branches each supersede one version,
 * the combined chain has several heads; the line then names every other
 * head and where it lives, and the chain line marks each head.
 */
function branchOf(overlay: Overlay, hit: FindHit): FindHit {
  const heads = headsOf(hit.chain);
  const tag = overlay.tag(hit.record.id);
  if (heads.length < 2) return { ...hit, branch: tag };
  const others = heads.filter((head) => head.id !== hit.record.id);
  return {
    ...hit,
    branch: `${tag}; rival heads: ${others
      .map((head) => `${head.id} (${overlay.tag(head.id)})`)
      .join(', ')}`,
    heads: heads.map((head) => head.id),
  };
}

const REFS_ALL_HINT =
  '--refs all overlays branches, with their records and commit trailers.';

/** Ref names for a note: the first five, then how many more. */
function refNames(list: readonly { name: string }[]): string {
  const names = list.slice(0, 5).map((ref) => ref.name);
  return `${names.join(', ')}${
    list.length > 5 ? ` and ${list.length - 5} more` : ''
  }`;
}

/**
 * Why `--path` found nothing, when the working tree lacks the path: which
 * refs have it, and that `--refs all` reads them. A bare word read as a
 * symbol gets a note only when a branch holds it as a path.
 */
async function codeTargetNote(
  target: CodeTarget,
  value: string,
  refs: readonly string[] | 'all' | undefined,
  repo: { top: string } | undefined,
  holdersOf: (path: string) => Promise<{ name: string }[]>
): Promise<string | undefined> {
  const { label } = target;
  if (target.path === undefined) {
    if (refs || !repo || value.includes('#') || value.endsWith('()'))
      return undefined;
    const list = await holdersOf(label);
    return list.length
      ? `note: ${label} is not in the working tree; ${refNames(list)} ${
          list.length > 1 ? 'have' : 'has'
        } it as a path. ${REFS_ALL_HINT}`
      : undefined;
  }
  if (!target.absent) return undefined;
  if (!repo) return `note: ${label} is not in the working tree.`;
  const list = await holdersOf(target.path);
  if (!refs)
    return list.length
      ? `note: ${label} is not in the working tree; ${refNames(list)} ${
          list.length > 1 ? 'have' : 'has'
        } it. ${REFS_ALL_HINT}`
      : `note: ${label} is not in the working tree or on any branch. ${REFS_ALL_HINT}`;
  if (list.length)
    return `note: ${label} is not in the working tree; read from ${refNames(
      list
    )}.`;
  return refs === 'all'
    ? `note: ${label} is not in the working tree or on any branch.`
    : `note: ${label} is not in the working tree or on ${refs.join(
        ', '
      )}; --refs all overlays every branch.`;
}

/** The first card line for `--path` and `--refs`. */
function findHeader(
  text: string,
  path: string | undefined,
  refs: readonly string[] | 'all' | undefined,
  result: FindResult,
  effort: string | undefined
): string {
  const words = text
    ? ` "${text.length > 120 ? `${text.slice(0, 119)}…` : text}"`
    : '';
  const flags = `${path ? ` --path ${path}` : ''}${
    refs ? ` --refs ${refs === 'all' ? 'all' : refs.join(',')}` : ''
  }`;
  const scope = effort ? `in ${effort}` : 'in all Efforts';
  const counts = path
    ? `${result.matched} governing, ${result.hits.length} shown`
    : !text
    ? `${result.matched} changed on refs, ${result.hits.length} shown`
    : `${result.searched} records searched, ${result.matched} matched, ${result.hits.length} shown`;
  return `find${words}${flags} ${scope} (${counts})`;
}

/** A `state` envelope: the usual read fields plus the state inline. */
export interface StateEnvelope extends ReadEnvelope {
  /** Exact counts and how much of each list is shown. */
  state: Omit<EffortState, 'markdown'>;
  /** The state as Markdown, so the agent needs no second Read. */
  markdown: string;
}

/**
 * Where an Effort stands, from frontmatter and links alone: exact counts,
 * contested topics, open blockers and risks, Issues closed without a fix,
 * live records on dead evidence, dated lifecycles, and retractions. It
 * shares the `find` index, so a served graph builds both once.
 */
export async function effortState(
  effortId: string,
  options: EffortProjectionOptions & { asOf?: string }
): Promise<StateEnvelope> {
  if (options.asOf !== undefined)
    throw new ProofReadValidationError(
      'PROOF_INVALID_ARGUMENT',
      'proof state does not take --as-of. Its lifecycle lines date each change; proof find --as-of shows the version current at a date.'
    );
  const projection = await makeProjection(options);
  const index = await projection.findIndex();
  if (index.records.get(effortId)?.kind !== 'effort')
    throw new ProofReadValidationError(
      'PROOF_INVALID_ARGUMENT',
      `Effort ${effortId} does not exist`
    );
  const { markdown, ...state } = buildEffortState(index, effortId);
  const envelope = await render(
    options,
    { type: 'effortState', effort_id: effortId },
    [],
    [],
    [`effortRecords("${effortId}")`, `blockingDecisions("${effortId}")`],
    {
      sections: [{ heading: 'Effort state', lines: markdown.split('\n') }],
      capReasons: state.capped ? ['state_limit'] : [],
    }
  );
  return {
    ...envelope,
    summary: `state of ${effortId}: ${state.live} live of ${
      state.records
    } records; ${state.sections
      .filter((section) => section.heading !== 'Counts')
      .map((section) => `${section.heading.toLowerCase()} ${section.total}`)
      .join(', ')}${state.capped ? '; some lists cut' : ''}`,
    state,
    markdown,
  };
}
