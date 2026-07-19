/**
 * Force accumulators for the graph simulation.
 *
 * Each function computes forces for one aspect of the simulation and
 * accumulates them into per-node `(fx, fy)` scratch buffers indexed by the
 * `index` map. They are intentionally pure w.r.t. their inputs so unit tests
 * can drive them directly without instantiating a full simulation.
 */

import { effectiveRadius } from './growth';
import type { SimEdge, SimNode } from './types';

/** Scratch buffers reused across a single `step()` call. */
export interface ForceScratch {
  fx: Float64Array;
  fy: Float64Array;
}

export function ensureScratch(scratch: ForceScratch | null, n: number): ForceScratch {
  if (scratch && scratch.fx.length >= n) {
    scratch.fx.fill(0, 0, n);
    scratch.fy.fill(0, 0, n);
    return scratch;
  }
  // Over-allocate a bit to amortize growth as nodes stream in.
  const cap = Math.max(n, scratch ? scratch.fx.length * 2 : 16);
  return { fx: new Float64Array(cap), fy: new Float64Array(cap) };
}

/**
 * Soft-body pairwise repulsion. When two circles overlap (with `pad` slack)
 * they push each other apart with a Hookean force proportional to overlap.
 *
 * O(n²), which is fine for the ~100–300 node budget called for by the viz.
 * Radii scale with `growth` via `effectiveRadius` so freshly-spawned nodes
 * don't blast their neighbors on birth.
 */
export function applyRepulsion(
  nodes: SimNode[],
  scratch: ForceScratch,
  coefficient: number,
  pad: number
): void {
  const { fx, fy } = scratch;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const ra = effectiveRadius(a);
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const rb = effectiveRadius(b);
      const min = ra + rb + pad;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.hypot(dx, dy);
      if (dist === 0) {
        // Deterministic-ish nudge so coincident nodes still separate.
        dx = (i - j) * 0.001;
        dy = (j - i) * 0.001;
        dist = Math.hypot(dx, dy);
      }
      if (dist >= min) continue;
      const overlap = min - dist;
      const invDist = 1 / dist;
      const nx = dx * invDist;
      const ny = dy * invDist;
      const force = coefficient * overlap;
      const ax = a.mass || 1;
      const bx = b.mass || 1;
      const totalMass = ax + bx;
      const shareA = bx / totalMass;
      const shareB = ax / totalMass;
      fx[i] -= nx * force * shareA;
      fy[i] -= ny * force * shareA;
      fx[j] += nx * force * shareB;
      fy[j] += ny * force * shareB;
    }
  }
}

/**
 * Spring attraction along each edge, resting at `rA + rB + pad`. Uses
 * `effectiveRadius` so brand-new nodes glide toward their parent instead of
 * yanking with full force from birth.
 */
export function applyEdgeSprings(
  edges: SimEdge[],
  nodes: SimNode[],
  index: Map<string, number>,
  scratch: ForceScratch,
  stiffness: number,
  pad: number
): void {
  const { fx, fy } = scratch;
  for (const edge of edges) {
    const ai = index.get(edge.from);
    const bi = index.get(edge.to);
    if (ai === undefined || bi === undefined) continue;
    const a = nodes[ai];
    const b = nodes[bi];
    const rest = effectiveRadius(a) + effectiveRadius(b) + pad;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) continue;
    const disp = dist - rest;
    // Modulate by edge growth so a retracting vein loosens naturally.
    const gain = stiffness * (0.15 + 0.85 * edge.growth);
    const force = gain * disp;
    const nx = dx / dist;
    const ny = dy / dist;
    fx[ai] += nx * force;
    fy[ai] += ny * force;
    fx[bi] -= nx * force;
    fy[bi] -= ny * force;
  }
}

/**
 * Cluster cohesion — every node is nudged toward the mean position of its
 * effort peers. Effort hubs act as strong anchors because they get the same
 * pull but also benefit from the springs of every attached record.
 */
export function applyClusterCohesion(
  nodes: SimNode[],
  scratch: ForceScratch,
  strength: number
): void {
  if (strength <= 0 || nodes.length === 0) return;
  const sumsX = new Map<string, number>();
  const sumsY = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const n of nodes) {
    sumsX.set(n.effortId, (sumsX.get(n.effortId) ?? 0) + n.x);
    sumsY.set(n.effortId, (sumsY.get(n.effortId) ?? 0) + n.y);
    counts.set(n.effortId, (counts.get(n.effortId) ?? 0) + 1);
  }
  const { fx, fy } = scratch;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const c = counts.get(n.effortId) ?? 1;
    if (c < 2) continue;
    const cx = (sumsX.get(n.effortId) ?? 0) / c;
    const cy = (sumsY.get(n.effortId) ?? 0) / c;
    fx[i] += (cx - n.x) * strength;
    fy[i] += (cy - n.y) * strength;
  }
}

/** Weak gravity toward the origin so the whole graph doesn't drift away. */
export function applyCentering(
  nodes: SimNode[],
  scratch: ForceScratch,
  strength: number
): void {
  if (strength <= 0) return;
  const { fx, fy } = scratch;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    fx[i] -= n.x * strength;
    fy[i] -= n.y * strength;
  }
}

/**
 * Integrate accumulated forces into velocity + position. Uses semi-implicit
 * Euler with exponential damping so behavior stays stable across variable
 * frame times (dt jitter, tab-switch spikes).
 */
export function integrate(
  nodes: SimNode[],
  scratch: ForceScratch,
  dt: number,
  damping: number,
  maxStep: number
): void {
  const { fx, fy } = scratch;
  // `retention` is what fraction of velocity survives 1 second at `damping`.
  const retention = Math.exp(-Math.max(0, damping) * dt);
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const invMass = 1 / (n.mass || 1);
    n.vx = (n.vx + fx[i] * invMass * dt) * retention;
    n.vy = (n.vy + fy[i] * invMass * dt) * retention;
    let stepX = n.vx * dt;
    let stepY = n.vy * dt;
    // Clamp the total per-step displacement to `maxStep` for stability.
    const stepLen = Math.hypot(stepX, stepY);
    if (stepLen > maxStep && stepLen > 0) {
      const scale = maxStep / stepLen;
      stepX *= scale;
      stepY *= scale;
    }
    n.x += stepX;
    n.y += stepY;
  }
}
