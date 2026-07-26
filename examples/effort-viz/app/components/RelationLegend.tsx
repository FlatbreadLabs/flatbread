'use client';

import type { GraphEdgeKind, GraphNodeKind } from '@/lib/types';
import type { ColorMode } from '@/lib/oklch';
import { oklchCss, structuralOklch, toColor } from '@/lib/oklch';
import { PRIMITIVES, primitiveOklch } from '@/lib/primitives';
import { CIRCLE_SEGMENTS, RING_INNER_RATIO, glyphSvgPoints } from '@/lib/glyphs';

export type RelationGroupId =
  | 'lineage'
  | 'supersession'
  | 'invalidation'
  | 'resolution'
  | 'mitigation'
  | 'rejection'
  | 'evidence'
  | 'membership';

export interface RelationMeta {
  kind: GraphEdgeKind;
  label: string;
  description: string;
  group: RelationGroupId;
  /** Rendered in the drawer so direction reads as a sentence, not a bare arrow. */
  directionHint: { outgoing: string; incoming: string };
  dash: 'solid' | 'dashed' | 'dotted';
  weight: 'thin' | 'medium' | 'bold';
  emphasis: 'subtle' | 'base' | 'medium' | 'strong';
  arrow: boolean;
}

/**
 * Relation styling. Edges stay largely achromatic on purpose: hue is spent on
 * primitives now, and layering seven more edge hues on top would put a dozen
 * competing colours on one canvas. Texture (dash, weight) separates the
 * groups instead, with two exceptions that carry real semantic weight —
 * membership takes its Effort's tint, and invalidation gets a warning hue
 * because "this was wrong" is the strongest claim the datamodel can make.
 */
