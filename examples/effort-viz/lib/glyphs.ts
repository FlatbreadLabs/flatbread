/**
 * Primitive glyph geometry — the single source of truth for node silhouettes.
 *
 * Both renderers read from here: the R3F canvas builds `THREE.ShapeGeometry`
 * from these outlines, and the legend renders the same outlines as SVG
 * polygons. That's the point — a legend that derives from a different shape
 * source will drift from the canvas the moment either side is edited.
 *
 * Outlines are unit-space polygons wound counter-clockwise around the origin.
 * They are *area-normalized* (see `normalizeArea`) so a triangle and a square
 * with the same nominal radius carry the same visual weight. Without this,
 * an inscribed triangle reads at ~41% the mass of its circle, which would
 * make node size a lying channel: risks would look less important than
 * constraints purely because of their silhouette.
 */

export type GlyphId = 'circle' | 'diamond' | 'square' | 'slab' | 'triangle' | 'ring';

export interface GlyphPoint {
  x: number;
  y: number;
}

/** Reference area: a unit circle. Every glyph is scaled to match it. */
const UNIT_CIRCLE_AREA = Math.PI;

/** Shoelace formula. Assumes a simple (non-self-intersecting) polygon. */
function polygonArea(points: readonly GlyphPoint[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/** Scale a polygon so its filled area equals that of the unit circle. */
function normalizeArea(points: readonly GlyphPoint[]): GlyphPoint[] {
  const scale = Math.sqrt(UNIT_CIRCLE_AREA / polygonArea(points));
  return points.map(({ x, y }) => ({ x: x * scale, y: y * scale }));
}

/** Regular n-gon inscribed in the unit circle, rotated by `rotation` radians. */
function regularPolygon(sides: number, rotation: number): GlyphPoint[] {
  const points: GlyphPoint[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i / sides) * Math.PI * 2;
    points.push({ x: Math.cos(angle), y: Math.sin(angle) });
  }
  return points;
}

const QUARTER = Math.PI / 2;

/** Axis-aligned rectangle of the given width:height ratio. */
function rectangle(ratio: number): GlyphPoint[] {
  const w = ratio;
  const h = 1;
  return [
    { x: w, y: h },
    { x: -w, y: h },
    { x: -w, y: -h },
    { x: w, y: -h },
  ];
}

/**
 * Silhouettes, chosen so no two share a dominant visual feature: one round,
 * one axis-aligned square, one rotated square, one point-up, one wide bar.
 *
 * Hue does the glance-level work; shape is the redundant channel that survives
 * colour-vision deficiency. Each risky hue pair is deliberately assigned a
 * pair of maximally different outlines: amber/red merge under deuteranopia and
 * are diamond vs triangle, blue/violet merge under protanopia and are circle
 * vs square, and blue/teal merge under tritanopia and are circle vs bar — the
 * reason Constraint is a bar rather than the hexagon it started as, which was
 * the least separable non-circle in the set.
 */
export const GLYPH_OUTLINES: Record<Exclude<GlyphId, 'circle' | 'ring'>, GlyphPoint[]> = {
  /** Point-up triangle — the universal hazard sign. Reserved for Risk. */
  triangle: normalizeArea(regularPolygon(3, QUARTER)),
  /** Axis-aligned square — a block that has been laid down. Decision. */
  square: normalizeArea(regularPolygon(4, QUARTER / 2)),
  /** Rotated square — a caution lozenge, unresolved tension. Issue. */
  diamond: normalizeArea(regularPolygon(4, QUARTER)),
  /** Wide flat bar — a boundary you do not cross. Constraint. */
  slab: normalizeArea(rectangle(2.1)),
};

/** Segment count for round glyphs. Enough to read as a circle at 40px. */
export const CIRCLE_SEGMENTS = 40;

/** Inner radius of the Effort hub ring, as a fraction of its outer radius. */
export const RING_INNER_RATIO = 0.46;

/**
 * SVG `points` attribute for a glyph, scaled to fit a `size`×`size` viewBox
 * centered on `size / 2`. Round glyphs return null — draw those as `<circle>`.
 */
export function glyphSvgPoints(glyph: GlyphId, size: number): string | null {
  if (glyph === 'circle' || glyph === 'ring') return null;
  const outline = GLYPH_OUTLINES[glyph];
  // Fit the widest vertex inside the box rather than assuming radius 1 — the
  // area normalization pushes some outlines past the unit circle.
  const extent = Math.max(...outline.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))));
  const half = size / 2;
  const scale = half / extent;
  return outline
    .map(({ x, y }) => `${(half + x * scale).toFixed(2)},${(half - y * scale).toFixed(2)}`)
    .join(' ');
}

/**
 * How far a glyph's vertices reach past the unit circle. The canvas uses this
 * to keep the selection halo clear of pointy silhouettes.
 */
export function glyphExtent(glyph: GlyphId): number {
  if (glyph === 'circle' || glyph === 'ring') return 1;
  const outline = GLYPH_OUTLINES[glyph];
  return Math.max(...outline.map((p) => Math.hypot(p.x, p.y)));
}
