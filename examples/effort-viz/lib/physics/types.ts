/**
 * Public types for the Effort Graph physics + growth engine.
 *
 * The engine is a pure-TypeScript layer intended to be stepped from an R3F
 * `useFrame` callback. It knows nothing about React or Three.js — it produces
 * plain numeric state that a renderer can read via `getState()`.
 */

export type NodeKind = 'effort' | 'record' | (string & Record<never, never>);
export type LifecycleState = 'growing' | 'settled' | 'retracting';

/**
 * Input node passed to `sync()`. Only stable identity + metadata; the engine
 * owns position/velocity/growth for any id it has already seen.
 */
export interface GraphInputNode {
  /** Globally unique identifier for this node. */
  id: string;
  /** Cluster id — nodes sharing an `effortId` are pulled toward a shared centroid. */
  effortId: string;
  /** Semantic kind. Efforts render as hubs; records are leaves. */
  kind: NodeKind;
  /**
   * Optional visual radius override. When omitted, the engine picks a default
   * based on `kind` (see `SimulationOptions.effortHubRadius` / `recordRadius`).
   */
  radius?: number;
  /**
   * Optional "parent" id used purely for spawn placement + vein origination
   * when the node first appears. Defaults to the effort hub of the same
   * `effortId`, if any.
   */
  parentId?: string;
}

/**
 * Input edge passed to `sync()`.
 */
export interface GraphInputEdge {
  /** Stable id for this edge — used to track growth/retraction across syncs. */
  id: string;
  from: string;
  to: string;
}

/** A point along an organic vein polyline (world coordinates, z=0). */
export interface VeinPoint {
  x: number;
  y: number;
}

/**
 * Runtime state of a node. Positions are world units, velocities are units/sec.
 * `growth` is a normalized 0..1 progress used for both intro (growing) and
 * outro (retracting) animation.
 */
export interface SimNode {
  id: string;
  effortId: string;
  kind: NodeKind;
  /** Target radius (final, at growth === 1). */
  radius: number;
  /** Current position (world units). */
  x: number;
  y: number;
  /** Current velocity (world units/sec). */
  vx: number;
  vy: number;
  /** Simulation time (seconds) when this node first spawned. */
  birth: number;
  /** 0..1 lifecycle progress — grows in, may shrink on retract. */
  growth: number;
  state: LifecycleState;
  /** Mass affects how strongly a node is displaced by repulsion. */
  mass: number;
}

/**
 * Runtime state of a vein / edge. `path` is a polyline from `from` → `to`
 * with small organic offsets. `growth` is how far the tip has advanced from
 * `from` along `path` (0..1).
 */
export interface SimEdge {
  id: string;
  from: string;
  to: string;
  growth: number;
  state: LifecycleState;
  /**
   * Organic control offsets (unit-space) applied along the segment normal.
   * Recomputed lazily from the id hash + endpoint distance so that the vein
   * can be rebuilt each frame as endpoints move.
   */
  offsets: number[];
  /** Cached polyline in world coords (recomputed each step). */
  path: VeinPoint[];
}

/**
 * Immutable-ish snapshot returned by `getState()`. The arrays reference the
 * live simulation objects to avoid per-frame allocation — treat them as
 * read-only from the render side.
 */
export interface SimulationState {
  time: number;
  nodes: SimNode[];
  edges: SimEdge[];
}

export interface SimulationOptions {
  // ── Forces ────────────────────────────────────────────────────────────────
  /** Soft-body repulsion coefficient. */
  repulsion?: number;
  /** Spring stiffness along edges. */
  spring?: number;
  /** Pull toward the mean position of same-effort neighbors. */
  clusterCohesion?: number;
  /**
   * Push whole effort clusters apart when their discs overlap. Position is the
   * channel that carries cluster identity, so interleaved clusters are a
   * legibility failure, not just a cosmetic one.
   */
  clusterSeparation?: number;
  /** Extra world-space gap enforced between two cluster discs. */
  clusterGap?: number;
  /** Global pull toward the world origin (keeps things on screen). */
  centering?: number;
  /** Fraction of velocity retained per second (0..1). */
  damping?: number;
  /** Extra padding added on top of `r1+r2` for repulsion / edge rest length. */
  restLengthPad?: number;
  /** Clamp per-step displacement to avoid tunneling on large dt. */
  maxStep?: number;

  // ── Sizing ────────────────────────────────────────────────────────────────
  /** Default radius for effort hubs. */
  effortHubRadius?: number;
  /** Default radius for records. */
  recordRadius?: number;

  // ── Growth ────────────────────────────────────────────────────────────────
  /** Per-second growth speed for new nodes and edges (0..1/sec). */
  growthRate?: number;
  /** Per-second retract speed. */
  retractRate?: number;
  /** Random spread applied on spawn, relative to parent radius. */
  spawnJitter?: number;

  // ── Veins ────────────────────────────────────────────────────────────────
  /** Number of intermediate points in each vein polyline (min 0). */
  veinSegments?: number;
  /** Amplitude of organic sideways offsets, as a fraction of segment length. */
  veinNoise?: number;

  // ── Misc ─────────────────────────────────────────────────────────────────
  /** Seed for id-independent randomness (e.g. spawn jitter direction). */
  seed?: number;
}

/**
 * The primary handle returned by `createGraphSimulation`. All methods mutate
 * internal state; consumers should treat the returned snapshot as read-only
 * between frames.
 */
export interface GraphSimulation {
  /**
   * Reconcile the input graph with the current simulation. New ids spawn as
   * `growing`; ids that disappear from the input flip to `retracting` and are
   * removed once fully shrunk.
   */
  sync: (nodes: GraphInputNode[], edges: GraphInputEdge[]) => void;
  /** Advance physics + growth by `dt` seconds (safe with variable frame time). */
  step: (dt: number) => void;
  /** Read the current state. Arrays are live references — do not mutate. */
  getState: () => SimulationState;
}
