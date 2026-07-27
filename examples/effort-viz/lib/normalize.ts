import type { EffortGraphQueryResult, GraphRef } from './query';
import type {
  EffortGraph,
  GraphEdge,
  GraphEdgeKind,
  GraphNode,
  GraphNodeKind,
} from './types';

type RelationRecord = Record<string, unknown>;

function asRelationRecord(record: unknown): RelationRecord {
  return record as RelationRecord;
}

const POLYMORPHIC_RELATIONS = new Set<GraphEdgeKind>([
  'derives_from',
  'invalidates',
  'resolved_by',
  'evidence',
]);

const HOMOGENEOUS_RELATIONS = new Set<GraphEdgeKind>([
  'supersedes',
  'superseded_by',
  'rejected_by',
  'mitigated_by',
]);

function relationIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => relationIds(entry));
  }

  if (typeof value === 'string') {
    return value.length > 0 ? [value] : [];
  }

  if (value && typeof value === 'object' && typeof (value as GraphRef).id === 'string') {
    return [(value as GraphRef).id as string];
  }

  return [];
}

function edgeId(kind: GraphEdgeKind, source: string, target: string): string {
  return `${source}:${kind}:${target}`;
}

function addEdge(
  edges: Map<string, GraphEdge>,
  kind: GraphEdgeKind,
  source: string,
  target: string
): void {
  if (!source || !target || source === target) return;
  const id = edgeId(kind, source, target);
  edges.set(id, { id, kind, source, target });
}

function addRelationEdges(
  edges: Map<string, GraphEdge>,
  sourceId: string,
  record: RelationRecord
): void {
  for (const kind of POLYMORPHIC_RELATIONS) {
    for (const targetId of relationIds(record[kind])) {
      addEdge(edges, kind, sourceId, targetId);
    }
  }

  for (const kind of HOMOGENEOUS_RELATIONS) {
    for (const targetId of relationIds(record[kind])) {
      addEdge(edges, kind, sourceId, targetId);
    }
  }
}

function effortIdFromRef(ref: GraphRef | null | undefined): string | null {
  return typeof ref?.id === 'string' ? ref.id : null;
}

function lifecycleForRecord(
  kind: GraphNodeKind,
  record: RelationRecord
): string | undefined {
  if (kind === 'effort' && typeof record.status === 'string') {
    return record.status;
  }
  if (kind === 'issue' && typeof record.status === 'string') {
    return record.status;
  }
  if ((kind === 'decision' || kind === 'risk') && typeof record.state === 'string') {
    return record.state;
  }
  return undefined;
}

function bodyFromRecord(record: RelationRecord): string | undefined {
  const content = record._content;
  if (!content || typeof content !== 'object') return undefined;
  const raw = (content as { raw?: unknown }).raw;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function makeNode(
  kind: GraphNodeKind,
  record: RelationRecord,
  effortId: string | null
): GraphNode | null {
  const id = typeof record.id === 'string' ? record.id : null;
  const title = typeof record.title === 'string' ? record.title : null;
  if (!id || !title) return null;

  return {
    id,
    kind,
    title,
    effortId,
    status: typeof record.status === 'string' ? record.status : undefined,
    state: typeof record.state === 'string' ? record.state : undefined,
    kindLabel: typeof record.kind === 'string' ? record.kind : undefined,
    lifecycle: lifecycleForRecord(kind, record),
    createdAt:
      typeof record.created_at === 'string' ? record.created_at : undefined,
    slug: typeof record.slug === 'string' ? record.slug : undefined,
    likelihood:
      typeof record.likelihood === 'string' ? record.likelihood : undefined,
    severity: typeof record.severity === 'string' ? record.severity : undefined,
    body: bodyFromRecord(record),
  };
}

function addRecordNode(
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge>,
  kind: GraphNodeKind,
  record: RelationRecord
): void {
  const effortId = effortIdFromRef(record.effort as GraphRef | null | undefined);
  const node = makeNode(kind, record, effortId);
  if (!node) return;

  nodes.set(node.id, node);
  addRelationEdges(edges, node.id, record);

  if (effortId) {
    addEdge(edges, 'membership', effortId, node.id);
  }
}

/**
 * Drop reverse projections that duplicate an authoritative forward edge.
 *
 * The writer materializes both sides of a supersession: the newer record gets
 * `supersedes` and the older one gets `superseded_by`. Rendering both draws two
 * opposing arrows between the same pair and lists the relation twice in the
 * drawer, which reads as a mutual link when the datamodel has exactly one
 * authoritative direction.
 */
function dropRedundantReverseEdges(edges: Map<string, GraphEdge>): void {
  for (const edge of [...edges.values()]) {
    if (edge.kind !== 'superseded_by') continue;
    if (edges.has(edgeId('supersedes', edge.target, edge.source))) {
      edges.delete(edge.id);
    }
  }
}

/*
 * Edges pointing at records the query didn't return are deliberately kept.
 * They render nothing (the renderer bails on a path shorter than two points),
 * but a `superseded_by` whose superseder is missing is still the only signal
 * that the record was replaced — dropping it for tidiness would make a retired
 * record read as live, which is the failure this whole encoding exists to
 * prevent.
 */

export function normalizeEffortGraph(data: EffortGraphQueryResult): EffortGraph {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  for (const effort of data.allEfforts ?? []) {
    const node = makeNode('effort', asRelationRecord(effort), null);
    if (!node) continue;
    nodes.set(node.id, node);
    addRelationEdges(edges, node.id, asRelationRecord(effort));
  }

  const collections: Array<[GraphNodeKind, readonly unknown[]]> = [
    ['issue', data.allIssues ?? []],
    ['finding', data.allFindings ?? []],
    ['decision', data.allDecisions ?? []],
    ['constraint', data.allConstraints ?? []],
    ['risk', data.allRisks ?? []],
  ];

  for (const [kind, records] of collections) {
    for (const record of records) {
      addRecordNode(nodes, edges, kind, asRelationRecord(record));
    }
  }

  dropRedundantReverseEdges(edges);

  return {
    nodes: [...nodes.values()],
    edges: [...edges.values()],
  };
}

export { relationIds, edgeId };
