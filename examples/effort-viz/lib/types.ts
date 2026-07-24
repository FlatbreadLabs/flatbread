export type GraphNodeKind =
  | 'effort'
  | 'issue'
  | 'finding'
  | 'decision'
  | 'constraint'
  | 'risk';

export type GraphEdgeKind =
  | 'derives_from'
  | 'supersedes'
  | 'superseded_by'
  | 'invalidates'
  | 'resolved_by'
  | 'mitigated_by'
  | 'rejected_by'
  | 'evidence'
  | 'membership';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  title: string;
  effortId: string | null;
  status?: string;
  state?: string;
  kindLabel?: string;
  lifecycle?: string;
  createdAt?: string;
  slug?: string;
  likelihood?: string;
  severity?: string;
  /** Markdown body from `_content.raw`. */
  body?: string;
}

export interface GraphEdge {
  id: string;
  kind: GraphEdgeKind;
  source: string;
  target: string;
}

export interface EffortGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
