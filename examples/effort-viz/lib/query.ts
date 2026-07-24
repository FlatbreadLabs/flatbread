export interface ContentField {
  raw?: string | null;
  html?: string | null;
}

export const EFFORT_GRAPH_QUERY = `
  query EffortGraph {
    allEfforts {
      id
      title
      slug
      status
      created_at
      _content {
        raw
      }
    }
    allIssues {
      id
      title
      kind
      status
      created_at
      effort {
        id
      }
      derives_from
      resolved_by
      supersedes {
        id
      }
      superseded_by {
        id
      }
      _content {
        raw
      }
    }
    allFindings {
      id
      title
      kind
      created_at
      effort {
        id
      }
      derives_from
      invalidates
      invalidated_by
      _content {
        raw
      }
    }
    allDecisions {
      id
      title
      state
      created_at
      effort {
        id
      }
      derives_from
      supersedes {
        id
      }
      superseded_by {
        id
      }
      _content {
        raw
      }
    }
    allConstraints {
      id
      title
      kind
      created_at
      effort {
        id
      }
      derives_from
      _content {
        raw
      }
    }
    allRisks {
      id
      title
      state
      likelihood
      severity
      created_at
      effort {
        id
      }
      _content {
        raw
      }
    }
  }
`;

export interface GraphRef {
  id?: string | null;
}

export interface EffortRecord {
  id?: string | null;
  title?: string | null;
  slug?: string | null;
  status?: string | null;
  created_at?: string | null;
  _content?: ContentField | null;
}

export interface IssueRecord {
  id?: string | null;
  title?: string | null;
  kind?: string | null;
  status?: string | null;
  created_at?: string | null;
  effort?: GraphRef | null;
  derives_from?: unknown;
  resolved_by?: unknown;
  supersedes?: GraphRef[] | null;
  superseded_by?: GraphRef[] | null;
  _content?: ContentField | null;
}

export interface FindingRecord {
  id?: string | null;
  title?: string | null;
  kind?: string | null;
  created_at?: string | null;
  effort?: GraphRef | null;
  derives_from?: unknown;
  invalidates?: unknown;
  invalidated_by?: unknown;
  _content?: ContentField | null;
}

export interface DecisionRecord {
  id?: string | null;
  title?: string | null;
  state?: string | null;
  created_at?: string | null;
  effort?: GraphRef | null;
  derives_from?: unknown;
  supersedes?: GraphRef[] | null;
  superseded_by?: GraphRef[] | null;
  _content?: ContentField | null;
}

export interface ConstraintRecord {
  id?: string | null;
  title?: string | null;
  kind?: string | null;
  created_at?: string | null;
  effort?: GraphRef | null;
  derives_from?: unknown;
  _content?: ContentField | null;
}

export interface RiskRecord {
  id?: string | null;
  title?: string | null;
  state?: string | null;
  likelihood?: string | null;
  severity?: string | null;
  created_at?: string | null;
  effort?: GraphRef | null;
  _content?: ContentField | null;
}

export interface EffortGraphQueryResult {
  allEfforts: EffortRecord[];
  allIssues: IssueRecord[];
  allFindings: FindingRecord[];
  allDecisions: DecisionRecord[];
  allConstraints: ConstraintRecord[];
  allRisks: RiskRecord[];
}
