'use client';

import type { GraphEdgeKind, GraphNodeKind } from '@/lib/types';
import type { ColorMode } from '@/lib/oklch';

/** Stable per-kind palette (kind dominates over effort cluster). */
const KIND_PALETTE: Record<
  GraphNodeKind,
  { light: string; dark: string; label: string }
> = {
  effort: { light: 'oklch(42% 0.02 260)', dark: 'oklch(78% 0.02 260)', label: 'Effort' },
  issue: { light: 'oklch(62% 0.14 75)', dark: 'oklch(78% 0.12 75)', label: 'Issue' },
  finding: { light: 'oklch(58% 0.12 250)', dark: 'oklch(76% 0.1 250)', label: 'Finding' },
  decision: { light: 'oklch(56% 0.14 300)', dark: 'oklch(74% 0.12 300)', label: 'Decision' },
  constraint: { light: 'oklch(55% 0.1 195)', dark: 'oklch(73% 0.09 195)', label: 'Constraint' },
  risk: { light: 'oklch(58% 0.16 25)', dark: 'oklch(76% 0.13 25)', label: 'Risk' },
};

export function kindSwatchCss(kind: GraphNodeKind, mode: ColorMode): string {
  return KIND_PALETTE[kind][mode];
}

export const NODE_KINDS: Array<{ kind: GraphNodeKind; label: string }> = (
  Object.entries(KIND_PALETTE) as Array<[GraphNodeKind, (typeof KIND_PALETTE)[GraphNodeKind]]>
).map(([kind, entry]) => ({ kind, label: entry.label }));

export type RelationGroupId =
  | 'lineage'
  | 'supersession'
  | 'invalidation'
  | 'resolution'
  | 'rejection'
  | 'evidence'
  | 'membership';

export interface RelationMeta {
  kind: GraphEdgeKind;
  label: string;
  shortLabel: string;
  description: string;
  group: RelationGroupId;
  /** Human-readable direction hint for the drawer. */
  directionHint: string;
  dash: 'solid' | 'dashed' | 'dotted';
  weight: 'thin' | 'medium' | 'bold';
  emphasis: 'subtle' | 'base' | 'medium' | 'strong';
  arrow: boolean;
}

export const RELATION_META: Record<GraphEdgeKind, RelationMeta> = {
  derives_from: {
    kind: 'derives_from',
    label: 'Derives from',
    shortLabel: 'derives',
    description: 'Built on prior context (issue, finding, or decision).',
    group: 'lineage',
    directionHint: 'This record builds on →',
    dash: 'solid',
    weight: 'thin',
    emphasis: 'base',
    arrow: true,
  },
  supersedes: {
    kind: 'supersedes',
    label: 'Supersedes',
    shortLabel: 'supersedes',
    description: 'Replaces an older decision (old → new).',
    group: 'supersession',
    directionHint: 'This replaces →',
    dash: 'solid',
    weight: 'medium',
    emphasis: 'strong',
    arrow: true,
  },
  superseded_by: {
    kind: 'superseded_by',
    label: 'Superseded by',
    shortLabel: 'superseded',
    description: 'Replaced by a newer decision (old ← new).',
    group: 'supersession',
    directionHint: '← Replaced by',
    dash: 'solid',
    weight: 'medium',
    emphasis: 'strong',
    arrow: true,
  },
  invalidates: {
    kind: 'invalidates',
    label: 'Invalidates',
    shortLabel: 'invalidates',
    description: 'Marks prior evidence or assumptions as no longer valid.',
    group: 'invalidation',
    directionHint: 'This invalidates →',
    dash: 'dashed',
    weight: 'medium',
    emphasis: 'strong',
    arrow: true,
  },
  resolved_by: {
    kind: 'resolved_by',
    label: 'Resolved by',
    shortLabel: 'resolved',
    description: 'Issue closed by a decision or mitigation.',
    group: 'resolution',
    directionHint: '← Resolved by',
    dash: 'solid',
    weight: 'medium',
    emphasis: 'strong',
    arrow: true,
  },
  mitigated_by: {
    kind: 'mitigated_by',
    label: 'Mitigated by',
    shortLabel: 'mitigated',
    description: 'Risk reduced by a decision or control.',
    group: 'resolution',
    directionHint: '← Mitigated by',
    dash: 'solid',
    weight: 'medium',
    emphasis: 'strong',
    arrow: true,
  },
  rejected_by: {
    kind: 'rejected_by',
    label: 'Rejected by',
    shortLabel: 'rejected',
    description: 'Proposal declined by a decision.',
    group: 'rejection',
    directionHint: '← Rejected by',
    dash: 'dashed',
    weight: 'thin',
    emphasis: 'medium',
    arrow: true,
  },
  evidence: {
    kind: 'evidence',
    label: 'Evidence',
    shortLabel: 'evidence',
    description: 'Finding or artifact supporting another record.',
    group: 'evidence',
    directionHint: 'Supports →',
    dash: 'dotted',
    weight: 'thin',
    emphasis: 'subtle',
    arrow: true,
  },
  membership: {
    kind: 'membership',
    label: 'Membership',
    shortLabel: 'member',
    description: 'Child record belongs to an effort cluster.',
    group: 'membership',
    directionHint: 'Part of effort →',
    dash: 'solid',
    weight: 'thin',
    emphasis: 'subtle',
    arrow: false,
  },
};

