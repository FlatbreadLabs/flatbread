/**
 * Growth / vein helpers.
 *
 * These implement a lightweight "space colonization / slime" aesthetic:
 * - node radii ease in from 0 as `growth` climbs to 1
 * - edges are rendered as gently curved polylines whose tip advances along
 *   the path as `growth` climbs to 1
 *
 * The real per-frame integration lives in `simulation.ts`; this file just
 * exposes the pure primitives so they're easy to test and reuse.
 */

import type { SimEdge, SimNode, VeinPoint } from './types';

/** Smooth ease-out cubic — good default for growing nodes. */
export function easeOutCubic(t: number): number {
  const u = 1 - clamp01(t);
  return 1 - u * u * u;
}

/** Ease-in cubic — good default for retract animation (accelerate to death). */
export function easeInCubic(t: number): number {
  const u = clamp01(t);
  return u * u * u;
}

/** Clamp a number to [0, 1]. */
export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * Effective visual radius for a node given its `growth` and `state`.
 * Growing: eases up from 0 → radius. Retracting: eases down toward 0.
 */
export function effectiveRadius(node: SimNode): number {
  return node.radius * easeOutCubic(node.growth);
}

/**
 * Build a smooth polyline from `from` → `to`, with `segments` intermediate
 * points offset along the segment normal using the edge's `offsets` array
 * (unit-space [-1, 1] curvature seeds hashed from the edge id).
 *
 * Writes into `out` if provided (mutates it in place) to avoid allocation on
 * the hot path — R3F re-reads this every frame.
 */
export function buildVeinPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  offsets: number[],
  amplitude: number,
  out: VeinPoint[] = []
): VeinPoint[] {
  const segments = offsets.length;
  const total = segments + 2; // includes both endpoints
  // Grow / shrink `out` to `total` without allocating fresh objects when we can.
  while (out.length < total) out.push({ x: 0, y: 0 });
  out.length = total;

  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular normal (rotate segment by 90°) for sideways displacement.
  const nx = -dy / len;
  const ny = dx / len;
  const amp = amplitude * len;

  out[0].x = fromX;
  out[0].y = fromY;
  for (let i = 0; i < segments; i++) {
    const t = (i + 1) / (segments + 1);
    // Blend a hann-like window so offsets vanish at the endpoints.
    const window = Math.sin(t * Math.PI);
    const off = offsets[i] * amp * window;
    out[i + 1].x = fromX + dx * t + nx * off;
    out[i + 1].y = fromY + dy * t + ny * off;
  }
  out[total - 1].x = toX;
  out[total - 1].y = toY;
  return out;
}

/**
 * Return the polyline visible at the current edge `growth`. The tip walks
 * along `path` from index 0 → last. The returned array shares its object
 * instances with `path` for indices fully revealed; the tip is interpolated.
 *
 * Writes into `out` to avoid per-frame allocations.
 */
export function veinTipPolyline(
  path: VeinPoint[],
  growth: number,
  out: VeinPoint[] = []
): VeinPoint[] {
  const g = clamp01(growth);
  if (path.length < 2 || g <= 0) {
    out.length = 0;
    return out;
  }
  const segments = path.length - 1;
  const t = g * segments;
  const fullSegments = Math.floor(t);
  const frac = t - fullSegments;
  const revealed = Math.min(fullSegments + 1, path.length);

  const needed = frac > 0 && revealed < path.length ? revealed + 1 : revealed;
  while (out.length < needed) out.push({ x: 0, y: 0 });
  out.length = needed;

  for (let i = 0; i < revealed; i++) {
    out[i].x = path[i].x;
    out[i].y = path[i].y;
  }
  if (frac > 0 && revealed < path.length) {
    const a = path[revealed - 1];
    const b = path[revealed];
    out[revealed].x = a.x + (b.x - a.x) * frac;
    out[revealed].y = a.y + (b.y - a.y) * frac;
  }
  return out;
}

/** True once an edge has fully retracted (renderer can discard it). */
export function isEdgeGone(edge: SimEdge): boolean {
  return edge.state === 'retracting' && edge.growth <= 0;
}

/** True once a node has fully retracted (simulation will drop it). */
export function isNodeGone(node: SimNode): boolean {
  return node.state === 'retracting' && node.growth <= 0;
}