export const RELATION_META: Record<GraphEdgeKind, RelationMeta> = {
  derives_from: {
    kind: 'derives_from',
    label: 'Derives from',
    description: 'Causal upstream evidence or context this record was built on.',
    group: 'lineage',
    directionHint: { outgoing: 'Builds on', incoming: 'Informs' },
    dash: 'solid',
    weight: 'thin',
    emphasis: 'base',
    arrow: true,
  },
  supersedes: {
    kind: 'supersedes',
    label: 'Supersedes',
    description: 'Replaces an earlier record of the same primitive.',
    group: 'supersession',
    directionHint: { outgoing: 'Replaces', incoming: 'Replaced by' },
    dash: 'solid',
    weight: 'medium',
    emphasis: 'strong',
    arrow: true,
  },
  superseded_by: {
    kind: 'superseded_by',
    label: 'Superseded by',
    description: 'Replaced by a later record; this one is no longer current.',
    group: 'supersession',
    directionHint: { outgoing: 'Replaced by', incoming: 'Replaces' },
    dash: 'solid',
    weight: 'medium',
    emphasis: 'strong',
    arrow: true,
  },
  invalidates: {
    kind: 'invalidates',
    label: 'Invalidates',
    description: 'Says an earlier record was wrong — not merely replaced.',
    group: 'invalidation',
    directionHint: { outgoing: 'Shows this was wrong', incoming: 'Shown wrong by' },
    dash: 'dashed',
    weight: 'medium',
    emphasis: 'strong',
    arrow: true,
  },
  resolved_by: {
    kind: 'resolved_by',
    label: 'Resolved by',
    description: 'Closes an Issue through a Decision or Finding.',
    group: 'resolution',
    directionHint: { outgoing: 'Resolved by', incoming: 'Resolves' },
    dash: 'solid',
    weight: 'medium',
    emphasis: 'strong',
    arrow: true,
  },
  mitigated_by: {
    kind: 'mitigated_by',
    label: 'Mitigated by',
    description: 'Reduces a Risk through an accepted Decision.',
    group: 'mitigation',
    directionHint: { outgoing: 'Mitigated by', incoming: 'Mitigates' },
    dash: 'solid',
    weight: 'medium',
    emphasis: 'medium',
    arrow: true,
  },
  rejected_by: {
    kind: 'rejected_by',
    label: 'Rejected by',
    description: 'Closed when a sibling Decision in this Effort was accepted.',
    group: 'rejection',
    directionHint: { outgoing: 'Rejected by', incoming: 'Rejects' },
    dash: 'dotted',
    weight: 'medium',
    emphasis: 'medium',
    arrow: true,
  },
  evidence: {
    kind: 'evidence',
    label: 'Evidence',
    description: 'A Finding cited as support for this record.',
    group: 'evidence',
    directionHint: { outgoing: 'Supports', incoming: 'Supported by' },
    dash: 'dotted',
    weight: 'thin',
    emphasis: 'subtle',
    arrow: true,
  },
  membership: {
    kind: 'membership',
    label: 'Belongs to Effort',
    description: 'Every record belongs to exactly one Effort.',
    group: 'membership',
    directionHint: { outgoing: 'Contains', incoming: 'Belongs to' },
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
  'mitigation',
  'rejection',
  'evidence',
  'membership',
];

/** Group headings use the edge names the CLI and frontmatter use. */
export const RELATION_GROUP_LABEL: Record<RelationGroupId, string> = {
  lineage: 'Derives from',
  supersession: 'Supersedes',
  invalidation: 'Invalidates',
  resolution: 'Resolved by',
  mitigation: 'Mitigated by',
  rejection: 'Rejected by',
  evidence: 'Evidence',
  membership: 'Belongs to Effort',
};

/** One representative kind per group, for legend rows. */
export const RELATION_GROUP_SAMPLE: Record<RelationGroupId, GraphEdgeKind> = {
  lineage: 'derives_from',
  supersession: 'supersedes',
  invalidation: 'invalidates',
  resolution: 'resolved_by',
  mitigation: 'mitigated_by',
  rejection: 'rejected_by',
  evidence: 'evidence',
  membership: 'membership',
};

/**
 * Stroke colour for a relation group. Membership resolves per Effort at the
 * call site, so the legend passes `null` and renders a neutral sample with a
 * caption instead of picking an arbitrary cluster's tint.
 */
export function relationStrokeOklch(
  group: RelationGroupId,
  mode: ColorMode
): { l: number; c: number; h: number } {
  if (group === 'resolution' || group === 'mitigation') {
    return mode === 'light' ? { l: 0.5, c: 0.13, h: 158 } : { l: 0.7, c: 0.11, h: 158 };
  }
  if (group === 'invalidation') {
    return mode === 'light' ? { l: 0.52, c: 0.16, h: 22 } : { l: 0.7, c: 0.14, h: 22 };
  }
  return mode === 'light' ? { l: 0.42, c: 0.015, h: 260 } : { l: 0.76, c: 0.015, h: 260 };
}

/**
 * Lifecycle badge styling, keyed by `primitive:state` so the same word can
 * mean different things per primitive. A Decision's `accepted` is a
 * commitment; a Risk's `accepted` is "we chose to live with this hazard" —
 * they must not share the same reassuring green.
 */
const LIFECYCLE_BADGE: Record<string, { label: string; className: string }> = {
  // Effort
  'effort:active': {
    label: 'Active',
    className: 'border-sky-500/40 bg-sky-500/12 text-sky-800 dark:text-sky-200',
  },
  'effort:paused': {
    label: 'Paused',
    className: 'border-border bg-muted/12 text-foreground/75',
  },
  'effort:completed': {
    label: 'Completed',
    className:
      'border-emerald-500/40 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200',
  },
  'effort:abandoned': {
    label: 'Abandoned',
    className: 'border-border bg-muted/12 text-muted line-through decoration-muted/60',
  },
  // Issue
  'issue:open': {
    label: 'Open',
    className: 'border-amber-500/40 bg-amber-500/12 text-amber-800 dark:text-amber-200',
  },
  'issue:resolved': {
    label: 'Resolved',
    className:
      'border-emerald-500/40 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200',
  },
  'issue:deferred': {
    label: 'Deferred',
    className: 'border-border bg-muted/12 text-foreground/75',
  },
  'issue:wontfix': {
    label: "Won't fix",
    className: 'border-border bg-muted/12 text-muted line-through decoration-muted/60',
  },
  // Decision
  'decision:proposed': {
    label: 'Proposed',
    className: 'border-amber-500/40 bg-amber-500/12 text-amber-800 dark:text-amber-200',
  },
  'decision:accepted': {
    label: 'Accepted',
    className:
      'border-emerald-500/40 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200',
  },
  'decision:rejected': {
    label: 'Rejected',
    className: 'border-rose-500/40 bg-rose-500/12 text-rose-800 dark:text-rose-200',
  },
  'decision:superseded': {
    label: 'Superseded',
    className: 'border-border bg-muted/12 text-muted line-through decoration-muted/60',
  },
  'decision:deprecated': {
    label: 'Deprecated',
    className: 'border-border bg-muted/12 text-muted line-through decoration-muted/60',
  },
  // Risk
  'risk:open': {
    label: 'Open',
    className: 'border-amber-500/40 bg-amber-500/12 text-amber-800 dark:text-amber-200',
  },
  'risk:mitigated': {
    label: 'Mitigated',
    className:
      'border-emerald-500/40 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200',
  },
  'risk:realized': {
    label: 'Realized',
    className: 'border-rose-500/40 bg-rose-500/12 text-rose-800 dark:text-rose-200',
  },
  'risk:accepted': {
    label: 'Accepted risk',
    className: 'border-amber-500/40 bg-amber-500/12 text-amber-800 dark:text-amber-200',
  },
};

/** Applies to any primitive — these come from edges, not frontmatter. */
const EDGE_DERIVED_BADGE: Record<string, { label: string; className: string }> = {
  superseded: {
    label: 'Superseded',
    className: 'border-border bg-muted/12 text-muted line-through decoration-muted/60',
  },
  invalidated: {
    label: 'Invalidated',
    className: 'border-rose-500/40 bg-rose-500/12 text-rose-800 dark:text-rose-200',
  },
};

export function lifecycleBadge(
  kind: GraphNodeKind,
  state: string | undefined
): { label: string; className: string } | null {
  if (!state) return null;
  const key = state.toLowerCase();
  return (
    LIFECYCLE_BADGE[`${kind}:${key}`] ??
    EDGE_DERIVED_BADGE[key] ?? {
      label: state,
      className: 'border-border bg-muted/12 text-foreground/75',
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
  return 1.25;
}

function lineOpacity(emphasis: RelationMeta['emphasis']): number {
  if (emphasis === 'subtle') return 0.5;
  if (emphasis === 'medium') return 0.7;
  if (emphasis === 'strong') return 0.92;
  return 0.78;
}

/**
 * Legend sample for one relation. `color` must be the same value the canvas
 * strokes with, otherwise the legend teaches an encoding that doesn't exist.
 */
export function RelationLineSample({
  meta,
  color,
  className = '',
}: {
  meta: RelationMeta;
  color?: string;
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
      style={color ? { color } : undefined}
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
        <path d="M30 4 L36 1.5 L36 6.5 Z" fill="currentColor" opacity={opacity} />
      )}
    </svg>
  );
}

/**
 * The legend's primitive marker. Draws the *same* outline the canvas builds
 * its `ShapeGeometry` from, in the same hue, so the key cannot drift from the
 * render.
 */
export function PrimitiveGlyph({
  kind,
  mode,
  size = 14,
  retired = false,
  tint,
  core,
}: {
  kind: GraphNodeKind;
  mode: ColorMode;
  size?: number;
  retired?: boolean;
  /** Override the fill, e.g. to show a record in its retired tone. */
  tint?: string;
  /** Cluster tint for the centre of an Effort hub. */
  core?: string;
}) {
  const { glyph } = PRIMITIVES[kind];
  const fill = tint ?? oklchCss(primitiveOklch(kind, mode));
  const points = glyphSvgPoints(glyph, size);
  const half = size / 2;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="shrink-0"
      style={{ opacity: retired ? 0.6 : 1 }}
    >
      {glyph === 'ring' ? (
        <>
          <circle
            cx={half}
            cy={half}
            r={half * ((1 + RING_INNER_RATIO) / 2) - 0.25}
            fill="none"
            stroke={tint ?? oklchCss(structuralOklch(mode))}
            strokeWidth={half * (1 - RING_INNER_RATIO)}
          />
          {core && (
            <circle cx={half} cy={half} r={half * RING_INNER_RATIO * 0.82} fill={core} />
          )}
        </>
      ) : points ? (
        <polygon points={points} fill={fill} />
      ) : (
        <circle cx={half} cy={half} r={half - 0.5} fill={fill} />
      )}
    </svg>
  );
}

export { CIRCLE_SEGMENTS, toColor };
