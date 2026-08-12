/**
 * Primitive metadata — the single source of truth for how each Proof
 * primitive looks and what it is called.
 *
 * Encoding decisions, in short:
 *
 * - **Hue carries primitive kind**, not Effort cluster. Cluster identity is
 *   already delivered by the force layout (same-Effort records share a
 *   centroid), by a large always-labelled hub, and by the hub-coloured
 *   membership spokes. Kind had no channel at all, so it takes the strongest
 *   nominal one.
 * - **Shape repeats kind.** Hue does the glance-level work; shape is the
 *   backstop for deuteranopia, where amber/red and blue/violet partly merge.
 * - **Effort hubs keep their cluster hue** at low chroma and render as a ring,
 *   so a hub is never mistaken for a record and the cluster key survives.
 *
 * Vocabulary follows `.agents/skills/proof/glossary.md` — these are
 * primitives, not "node kinds", and the descriptions paraphrase the glossary
 * rather than inventing parallel definitions.
 */

import type { GlyphId } from './glyphs';
import type { GraphNodeKind } from './types';
import type { ColorMode, Oklch } from '../../core/oklch';

export interface PrimitiveMeta {
  kind: GraphNodeKind;
  /** Singular display name, capitalized as a primitive per the glossary. */
  label: string;
  /** Plural, for counts and section headers. */
  plural: string;
  /** One line, paraphrasing the glossary definition. */
  description: string;
  glyph: GlyphId;
  /** Chroma + hue. Lightness comes from the mode so both themes stay legible. */
  tone: { c: number; h: number } | null;
}

/**
 * Hues are spaced around the wheel and paired with silhouettes so that any two
 * primitives differ on at least one channel that survives colour-vision
 * deficiency. The pairs that actually collapse, and their rescues:
 *
 * - amber Issue / red Risk merge under deuteranopia → diamond vs triangle
 * - blue Finding / violet Decision merge under protanopia → circle vs square
 * - blue Finding / green Constraint are closest under tritanopia → circle vs bar
 *
 * Chroma is also kept near-level across records. Varying it made the lowest one
 * read as the least important primitive, which is a claim the datamodel does
 * not make.
 */
export const PRIMITIVES: Record<GraphNodeKind, PrimitiveMeta> = {
  effort: {
    kind: 'effort',
    label: 'Effort',
    plural: 'Efforts',
    description:
      'The anchor for one thread of work. Every record belongs to exactly one.',
    glyph: 'ring',
    // Effort hubs are tinted per cluster, so they have no fixed hue.
    tone: null,
  },
  issue: {
    kind: 'issue',
    label: 'Issue',
    plural: 'Issues',
    description:
      'A tracked item needing attention — question, defect, gap, or blocker.',
    glyph: 'diamond',
    tone: { c: 0.15, h: 72 },
  },
  finding: {
    kind: 'finding',
    label: 'Finding',
    plural: 'Findings',
    description:
      'A grounded observation about code, users, literature, or runtime.',
    glyph: 'circle',
    tone: { c: 0.15, h: 250 },
  },
  decision: {
    kind: 'decision',
    label: 'Decision',
    plural: 'Decisions',
    description: 'A commitment among alternatives, citing what it weighed.',
    glyph: 'square',
    tone: { c: 0.16, h: 318 },
  },
  constraint: {
    kind: 'constraint',
    label: 'Constraint',
    plural: 'Constraints',
    description:
      'A sticky hard or soft boundary that limits the decision space.',
    glyph: 'slab',
    tone: { c: 0.15, h: 152 },
  },
  risk: {
    kind: 'risk',
    label: 'Risk',
    plural: 'Risks',
    description: 'A prospective negative outcome with likelihood and severity.',
    glyph: 'triangle',
    tone: { c: 0.17, h: 26 },
  },
};

/** Legend order: the hub first, then records in journaling order. */
export const PRIMITIVE_ORDER: GraphNodeKind[] = [
  'effort',
  'issue',
  'finding',
  'decision',
  'constraint',
  'risk',
];

/**
 * Base lightness per mode. Records sit at a single lightness so hue alone
 * separates them — varying both would make two primitives read as one
 * primitive in two states.
 */
const RECORD_LIGHTNESS: Record<ColorMode, number> = { light: 0.58, dark: 0.72 };

/** Effort hubs: low chroma so a cluster tint never competes with record hues. */
const HUB_CHROMA = 0.055;

export function primitiveLabel(kind: GraphNodeKind): string {
  return PRIMITIVES[kind].label;
}

/**
 * Fixed colour for a primitive, ignoring cluster. Used by the legend and by
 * every record glyph on the canvas.
 */
export function primitiveOklch(kind: GraphNodeKind, mode: ColorMode): Oklch {
  const { tone } = PRIMITIVES[kind];
  const l = RECORD_LIGHTNESS[mode];
  // Efforts have no fixed hue; show them as the neutral the hub ring uses.
  if (!tone) return { l, c: 0.02, h: 260 };
  return { l, c: tone.c, h: tone.h };
}

export { HUB_CHROMA };
