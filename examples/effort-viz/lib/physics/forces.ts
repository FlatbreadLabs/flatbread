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

/**
 * Per-cluster aggregates, recomputed each step. Held on the scratch object so
 * a 60fps loop doesn't allocate fresh maps and arrays every frame.
 */
export interface ClusterScratch {
  /** Cluster index per node, parallel to `nodes`. */
  nodeCluster: Int32Array;
  indexOf: Map<string, number>;
  count: number;
  cx: Float64Array;
  cy: Float64Array;
  members: Float64Array;
  /** Distance from the centroid to the outermost member, plus its radius. */
  reach: Float64Array;
}

/** Scratch buffers reused across a single `step()` call. */
export interface ForceScratch {
  fx: Float64Array;
  fy: Float64Array;
  clusters: ClusterScratch;
}

function ensureClusterCapacity(clusters: ClusterScratch, n: number): ClusterScratch {
  if (clusters.cx.length >= n && clusters.nodeCluster.length >= n) return clusters;
  const cap = Math.max(n, 16);
  return {
    nodeCluster: new Int32Array(cap),
    indexOf: clusters.indexOf,
    count: 0,
    cx: new Float64Array(cap),
    cy: new Float64Array(cap),
    members: new Float64Array(cap),
    reach: new Float64Array(cap),
  };
}

export function ensureScratch(scratch: ForceScratch | null, n: number): ForceScratch {
  if (scratch && scratch.fx.length >= n) {
    scratch.fx.fill(0, 0, n);
    scratch.fy.fill(0, 0, n);
    scratch.clusters = ensureClusterCapacity(scratch.clusters, n);
    return scratch;
  }
  // Over-allocate a bit to amortize growth as nodes stream in.
  const cap = Math.max(n, scratch ? scratch.fx.length * 2 : 16);
  const clusters: ClusterScratch = {
    nodeCluster: new Int32Array(cap),
    indexOf: scratch?.clusters.indexOf ?? new Map<string, number>(),
    count: 0,
    cx: new Float64Array(cap),
    cy: new Float64Array(cap),
    members: new Float64Array(cap),
    reach: new Float64Array(cap),
  };
  return { fx: new Float64Array(cap), fy: new Float64Array(cap), clusters };
}

/**
 * Bucket nodes by `effortId` and compute each cluster's centroid and reach.
 * Shared by cohesion and separation so the pass runs once per step.
 */
export function computeClusters(nodes: SimNode[], scratch: ForceScratch): void {
  const c = scratch.clusters;
  c.indexOf.clear();
  c.count = 0;

  for (let i = 0; i < nodes.length; i++) {
    const id = nodes[i].effortId;
    let slot = c.indexOf.get(id);
    if (slot === undefined) {
      slot = c.count++;
      c.indexOf.set(id, slot);
      c.cx[slot] = 0;
      c.cy[slot] = 0;
      c.members[slot] = 0;
      c.reach[slot] = 0;
    }
    c.nodeCluster[i] = slot;
    c.cx[slot] += nodes[i].x;
    c.cy[slot] += nodes[i].y;
    c.members[slot] += 1;
  }

  for (let s = 0; s < c.count; s++) {
    const members = c.members[s] || 1;
    c.cx[s] /= members;
    c.cy[s] /= members;
  }

  for (let i = 0; i < nodes.length; i++) {
    const s = c.nodeCluster[i];
    const n = nodes[i];
    const span = Math.hypot(n.x - c.cx[s], n.y - c.cy[s]) + effectiveRadius(n);
    if (span > c.reach[s]) c.reach[s] = span;
  }
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
  const { fx, fy, clusters } = scratch;
  for (let i = 0; i < nodes.length; i++) {
    const s = clusters.nodeCluster[i];
    if (clusters.members[s] < 2) continue;
    const n = nodes[i];
    fx[i] += (clusters.cx[s] - n.x) * strength;
    fy[i] += (clusters.cy[s] - n.y) * strength;
  }
}

/**
 * Push whole Effort clusters apart when their discs overlap.
 *
 * Generic node-node repulsion is not enough on its own: it separates
 * individual records but lets two clusters interleave, at which point spatial
 * position stops reading as Effort membership and the hub labels collide.
 * Since position is the channel carrying cluster identity, keeping clusters
 * visually distinct is load-bearing rather than cosmetic.
 */
export function applyClusterSeparation(
  nodes: SimNode[],
  scratch: ForceScratch,
  strength: number,
  pad: number
): void {
  const { fx, fy, clusters } = scratch;
  if (strength <= 0 || clusters.count < 2) return;

  for (let a = 0; a < clusters.count; a++) {
    for (let b = a + 1; b < clusters.count; b++) {
      const min = clusters.reach[a] + clusters.reach[b] + pad;
      let dx = clusters.cx[b] - clusters.cx[a];
      let dy = clusters.cy[b] - clusters.cy[a];
      let dist = Math.hypot(dx, dy);
      if (dist === 0) {
        dx = (a - b) * 0.001;
        dy = 0.001;
        dist = Math.hypot(dx, dy);
      }
      if (dist >= min) continue;
      // Normalize by member count so a 30-record cluster and a 3-record one
      // separate by the same distance rather than the small one being flung.
      const push = (strength * (min - dist)) / dist;
      const nx = dx * push;
      const ny = dy * push;
      for (let i = 0; i < nodes.length; i++) {
        const s = clusters.nodeCluster[i];
        if (s === a) {
          fx[i] -= nx / clusters.members[a];
          fy[i] -= ny / clusters.members[a];
        } else if (s === b) {
          fx[i] += nx / clusters.members[b];
          fy[i] += ny / clusters.members[b];
        }
      }
    }
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
