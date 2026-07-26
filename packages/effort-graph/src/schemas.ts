import { z } from 'zod';
const id = z
  .string()
  .regex(/^[a-z]{3}-[a-z0-9-]+--[0123456789abcdefghjkmnpqrstvwxyz]{16}$/);
const effort = id;
const cites = {
  cites: id.array().optional(),
};
const common = {
  id: id.optional(),
  title: z.string().min(1),
  body: z.string(),
  created_at: z.string().datetime({ offset: true }).optional(),
  produced_in: z.string().optional(),
  created_by: z.string().optional(),
};
// Forward edges are canonical; the writer materializes reverse projections.
const edges = {
  derives_from: id.array().optional(),
  supersedes: id.array().optional(),
  invalidates: id.array().optional(),
};
export const CreateEffortSchema = z
  .object({
    type: z.literal('CreateEffort'),
    ...common,
    slug: z.string().optional(),
  })
  .strict();
export const SetEffortStatusSchema = z.object({
  type: z.literal('SetEffortStatus'),
  effortId: id,
  status: z.enum(['active', 'paused', 'completed', 'abandoned']),
});
const createBase = { ...common, ...edges, ...cites, effort: id };
export const WriteIssueSchema = z.object({
  type: z.literal('WriteIssue'),
  ...createBase,
  kind: z.string().min(1),
});
export const WriteFindingSchema = z.object({
  type: z.literal('WriteFinding'),
  ...createBase,
  kind: z.string().min(1),
});
export const WriteDecisionSchema = z.object({
  type: z.literal('WriteDecision'),
  ...createBase,
});
export const WriteConstraintSchema = z.object({
  type: z.literal('WriteConstraint'),
  ...createBase,
  kind: z.enum(['hard', 'soft']),
});
export const WriteRiskSchema = z.object({
  type: z.literal('WriteRisk'),
  ...createBase,
  likelihood: z.enum(['low', 'medium', 'high']),
  severity: z.enum(['low', 'medium', 'high']),
});
export const WriteCitationSchema = z.object({
  type: z.literal('WriteCitation'),
  ...common,
  effort: id,
  /** Optional longform/payload target; body alone (e.g. a URL) is valid. */
  blob: id.optional(),
  role: z.string().min(1).optional(),
});
export const WriteBlobSchema = z.object({
  type: z.literal('WriteBlob'),
  ...common,
  effort: id,
  kind: z.string().min(1).optional(),
});
export const SupersedeSchema = z.object({
  type: z.literal('Supersede'),
  supersederId: id,
  targetId: id,
});
export const InvalidateSchema = z.object({
  type: z.literal('Invalidate'),
  findingId: id,
  targetId: id,
});
export const ResolveIssueSchema = z.object({
  type: z.literal('ResolveIssue'),
  issueId: id,
  resolution: z.enum(['resolved', 'deferred', 'wontfix']),
  resolvedBy: id.array().min(1),
});
export const AcceptDecisionSchema = z.object({
  type: z.literal('AcceptDecision'),
  decisionId: id,
  rejectSiblings: z.boolean().optional().default(true),
});
export const MitigateRiskSchema = z.object({
  type: z.literal('MitigateRisk'),
  riskId: id,
  decisionId: id,
});
export const SetRiskStateSchema = z.object({
  type: z.literal('SetRiskState'),
  riskId: id,
  state: z.enum(['realized', 'accepted']),
  evidence: id.array().min(1),
});
export const EffortGraphMutationSchema = z.discriminatedUnion('type', [
  CreateEffortSchema,
  SetEffortStatusSchema,
  WriteIssueSchema,
  WriteFindingSchema,
  WriteDecisionSchema,
  WriteConstraintSchema,
  WriteRiskSchema,
  WriteCitationSchema,
  WriteBlobSchema,
  SupersedeSchema,
  InvalidateSchema,
  ResolveIssueSchema,
  AcceptDecisionSchema,
  MitigateRiskSchema,
  SetRiskStateSchema,
]);
export type EffortGraphMutation = z.input<typeof EffortGraphMutationSchema>;
export const EffortFrontmatterSchema = z
  .object({
    id,
    title: z.string().min(1),
    created_at: z.string(),
    status: z.enum(['active', 'paused', 'completed', 'abandoned']),
    slug: z.string().optional(),
  })
  .passthrough();
export const IssueFrontmatterSchema = z
  .object({
    id,
    effort,
    title: z.string().min(1),
    created_at: z.string(),
    kind: z.string(),
    status: z.enum(['open', 'resolved', 'deferred', 'wontfix']),
  })
  .passthrough();
export const FindingFrontmatterSchema = z
  .object({
    id,
    effort,
    title: z.string().min(1),
    created_at: z.string(),
    kind: z.string(),
  })
  .passthrough();
export const DecisionFrontmatterSchema = z
  .object({
    id,
    effort,
    title: z.string().min(1),
    created_at: z.string(),
    state: z.enum([
      'proposed',
      'accepted',
      'rejected',
      'superseded',
      'deprecated',
    ]),
  })
  .passthrough();
export const ConstraintFrontmatterSchema = z
  .object({
    id,
    effort,
    title: z.string().min(1),
    created_at: z.string(),
    kind: z.enum(['hard', 'soft']),
  })
  .passthrough();
export const RiskFrontmatterSchema = z
  .object({
    id,
    effort,
    title: z.string().min(1),
    created_at: z.string(),
    state: z.enum(['open', 'mitigated', 'realized', 'accepted']),
    likelihood: z.enum(['low', 'medium', 'high']),
    severity: z.enum(['low', 'medium', 'high']),
  })
  .passthrough();
export const CitationFrontmatterSchema = z
  .object({
    id,
    effort,
    title: z.string().min(1),
    created_at: z.string(),
    blob: id.optional(),
    role: z.string().optional(),
  })
  .passthrough();
export const BlobFrontmatterSchema = z
  .object({
    id,
    effort,
    title: z.string().min(1),
    created_at: z.string(),
    kind: z.string().optional(),
  })
  .passthrough();
export const FrontmatterSchemas = {
  effort: EffortFrontmatterSchema,
  issue: IssueFrontmatterSchema,
  finding: FindingFrontmatterSchema,
  decision: DecisionFrontmatterSchema,
  constraint: ConstraintFrontmatterSchema,
  risk: RiskFrontmatterSchema,
  citation: CitationFrontmatterSchema,
  blob: BlobFrontmatterSchema,
};
