/**
 * `createGraphSimulation` — the primary entry point for the Proof
 * physics + growth engine.
 *
 * The engine keeps its own `SimNode` / `SimEdge` for each id it has ever
 * seen. `sync()` reconciles a new snapshot of the input graph (spawning new
 * ids, marking removed ids as retracting). `step(dt)` advances physics and
 * growth. `getState()` returns a live-reference snapshot for rendering.
 *
 * Design notes:
 * - Initial placement uses a hash of `id` so reloads land in roughly the
 *   same place, but physics is still free to settle into a natural layout.
 * - Radii used in force calculations are eased by `growth`, so new nodes
 *   don't blast neighbors on birth and retracting ones let go gracefully.
 * - Veins are polylines with hash-derived organic offsets, reshaped every
 *   step so they stay attached to moving endpoints.
 */

import {
  applyCentering,
  applyClusterCohesion,
  applyClusterSeparation,
  applyEdgeSprings,
  applyRepulsion,
  computeClusters,
  ensureScratch,
  integrate,
  type ForceScratch,
} from './forces';
import { buildVeinPath, clamp01, isEdgeGone, isNodeGone } from './growth';
import { hashString, mulberry32, randAngle, randRange } from './hash';
import type {
  GraphInputEdge,
  GraphInputNode,
  GraphSimulation,
  SimEdge,
  SimNode,
  SimulationOptions,
  SimulationState,
} from './types';

const DEFAULTS: Required<SimulationOptions> = {
  repulsion: 40,
  spring: 4,
  clusterCohesion: 0.6,
  clusterSeparation: 2.2,
  // Enough gap to keep clusters and their titles distinct, no more: the
  // bounding box drives the camera fit, so every unit of empty space between
  // clusters is paid for in glyph size.
  clusterGap: 26,
  centering: 0.04,
  centeringAspect: 0.35,
  damping: 2.2,
  restLengthPad: 6,
  maxStep: 40,
  effortHubRadius: 10.5,
  recordRadius: 6,
  growthRate: 1.2,
  retractRate: 1.8,
  spawnJitter: 1.5,
  veinSegments: 3,
  veinNoise: 0.18,
  seed: 0xc0ffee,
};

interface InternalNode extends SimNode {
  /** Set to false when `sync()` no longer sees the id → schedule retraction. */
  present: boolean;
}

interface InternalEdge extends SimEdge {
  present: boolean;
}

/**
 * Create a new graph simulation. See `SimulationOptions` for tunables.
 *
 * @example
 * const sim = createGraphSimulation();
 * sim.sync(nodes, edges);
 * // in useFrame:
 * sim.step(delta);
 * const { nodes, edges } = sim.getState();
 */
