export interface ContentField {
  raw?: string | null;
  html?: string | null;
}

/**
 * Flatbread generates its schema from the records on disk, so a relation field
 * only exists once some record uses it. Selecting `mitigated_by` before any Risk
 * has been mitigated is a hard query error, which is why the document below is
 * assembled from schema introspection rather than hard-coded.
 *
 * The alternative — a fixed document listing only the fields that happen to
 * exist today — silently drops real relations as the graph grows. A superseded
 * Finding, for instance, has no `state` field to fall back on, so a missing
 * `superseded_by` selection would render retired evidence as live.
 */

/** Every relation field the Effort Graph preset can produce, per collection. */
const RELATION_FIELDS: Record<CollectionName, string[]> = {
  allEfforts: [],
  allIssues: ['derives_from', 'resolved_by', 'supersedes', 'superseded_by'],
  allFindings: [
    'derives_from',
    'invalidates',
    'supersedes',
    'superseded_by',
    'evidence',
  ],
  allDecisions: [
    'derives_from',
    'supersedes',
    'superseded_by',
    'rejected_by',
    'evidence',
  ],
  allConstraints: ['derives_from', 'supersedes', 'superseded_by'],
  // Risk has no superseded frontmatter state; supersedes / superseded_by edges
  // are the only retirement signal, same as Finding and Constraint.
  allRisks: [
    'derives_from',
    'mitigated_by',
    'supersedes',
    'superseded_by',
    'evidence',
  ],
};

/** Scalar fields we always want, and always exist. */
const SCALAR_FIELDS: Record<CollectionName, string[]> = {
  allEfforts: ['id', 'title', 'slug', 'status', 'created_at'],
  allIssues: ['id', 'title', 'kind', 'status', 'created_at'],
  allFindings: ['id', 'title', 'kind', 'created_at'],
  allDecisions: ['id', 'title', 'state', 'created_at'],
  allConstraints: ['id', 'title', 'kind', 'created_at'],
  allRisks: ['id', 'title', 'state', 'likelihood', 'severity', 'created_at'],
};

/** GraphQL type name backing each root collection field. */
const COLLECTION_TYPE: Record<CollectionName, string> = {
  allEfforts: 'Effort',
  allIssues: 'Issue',
  allFindings: 'Finding',
  allDecisions: 'Decision',
  allConstraints: 'Constraint',
  allRisks: 'Risk',
};

export type CollectionName =
  | 'allEfforts'
  | 'allIssues'
  | 'allFindings'
  | 'allDecisions'
  | 'allConstraints'
  | 'allRisks';

export const COLLECTIONS = Object.keys(COLLECTION_TYPE) as CollectionName[];

/** Introspects which fields each Effort Graph type actually exposes. */
export const SCHEMA_PROBE_QUERY = `
  query EffortGraphSchema {
${COLLECTIONS.map(
  (name) => `    ${name}: __type(name: "${COLLECTION_TYPE[name]}") {
      fields {
        name
      }
    }`
).join('\n')}
  }
`;

export interface SchemaProbeResult {
  [key: string]: { fields?: Array<{ name: string }> | null } | null;
}

/**
 * Relation fields are object refs in the schema and need a subselection;
 * `derives_from` and friends are stored as plain id strings on some
 * collections, so probe the field's shape rather than assuming.
 */
const REF_SUBSELECTION = new Set([
  'supersedes',
  'superseded_by',
  'rejected_by',
  'mitigated_by',
]);

export function buildEffortGraphQuery(
  schema: SchemaProbeResult | null
): string {
  const body = COLLECTIONS.map((name) => {
    const available = new Set(
      (schema?.[name]?.fields ?? []).map((field) => field.name)
    );
    // Without a schema probe, select only scalars (+ effort / _content).
    // Relation fields appear in Flatbread's schema only after some record uses
    // them; selecting the full RELATION_FIELDS catalog is a hard GraphQL error
    // against a live server. Callers should pass SCHEMA_PROBE_QUERY results
    // (or a sticky last-good probe) once introspection succeeds.
    const relations =
      schema === null
        ? []
        : RELATION_FIELDS[name]
            .filter((field) => available.has(field))
            .map((field) =>
              REF_SUBSELECTION.has(field)
                ? `      ${field} { id }`
                : `      ${field}`
            );

    return [
      `    ${name} {`,
      ...SCALAR_FIELDS[name].map((field) => `      ${field}`),
      ...(name === 'allEfforts' ? [] : ['      effort { id }']),
      ...relations,
      '      _content { raw }',
      '    }',
    ].join('\n');
  }).join('\n');

  return `query EffortGraph {\n${body}\n}`;
}

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

/** Relation fields are optional because the schema only grows them on use. */
interface RelationFields {
  derives_from?: unknown;
  resolved_by?: unknown;
  invalidates?: unknown;
  evidence?: unknown;
  supersedes?: GraphRef[] | null;
  superseded_by?: GraphRef[] | null;
  rejected_by?: GraphRef[] | null;
  mitigated_by?: GraphRef[] | null;
}

export interface IssueRecord extends RelationFields {
  id?: string | null;
  title?: string | null;
  kind?: string | null;
  status?: string | null;
  created_at?: string | null;
  effort?: GraphRef | null;
  _content?: ContentField | null;
}

export interface FindingRecord extends RelationFields {
  id?: string | null;
  title?: string | null;
  kind?: string | null;
  created_at?: string | null;
  effort?: GraphRef | null;
  _content?: ContentField | null;
}

export interface DecisionRecord extends RelationFields {
  id?: string | null;
  title?: string | null;
  state?: string | null;
  created_at?: string | null;
  effort?: GraphRef | null;
  _content?: ContentField | null;
}

export interface ConstraintRecord extends RelationFields {
  id?: string | null;
  title?: string | null;
  kind?: string | null;
  created_at?: string | null;
  effort?: GraphRef | null;
  _content?: ContentField | null;
}

export interface RiskRecord extends RelationFields {
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
