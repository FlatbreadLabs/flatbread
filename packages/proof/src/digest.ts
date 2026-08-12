import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { PrimitiveKind } from './types.js';

export type ReadRelation =
  | 'derives_from'
  | 'supersedes'
  | 'superseded_by'
  | 'invalidates'
  | 'invalidated_by'
  | 'rejected_by'
  | 'mitigated_by'
  | 'resolved_by'
  | 'evidence'
  | 'cites';

export interface ReadRecord {
  id: string;
  kind: PrimitiveKind;
  path: string;
  frontmatter: Record<string, unknown>;
  body_excerpt: string;
  relations: Partial<Record<ReadRelation, string[]>>;
}

export interface ReadEdge {
  from_id: string;
  relation: ReadRelation;
  to_id: string;
}

export interface ReadEnvelope {
  summary: string;
  artifact_path: string;
  artifact_sha256: string;
  served_generation: string;
  consistency: { mode: 'eventual' | 'strict'; min_generation: string | null };
  page: { returned: number; has_more: boolean; next_cursor: string | null };
  hints: string[];
}

export interface DigestInput {
  query: Record<string, unknown>;
  queryHash: string;
  cursor?: string | null;
  nextCursor?: string | null;
  generation: string;
  consistency: ReadEnvelope['consistency'];
  records: readonly ReadRecord[];
  edges: readonly ReadEdge[];
  cacheRoot: string;
  hasMore?: boolean;
  totalKnown?: number;
  hints?: string[];
  checkpointLines?: string[];
  anomaly?: string;
  relatedRecords?: readonly ReadRecord[];
  /** When true, primary record bodies are rendered in full (getRecord path). */
  fullBody?: boolean;
}

const CAP_RECORDS = 25;
const CAP_EDGES = 50;
const CAP_BYTES = 64 * 1024;
const FRONTMATTER_KEYS = [
  'id',
  'effort',
  'title',
  'kind',
  'status',
  'state',
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
  'role',
  'blob',
];

function scalar(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  return JSON.stringify(value);
}

function yamlHeader(input: DigestInput, complete: boolean, reasons: string[]) {
  const query = JSON.stringify(input.query);
  return [
    '---',
    `query: ${query}`,
    `query_hash: ${input.queryHash}`,
    `cursor: ${scalar(input.cursor ?? null)}`,
    `served_generation: ${JSON.stringify(input.generation)}`,
    `consistency: ${JSON.stringify(input.consistency)}`,
    `primary: ${JSON.stringify({
      returned: Math.min(input.records.length, CAP_RECORDS),
      total_known: input.totalKnown ?? input.records.length,
      has_more: Boolean(input.hasMore),
    })}`,
    `complete: ${complete}`,
    `caps: ${JSON.stringify({
      primary_records: CAP_RECORDS,
      relation_hops: 1,
      displayed_edges: CAP_EDGES,
      bytes: CAP_BYTES,
    })}`,
    ...(reasons.length
      ? [`cap_reasons: ${JSON.stringify(reasons.sort())}`]
      : []),
    '---',
  ].join('\n');
}

function normalizeBody(body: string): string {
  return body.replace(/\r\n?/g, '\n');
}

function excerpt(body: string): string {
  const normalized = normalizeBody(body);
  const lines = normalized.split('\n').slice(0, 12);
  let result = lines.join('\n');
  let truncated = lines.length < normalized.split('\n').length;
  if ([...result].length > 600) {
    result = [...result].slice(0, 600).join('');
    truncated = true;
  }
  return truncated ? `${result}[…truncated]` : result;
}

function byteCapBodyBanner(record: ReadRecord): string {
  return [
    `> Body exceeded digest byte cap (${CAP_BYTES} bytes).`,
    `Source path: \`${record.path}\`.`,
    'Open the source record if the full body is required.',
  ].join(' ');
}

type RecordBodyMode = 'excerpt' | 'full' | 'byte_cap_miss';

