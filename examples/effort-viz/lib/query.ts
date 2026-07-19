export const EFFORT_GRAPH_QUERY = `
  query EffortGraph {
    allEfforts {
      id
      title
      slug
      status
      created_at
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
  rejected_by?: GraphRef[] | null;
}

export interface ConstraintRecord {
  id?: string | null;
  title?: string | null;
  kind?: string | null;
  created_at?: string | null;
  effort?: GraphRef | null;
  derives_from?: unknown;
}

export interface RiskRecord {
  id?: string | null;
  title?: string | null;
  state?: string | null;
  likelihood?: string | null;
  severity?: string | null;
  created_at?: string | null;
  effort?: GraphRef | null;
  mitigated_by?: GraphRef[] | null;
}

export interface EffortGraphQueryResult {
  allEfforts: EffortRecord[];
  allIssues: IssueRecord[];
  allFindings: FindingRecord[];
  allDecisions: DecisionRecord[];
  allConstraints: ConstraintRecord[];
  allRisks: RiskRecord[];
}