export const RELATION_GROUP_ORDER: RelationGroupId[] = [
  'lineage',
  'supersession',
  'invalidation',
  'resolution',
  'rejection',
  'evidence',
  'membership',
];

export const RELATION_GROUP_LABEL: Record<RelationGroupId, string> = {
  lineage: 'Lineage',
  supersession: 'Supersession',
  invalidation: 'Invalidation',
  resolution: 'Resolution & mitigation',
  rejection: 'Rejection',
  evidence: 'Evidence',
  membership: 'Effort membership',
};

/** One row per relation group for the canvas legend (covers all kinds in the group). */
export const RELATION_LEGEND_ROWS: Array<{
  group: RelationGroupId;
  sampleKind: GraphEdgeKind;
}> = [
  { group: 'lineage', sampleKind: 'derives_from' },
  { group: 'supersession', sampleKind: 'supersedes' },
  { group: 'invalidation', sampleKind: 'invalidates' },
  { group: 'resolution', sampleKind: 'resolved_by' },
  { group: 'rejection', sampleKind: 'rejected_by' },
  { group: 'evidence', sampleKind: 'evidence' },
  { group: 'membership', sampleKind: 'membership' },
];

const LIFECYCLE_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  proposed: {
    label: 'Proposed',
    className:
      'border-amber-500/35 bg-amber-500/12 text-amber-800 dark:text-amber-200',
  },
  accepted: {
    label: 'Accepted',
    className:
      'border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    className:
      'border-rose-500/35 bg-rose-500/12 text-rose-800 dark:text-rose-200',
  },
  superseded: {
    label: 'Superseded',
    className:
      'border-muted/40 bg-muted/15 text-muted line-through decoration-muted/60',
  },
  deprecated: {
    label: 'Deprecated',
    className: 'border-muted/35 bg-muted/10 text-muted',
  },
  open: {
    label: 'Open',
    className:
      'border-sky-500/35 bg-sky-500/12 text-sky-800 dark:text-sky-200',
  },
  resolved: {
    label: 'Resolved',
    className:
      'border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200',
  },
  deferred: {
    label: 'Deferred',
    className: 'border-muted/35 bg-muted/10 text-muted',
  },
};

export function lifecycleBadge(lifecycle: string | undefined): {
  label: string;
  className: string;
} | null {
  if (!lifecycle) return null;
  const key = lifecycle.toLowerCase();
  return (
    LIFECYCLE_BADGE[key] ?? {
      label: lifecycle,
      className: 'border-border bg-muted/10 text-foreground/80',
    }
  );
}

function strokeDash(dash: RelationMeta['dash']): string | undefined {
  if (dash === 'dashed') return '5 3';
  if (dash === 'dotted') return '2 3';
  return undefined;
}

function strokeWidth(weight: RelationMeta['weight']): number {
  if (weight === 'bold') return 2.5;
  if (weight === 'medium') return 2;
  return 1.5;
}

function lineOpacity(emphasis: RelationMeta['emphasis']): number {
  if (emphasis === 'subtle') return 0.45;
  if (emphasis === 'medium') return 0.65;
  if (emphasis === 'strong') return 0.9;
  return 0.75;
}

export function RelationLineSample({
  meta,
  className = '',
}: {
  meta: RelationMeta;
  className?: string;
}) {
  const opacity = lineOpacity(meta.emphasis);
  const width = strokeWidth(meta.weight);
  const dash = strokeDash(meta.dash);

  return (
    <svg
      aria-hidden
      viewBox="0 0 40 8"
      className={`h-2 w-10 shrink-0 text-foreground/70 ${className}`}
    >
      <line
        x1="1"
        y1="4"
        x2={meta.arrow ? '30' : '39'}
        y2="4"
        stroke="currentColor"
        strokeWidth={width}
        strokeDasharray={dash}
        strokeLinecap="round"
        opacity={opacity}
      />
      {meta.arrow && (
        <path
          d="M30 4 L36 1.5 L36 6.5 Z"
          fill="currentColor"
          opacity={opacity}
        />
      )}
    </svg>
  );
}

export function KindSwatch({
  kind,
  mode,
  sizeClass = 'size-2.5',
}: {
  kind: GraphNodeKind;
  mode: ColorMode;
  sizeClass?: string;
}) {
  return (
    <span
      aria-hidden
      className={`${sizeClass} shrink-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10`}
      style={{ background: kindSwatchCss(kind, mode) }}
    />
  );
}