function renderRecordBody(
  record: ReadRecord,
  bodyMode: RecordBodyMode
): string {
  if (bodyMode === 'byte_cap_miss') return byteCapBodyBanner(record);
  // Bounded digests cite Blob id/title/locator — never inline Blob bodies.
  if (record.kind === 'blob' && bodyMode !== 'full') {
    return [
      '> Blob body omitted from bounded digests.',
      `Source path: \`${record.path || '(unknown)'}\`.`,
      'Use `proof get <blob-id>` to read the payload.',
    ].join(' ');
  }
  if (bodyMode === 'full') return normalizeBody(record.body_excerpt);
  return excerpt(record.body_excerpt);
}

function renderRecord(
  record: ReadRecord,
  options: { bodyMode?: RecordBodyMode } = {}
): string {
  const bodyMode = options.bodyMode ?? 'excerpt';
  const frontmatter = Object.fromEntries(
    FRONTMATTER_KEYS.filter((key) => record.frontmatter[key] !== undefined).map(
      (key) => [key, record.frontmatter[key]]
    )
  );
  const relations = Object.keys(record.relations)
    .sort()
    .map(
      (key) =>
        `- ${key}: ${JSON.stringify(
          [...(record.relations[key as ReadRelation] ?? [])].sort()
        )}`
    )
    .join('\n');
  return [
    `### ${record.id}`,
    '```yaml',
    ...Object.keys(frontmatter)
      .sort()
      .map((key) => `${key}: ${scalar(frontmatter[key])}`),
    '```',
    '',
    renderRecordBody(record, bodyMode),
    ...(relations ? ['', 'Relations', relations] : []),
    '',
  ].join('\n');
}

function summary(
  records: readonly ReadRecord[],
  complete: boolean,
  reasons: string[],
  hasMore: boolean
): string {
  const states = new Map<string, number>();
  const statuses = new Map<string, number>();
  for (const record of records) {
    for (const [map, key] of [
      [states, 'state'],
      [statuses, 'status'],
    ] as const) {
      const value = record.frontmatter[key];
      if (typeof value === 'string') map.set(value, (map.get(value) ?? 0) + 1);
    }
  }
  const values = [...states, ...statuses]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => `${key} ${count}`);
  const incompleteReasons = [...reasons, ...(hasMore ? ['pagination'] : [])];
  const text = `${records.length} record${records.length === 1 ? '' : 's'}${
    values.length ? `; ${values.join(', ')}` : ''
  }; ${
    complete && !hasMore
      ? 'complete'
      : `incomplete: ${incompleteReasons.sort().join(', ')}`
  }`;
  if ([...text].length <= 640) return text;
  const clipped = [...text].slice(0, 640).join('');
  return `${clipped.slice(0, clipped.lastIndexOf(' '))}…`;
}