export function createGraphSimulation(
  options: SimulationOptions = {}
): GraphSimulation {
  const opts: Required<SimulationOptions> = { ...DEFAULTS, ...options };

  const nodes: InternalNode[] = [];
  const edges: InternalEdge[] = [];
  const nodesById = new Map<string, InternalNode>();
  const edgesById = new Map<string, InternalEdge>();
  const indexById = new Map<string, number>();
  let scratch: ForceScratch | null = null;
  let time = 0;

  const state: SimulationState = { time, nodes, edges };

  function radiusFor(input: GraphInputNode): number {
    if (typeof input.radius === 'number') return input.radius;
    return input.kind === 'effort' ? opts.effortHubRadius : opts.recordRadius;
  }

  function rebuildIndex(): void {
    indexById.clear();
    for (let i = 0; i < nodes.length; i++) indexById.set(nodes[i].id, i);
  }

  function spawnNode(
    input: GraphInputNode,
    parent: InternalNode | null
  ): InternalNode {
    const rand = mulberry32(hashString(input.id) ^ opts.seed);
    // Deterministic angle + jittered distance so reloads land nearby but not
    // exactly on top of each other. `spawnJitter` scales distance in parent radii.
    const angle = randAngle(rand);
    const parentR = parent ? parent.radius : opts.effortHubRadius;
    const dist = randRange(
      rand,
      parentR * 0.6,
      parentR * (0.6 + opts.spawnJitter)
    );
    const px = parent ? parent.x : 0;
    const py = parent ? parent.y : 0;
    const radius = radiusFor(input);
    const node: InternalNode = {
      id: input.id,
      effortId: input.effortId,
      kind: input.kind,
      radius,
      x: px + Math.cos(angle) * dist,
      y: py + Math.sin(angle) * dist,
      vx: 0,
      vy: 0,
      birth: time,
      growth: 0,
      state: 'growing',
      // Effort hubs get a heavier mass so they anchor their cluster.
      mass: input.kind === 'effort' ? 4 : 1,
      present: true,
    };
    nodes.push(node);
    nodesById.set(node.id, node);
    return node;
  }

  function makeOffsets(edgeId: string, count: number): number[] {
    if (count <= 0) return [];
    const rand = mulberry32(hashString(edgeId) ^ (opts.seed + 1));
    const out = new Array<number>(count);
    for (let i = 0; i < count; i++) out[i] = randRange(rand, -1, 1);
    return out;
  }

  function spawnEdge(input: GraphInputEdge): InternalEdge {
    const edge: InternalEdge = {
      id: input.id,
      from: input.from,
      to: input.to,
      growth: 0,
      state: 'growing',
      offsets: makeOffsets(input.id, opts.veinSegments),
      path: [],
      present: true,
    };
    edges.push(edge);
    edgesById.set(edge.id, edge);
    return edge;
  }

  function sync(
    inputNodes: GraphInputNode[],
    inputEdges: GraphInputEdge[]
  ): void {
    for (const n of nodes) n.present = false;
    for (const e of edges) e.present = false;

    // Two-pass so record nodes can resolve their effort hub / explicit parent
    // even when the effort node is later in the same batch.
    const pending: GraphInputNode[] = [];
    for (const input of inputNodes) {
      const existing = nodesById.get(input.id);
      if (existing) {
        existing.present = true;
        // Live property refresh so kind/radius/effort changes take effect.
        existing.effortId = input.effortId;
        existing.kind = input.kind;
        existing.radius = radiusFor(input);
        existing.mass = input.kind === 'effort' ? 4 : 1;
        if (existing.state === 'retracting') {
          // Re-added while dying: bring it back.
          existing.state = existing.growth >= 1 ? 'settled' : 'growing';
        }
        continue;
      }
      pending.push(input);
    }
    // Sort so effort hubs spawn before their records, giving records a real
    // parent to spawn near.
    pending.sort(
      (a, b) => Number(b.kind === 'effort') - Number(a.kind === 'effort')
    );
    for (const input of pending) {
      let parent: InternalNode | null = null;
      if (input.parentId) parent = nodesById.get(input.parentId) ?? null;
      if (!parent && input.kind !== 'effort') {
        // Prefer the effort hub with the matching id if present.
        parent = nodesById.get(input.effortId) ?? null;
        if (!parent) {
          // Fall back to any settled/growing peer in the same effort.
          for (const n of nodes) {
            if (n.effortId === input.effortId && n.state !== 'retracting') {
              parent = n;
              break;
            }
          }
        }
      }
      spawnNode(input, parent);
    }

    for (const input of inputEdges) {
      const existing = edgesById.get(input.id);
      if (existing) {
        existing.present = true;
        existing.from = input.from;
        existing.to = input.to;
        if (existing.state === 'retracting') {
          existing.state = existing.growth >= 1 ? 'settled' : 'growing';
        }
        continue;
      }
      spawnEdge(input);
    }

    // Anything not touched this sync starts retracting.
    for (const n of nodes)
      if (!n.present && n.state !== 'retracting') n.state = 'retracting';
    for (const e of edges)
      if (!e.present && e.state !== 'retracting') e.state = 'retracting';

    rebuildIndex();
  }

  function advanceGrowth(dt: number): void {
    const g = opts.growthRate * dt;
    const r = opts.retractRate * dt;
    for (const n of nodes) {
      if (n.state === 'growing') {
        n.growth = clamp01(n.growth + g);
        if (n.growth >= 1) n.state = 'settled';
      } else if (n.state === 'retracting') {
        n.growth = clamp01(n.growth - r);
      }
    }
    for (const e of edges) {
      if (e.state === 'growing') {
        e.growth = clamp01(e.growth + g);
        if (e.growth >= 1) e.state = 'settled';
      } else if (e.state === 'retracting') {
        e.growth = clamp01(e.growth - r);
      }
    }
  }

  function reapDead(): void {
    let dirty = false;
    for (let i = edges.length - 1; i >= 0; i--) {
      if (isEdgeGone(edges[i])) {
        edgesById.delete(edges[i].id);
        edges.splice(i, 1);
      }
    }
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (isNodeGone(nodes[i])) {
        nodesById.delete(nodes[i].id);
        nodes.splice(i, 1);
        dirty = true;
      }
    }
    if (dirty) rebuildIndex();
  }

  function refreshVeinPaths(): void {
    for (const edge of edges) {
      const from = nodesById.get(edge.from);
      const to = nodesById.get(edge.to);
      if (!from || !to) continue;
      buildVeinPath(
        from.x,
        from.y,
        to.x,
        to.y,
        edge.offsets,
        opts.veinNoise,
        edge.path
      );
    }
  }

  function step(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    // Clamp very large dt (tab switch) so a single step can't destabilize.
    const clampedDt = Math.min(dt, 0.1);
    time += clampedDt;
    state.time = time;

    advanceGrowth(clampedDt);

    if (nodes.length > 0) {
      scratch = ensureScratch(scratch, nodes.length);
      computeClusters(nodes, scratch);
      applyRepulsion(nodes, scratch, opts.repulsion, opts.restLengthPad);
      applyEdgeSprings(
        edges,
        nodes,
        indexById,
        scratch,
        opts.spring,
        opts.restLengthPad
      );
      applyClusterCohesion(nodes, scratch, opts.clusterCohesion);
      applyClusterSeparation(scratch, opts.clusterSeparation, opts.clusterGap);
      applyCentering(nodes, scratch, opts.centering, opts.centeringAspect);
      integrate(nodes, scratch, clampedDt, opts.damping, opts.maxStep);
    }

    reapDead();
    refreshVeinPaths();
  }

  function getState(): SimulationState {
    return state;
  }

  return { sync, step, getState };
}