async function durableWrite(path: string, bytes: Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${randomUUID()}`;
  await writeFile(temporary, bytes);
  const handle = await open(temporary, 'r+');
  await handle.sync();
  await handle.close();
  await rename(temporary, path);
}

export async function renderDigest(input: DigestInput): Promise<ReadEnvelope> {
  const primaryBodyMode: RecordBodyMode = input.fullBody ? 'full' : 'excerpt';
  const records = [...input.records].sort((a, b) =>
    `${String(a.frontmatter.created_at ?? '')}\0${a.id}`.localeCompare(
      `${String(b.frontmatter.created_at ?? '')}\0${b.id}`
    )
  );
  const visible = records.slice(0, CAP_RECORDS);
  const edges = [...input.edges]
    .sort((a, b) =>
      `${a.relation}\0${a.from_id}\0${a.to_id}`.localeCompare(
        `${b.relation}\0${b.from_id}\0${b.to_id}`
      )
    )
    .slice(0, CAP_EDGES);
  const reasons = [
    ...(records.length > CAP_RECORDS ? ['primary_records'] : []),
    ...(input.edges.length > CAP_EDGES ? ['displayed_edges'] : []),
  ];
  const checkpoints = input.checkpointLines?.length
    ? ['## Lineage checkpoints', ...input.checkpointLines, '']
    : [];
  const renderPrimary = (
    record: ReadRecord,
    bodyMode: RecordBodyMode = primaryBodyMode
  ) => renderRecord(record, { bodyMode });
  // Related / browse neighbors stay excerpted even when primary bodies are full.
  const renderRelated = (record: ReadRecord) =>
    renderRecord(record, { bodyMode: 'excerpt' });
  let markdown = [
    yamlHeader(input, reasons.length === 0 && !input.hasMore, reasons),
    ...(input.anomaly ? [`> anomaly: ${input.anomaly}`, ''] : []),
    '# Proof read',
    '## Index',
    ...visible.map((record) => `- [\`${record.id}\`](#${record.id})`),
    '## Records',
    ...visible.map((record) => renderPrimary(record)),
    ...(input.relatedRecords?.length
      ? ['## Related records', ...input.relatedRecords.map(renderRelated)]
      : []),
    ...checkpoints,
    '## Displayed edges',
    '| From | Relation | To |',
    '| --- | --- | --- |',
    ...edges.map(
      (edge) => `| ${edge.from_id} | ${edge.relation} | ${edge.to_id} |`
    ),
    '',
  ].join('\n');
  if (Buffer.byteLength(markdown) > CAP_BYTES) {
    reasons.push('bytes');
    // Full-body digests must not silently fall back to the 600/12 excerpt.
    // Prefer a visible byte-cap miss banner over a fake "full" body.
    const overflowBodyMode: RecordBodyMode = input.fullBody
      ? 'byte_cap_miss'
      : 'excerpt';
    const anomaly =
      input.fullBody && input.anomaly
        ? `${input.anomaly}; body exceeded digest byte cap`
        : input.fullBody
        ? 'body exceeded digest byte cap'
        : input.anomaly;
    const header = [
      yamlHeader(input, false, reasons),
      ...(anomaly ? [`> anomaly: ${anomaly}`, ''] : []),
      '# Proof read',
      '## Index',
      ...visible.map((record) => `- [\`${record.id}\`](#${record.id})`),
      '## Records',
    ];
    const sections: string[] = [];
    for (const record of visible) {
      const section = renderPrimary(record, overflowBodyMode);
      const candidate = [...header, ...sections, section, ''].join('\n');
      if (
        Buffer.byteLength([...candidate, '## Displayed edges'].join('\n')) >
        CAP_BYTES
      )
        break;
      sections.push(section);
    }
    const edgeHeader = [
      ...header,
      ...sections,
      '## Displayed edges',
      '| From | Relation | To |',
      '| --- | --- | --- |',
    ];
    const edgeRows: string[] = [];
    for (const edge of edges) {
      const candidate = [
        ...edgeHeader,
        ...edgeRows,
        `| ${edge.from_id} | ${edge.relation} | ${edge.to_id} |`,
        '',
      ].join('\n');
      if (Buffer.byteLength(candidate) > CAP_BYTES) break;
      edgeRows.push(`| ${edge.from_id} | ${edge.relation} | ${edge.to_id} |`);
    }
    markdown = [...edgeHeader, ...edgeRows, ''].join('\n');
  }
  const path = join(
    input.cacheRoot,
    'read-cache',
    input.generation,
    `${input.queryHash}.md`
  );
  let bytes: Buffer;
  const renderedBytes = Buffer.from(markdown);
  try {
    bytes = await readFile(path);
    if (!bytes.equals(renderedBytes)) {
      bytes = renderedBytes;
      await durableWrite(path, bytes);
    }
  } catch {
    bytes = renderedBytes;
    await durableWrite(path, bytes);
  }
  const ids = visible.map((record) => record.id);
  const envelope: ReadEnvelope = {
    summary: summary(
      visible,
      reasons.length === 0 && !input.hasMore,
      reasons,
      Boolean(input.hasMore)
    ),
    artifact_path: path,
    artifact_sha256: createHash('sha256').update(bytes).digest('hex'),
    served_generation: input.generation,
    consistency: input.consistency,
    page: {
      returned: visible.length,
      has_more: Boolean(input.hasMore || records.length > CAP_RECORDS),
      next_cursor: input.hasMore ? input.nextCursor ?? null : null,
    },
    hints: (
      input.hints ?? ids.slice(0, 10).map((id) => `getRecord("${id}")`)
    ).slice(0, 10),
  };
  return envelope;
}
