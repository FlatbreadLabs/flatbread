import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Group, Mesh, OrthographicCamera } from 'three';

/** Minimal controls surface used by the camera helpers (drei OrbitControls). */
interface PanZoomControlsHandle {
  target: THREE.Vector3;
  update: () => void;
}

import {
  createGraphSimulation,
  effectiveRadius,
  isEdgeGone,
  veinTipPolyline,
  type GraphInputEdge,
  type GraphInputNode,
  type GraphSimulation,
  type SimEdge,
  type SimNode,
  type VeinPoint,
} from '@/core/physics';
import {
  effortOklch,
  oklchToThreeColor,
  retiredOklch,
  structuralOklch,
  type Oklch,
} from '@/core/oklch';
import { PRIMITIVES, primitiveOklch } from '@/presets/proof/primitives';
import {
  CIRCLE_SEGMENTS,
  GLYPH_OUTLINES,
  RING_INNER_RATIO,
  glyphExtent,
  type GlyphId,
} from '@/presets/proof/glyphs';
import {
  buildAlivenessMap,
  isOpenBlocker,
  type Aliveness,
  type EffectiveLifecycle,
} from '@/presets/proof/lifecycle';
import type {
  GraphEdge,
  GraphEdgeKind,
  GraphNode,
} from '@/presets/proof/types';
import { useTheme, type ColorMode } from '../hooks/useTheme';
import {
  RELATION_META,
  relationStrokeOklch,
  type RelationMeta,
} from './RelationLegend';

export interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * Convert normalized graph nodes/edges → physics inputs.
 * Efforts have effortId=null in the normalizer; the sim needs a stable
 * cluster id, so we fall back to the node's own id for effort hubs.
 */
function toSimInputs(
  nodes: GraphNode[],
  edges: GraphEdge[]
): { simNodes: GraphInputNode[]; simEdges: GraphInputEdge[] } {
  const simNodes = nodes.map<GraphInputNode>((n) => ({
    id: n.id,
    effortId: n.effortId ?? n.id,
    kind: n.kind,
    parentId: n.effortId ?? undefined,
  }));
  const simEdges = edges.map<GraphInputEdge>((e) => ({
    id: e.id,
    from: e.source,
    to: e.target,
  }));
  return { simNodes, simEdges };
}

function idsChanged(
  current: Array<{ id: string }>,
  previous: string[]
): boolean {
  if (current.length !== previous.length) return true;
  for (let i = 0; i < current.length; i++) {
    if (current[i].id !== previous[i]) return true;
  }
  return false;
}

/**
 * Cached glyph geometry, built once per kind. Node meshes scale a unit glyph
 * rather than rebuilding geometry, so adding a record costs one mesh.
 */
const GLYPH_GEOMETRY = new Map<GlyphId, THREE.BufferGeometry>();

function glyphGeometry(glyph: GlyphId): THREE.BufferGeometry {
  const cached = GLYPH_GEOMETRY.get(glyph);
  if (cached) return cached;

  let geometry: THREE.BufferGeometry;
  if (glyph === 'circle') {
    geometry = new THREE.CircleGeometry(1, CIRCLE_SEGMENTS);
  } else if (glyph === 'ring') {
    geometry = new THREE.RingGeometry(RING_INNER_RATIO, 1, CIRCLE_SEGMENTS);
  } else {
    const shape = new THREE.Shape();
    const outline = GLYPH_OUTLINES[glyph];
    shape.moveTo(outline[0].x, outline[0].y);
    for (let i = 1; i < outline.length; i++)
      shape.lineTo(outline[i].x, outline[i].y);
    shape.closePath();
    geometry = new THREE.ShapeGeometry(shape);
  }
  GLYPH_GEOMETRY.set(glyph, geometry);
  return geometry;
}

/** Pointer travel (CSS px) beyond which a gesture is a pan, not a tap. */
const TAP_SLOP_PX = 8;

/** Minimum on-screen hit diameter, in CSS px, regardless of zoom. */
const MIN_HIT_DIAMETER_PX = 44;

export default function GraphCanvas(props: GraphCanvasProps) {
  const { mode } = useTheme();
  const { nodes, selectedId, onSelect } = props;
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const takeoverRef = useRef<CameraTakeover | null>(null);
  if (takeoverRef.current === null)
    takeoverRef.current = createCameraTakeover();
  const takeover = takeoverRef.current;

  /**
   * Stable keyboard traversal order: Effort hub, then its records grouped by
   * primitive. Deliberately independent of simulation array order, which
   * churns as nodes spawn and retract.
   */
  const walkOrder = useMemo(() => {
    const kindRank: Record<GraphNode['kind'], number> = {
      effort: 0,
      issue: 1,
      finding: 2,
      decision: 3,
      constraint: 4,
      risk: 5,
    };
    return [...nodes].sort((a, b) => {
      const ea = a.effortId ?? a.id;
      const eb = b.effortId ?? b.id;
      if (ea !== eb) return ea.localeCompare(eb);
      if (a.kind !== b.kind) return kindRank[a.kind] - kindRank[b.kind];
      return a.title.localeCompare(b.title);
    });
  }, [nodes]);

  const lifecycles = useMemo(
    () => buildAlivenessMap(props.nodes, props.edges),
    [props.nodes, props.edges]
  );

  // Drop focus when the focused record leaves the graph on a live update.
  useEffect(() => {
    if (focusedId && !nodes.some((n) => n.id === focusedId)) setFocusedId(null);
  }, [nodes, focusedId]);

  const step = useCallback(
    (delta: number) => {
      if (walkOrder.length === 0) return;
      const current = focusedId ?? selectedId;
      const index = current ? walkOrder.findIndex((n) => n.id === current) : -1;
      const next =
        walkOrder[(index + delta + walkOrder.length) % walkOrder.length];
      setFocusedId(next.id);
    },
    [walkOrder, focusedId, selectedId]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          step(1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          step(-1);
          break;
        case 'Home':
          event.preventDefault();
          if (walkOrder.length > 0) setFocusedId(walkOrder[0].id);
          break;
        case 'End':
          event.preventDefault();
          if (walkOrder.length > 0)
            setFocusedId(walkOrder[walkOrder.length - 1].id);
          break;
        case 'Enter':
        case ' ':
          if (focusedId) {
            event.preventDefault();
            onSelect(focusedId);
          }
          break;
        case 'Escape':
          if (selectedId || focusedId) {
            event.preventDefault();
            onSelect(null);
            setFocusedId(null);
          }
          break;
        default:
          break;
      }
    },
    [step, walkOrder, focusedId, selectedId, onSelect]
  );

  const focusedNode = focusedId
    ? nodes.find((n) => n.id === focusedId)
    : undefined;
  const focusedLife = focusedId ? lifecycles.get(focusedId) : undefined;

  return (
    <div
      ref={wrapperRef}
      role="application"
      tabIndex={0}
      aria-label="Effort Graph canvas"
      aria-describedby="graph-canvas-help"
      onKeyDown={handleKeyDown}
      onWheel={takeover.onWheel}
      onPointerDown={takeover.onPointerDown}
      onPointerMove={takeover.onPointerMove}
      onPointerUp={takeover.onPointerUp}
      onPointerCancel={takeover.onPointerUp}
      /* Inset ring: an offset ring on a full-bleed element is clipped to a
         stray line along one edge instead of reading as a focus indicator. */
      className="relative h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
    >
      <p id="graph-canvas-help" className="sr-only">
        Use the arrow keys to move between records, Enter to open a
        record&apos;s details, and Escape to close. Drag to pan and scroll to
        zoom.
      </p>
      <Canvas
        className="h-full w-full touch-none"
        orthographic
        camera={{ position: [0, 0, 100], zoom: 4, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
        onPointerMissed={() => {
          props.onSelect(null);
          setFocusedId(null);
        }}
      >
        <GraphScene
          {...props}
          mode={mode}
          focusedId={focusedId}
          onFocus={setFocusedId}
          lifecycles={lifecycles}
          drawerOpen={selectedId !== null}
          takeover={takeover}
        />
      </Canvas>
      <div aria-live="polite" className="sr-only">
        {focusedNode
          ? `${PRIMITIVES[focusedNode.kind].label}: ${focusedNode.title}${
              focusedLife?.state ? `, ${focusedLife.state}` : ''
            }`
          : ''}
      </div>
    </div>
  );
}

interface GraphSceneProps extends GraphCanvasProps {
  mode: ColorMode;
  focusedId: string | null;
  onFocus: (id: string | null) => void;
  lifecycles: Map<string, EffectiveLifecycle>;
  drawerOpen: boolean;
  takeover: CameraTakeover;
}

function GraphScene({
  nodes,
  edges,
  selectedId,
  onSelect,
  mode,
  focusedId,
  onFocus,
  lifecycles,
  drawerOpen,
  takeover,
}: GraphSceneProps) {
  const simRef = useRef<GraphSimulation | null>(null);
  if (simRef.current === null) {
    simRef.current = createGraphSimulation();
  }
  const sim = simRef.current;

  const nodeIdsRef = useRef<string[]>([]);
  const edgeIdsRef = useRef<string[]>([]);
  const [, setRenderTick] = useState(0);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const { simNodes, simEdges } = toSimInputs(nodes, edges);
    const settledBefore = sim
      .getState()
      .nodes.some((n) => n.state === 'settled');
    sim.sync(simNodes, simEdges);
    /*
     * Reduced motion: settle the layout and finish every growth animation
     * before the next paint, so the graph appears in place instead of crawling
     * outward from the origin.
     *
     * Only on the first sync. Repulsion is O(n²) and this runs synchronously,
     * so re-settling on every live generation would freeze the tab for seconds
     * on a large graph — a worse experience than the animation it replaces.
     * Later syncs need far fewer steps because they start from a settled
     * layout and only have to grow the new records in.
     */
    const warmupSteps = reduceMotion ? (settledBefore ? 60 : 240) : 0;
    for (let i = 0; i < warmupSteps; i++) sim.step(1 / 60);
    const state = sim.getState();
    nodeIdsRef.current = state.nodes.map((n) => n.id);
    edgeIdsRef.current = state.edges.map((e) => e.id);
    setRenderTick((t) => t + 1);
  }, [nodes, edges, sim, reduceMotion]);

  useFrame((_, delta) => {
    sim.step(delta);
    const state = sim.getState();
    if (
      idsChanged(state.nodes, nodeIdsRef.current) ||
      idsChanged(state.edges, edgeIdsRef.current)
    ) {
      nodeIdsRef.current = state.nodes.map((n) => n.id);
      edgeIdsRef.current = state.edges.map((e) => e.id);
      setRenderTick((t) => t + 1);
    }
  });

  const state = sim.getState();

  /**
   * Metadata for every node we have *ever* seen, not just the current query
   * result. A removed record is gone from `nodes` the instant it is deleted,
   * but the simulation keeps it alive while it retracts — without this cache
   * the retract animation has no colour or kind to render and the node pops
   * out of existence while its edges withdraw gracefully.
   */
  const metaCacheRef = useRef(new Map<string, GraphNode>());
  const nodeMetaById = useMemo(() => {
    const cache = metaCacheRef.current;
    for (const n of nodes) cache.set(n.id, n);
    return cache;
  }, [nodes]);

  useEffect(() => {
    const cache = metaCacheRef.current;
    const live = new Set(state.nodes.map((n) => n.id));
    for (const id of cache.keys()) {
      if (!live.has(id)) cache.delete(id);
    }
  }, [state.nodes, nodes]);

  const edgesById = useMemo(() => {
    const map = new Map<string, GraphEdge>();
    for (const e of edges) map.set(e.id, e);
    return map;
  }, [edges]);

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // A removed node never fires pointerout, so clear hover when it disappears.
  useEffect(() => {
    if (hoveredId && !nodes.some((n) => n.id === hoveredId)) setHoveredId(null);
  }, [nodes, hoveredId]);

  const activeId = focusedId ?? selectedId;

  return (
    <>
      <PanZoomControls />
      <FitCamera
        sim={sim}
        nodeCount={nodes.length}
        reduceMotion={reduceMotion}
        takeover={takeover}
      />
      <PanToFocus
        sim={sim}
        focusedId={focusedId}
        reduceMotion={reduceMotion}
        drawerOpen={drawerOpen}
      />
      <group>
        {state.edges.map((edge) => {
          const graphEdge = edgesById.get(edge.id);
          const edgeKind = graphEdge?.kind ?? edgeKindFromId(edge.id);
          if (!edgeKind) return null;
          return (
            <EdgeLine
              key={edge.id}
              edge={edge}
              edgeKind={edgeKind}
              mode={mode}
              nodesById={nodeMetaById}
              lifecycles={lifecycles}
              activeId={activeId}
              hoveredId={hoveredId}
            />
          );
        })}
      </group>
      <group>
        {state.nodes.map((node) => {
          const meta = nodeMetaById.get(node.id);
          if (!meta) return null;
          return (
            <NodeMesh
              key={node.id}
              node={node}
              meta={meta}
              mode={mode}
              aliveness={lifecycles.get(node.id)?.aliveness ?? 'settled'}
              blocker={isOpenBlocker(meta, lifecycles.get(node.id))}
              selected={selectedId === node.id}
              focused={focusedId === node.id}
              reduceMotion={reduceMotion}
              onSelect={onSelect}
              onFocus={onFocus}
              onHover={setHoveredId}
            />
          );
        })}
      </group>
      <group>
        {state.nodes.map((node) => {
          const meta = nodeMetaById.get(node.id);
          if (!meta) return null;
          const isActive = activeId === node.id;
          const isHovered = hoveredId === node.id;
          if (meta.kind === 'effort') {
            return (
              <ClusterLabel
                key={`label-${node.id}`}
                sim={sim}
                node={node}
                meta={meta}
                active={isActive}
                retired={lifecycles.get(node.id)?.aliveness === 'retired'}
              />
            );
          }
          if (!isActive && !isHovered) return null;
          return (
            <NodeLabel
              key={`label-${node.id}`}
              node={node}
              meta={meta}
              active={isActive}
              retired={lifecycles.get(node.id)?.aliveness === 'retired'}
            />
          );
        })}
      </group>
      <CursorReset />
    </>
  );
}

/** Live `prefers-reduced-motion`, so a mid-session change takes effect. */
function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduce(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduce;
}

/**
 * Screen-space padding so fitted nodes stay clear of floating chrome. Only the
 * legend is reserved, because it is always present; the detail drawer is
 * transient, and permanently reserving its ~356px would surrender a quarter of
 * the canvas to a panel that is usually closed.
 */
function fitChromeInsets(viewportWidth: number): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const isWide = viewportWidth >= 640;
  return {
    top: 24,
    bottom: isWide ? 40 : 116,
    left: isWide ? 284 : 16,
    right: isWide ? 40 : 16,
  };
}

/**
 * Frame the orthographic camera on the live simulation bounds once the
 * layout has mostly settled (or after a short timeout), then ease into place
 * rather than snapping — a hard cut after a two-second delay reads as a bug.
 * Re-fits when the node count changes or the canvas viewport resizes.
 */
function FitCamera({
  sim,
  nodeCount,
  reduceMotion,
  takeover,
}: {
  sim: GraphSimulation;
  nodeCount: number;
  reduceMotion: boolean;
  takeover: CameraTakeover;
}) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const controls = useThree((s) => s.controls) as PanZoomControlsHandle | null;
  const size = useThree((s) => s.size);
  const fitted = useRef(false);
  const elapsedRef = useRef(0);
  const targetRef = useRef<{ x: number; y: number; zoom: number } | null>(null);

  const sizeKey = `${size.width}x${size.height}`;

  useEffect(() => {
    fitted.current = false;
    elapsedRef.current = 0;
  }, [nodeCount, sizeKey]);

  useFrame((_, delta) => {
    // Reader pan/zoom wins immediately, including mid-ease: drop any pending
    // fit target and stop writing the camera for the rest of the session.
    if (takeover.get()) {
      targetRef.current = null;
      return;
    }

    // Ease toward a pending fit target — exponential approach, which is an
    // ease-out. A hard cut after the settle delay reads as a glitch.
    const target = targetRef.current;
    if (target) {
      const t = reduceMotion ? 1 : 1 - Math.exp(-delta * 9);
      camera.position.x += (target.x - camera.position.x) * t;
      camera.position.y += (target.y - camera.position.y) * t;
      camera.zoom += (target.zoom - camera.zoom) * t;
      camera.updateProjectionMatrix();
      if (controls) {
        controls.target.set(camera.position.x, camera.position.y, 0);
        controls.update();
      }
      const close =
        Math.abs(target.x - camera.position.x) < 0.05 &&
        Math.abs(target.y - camera.position.y) < 0.05 &&
        Math.abs(target.zoom - camera.zoom) < 0.005;
      if (close) targetRef.current = null;
      return;
    }

    elapsedRef.current += delta;

    const { nodes } = sim.getState();
    let alive = 0;
    let kinetic = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const n of nodes) {
      if (n.growth <= 0.35 || n.state === 'retracting') continue;
      alive += 1;
      kinetic += n.vx * n.vx + n.vy * n.vy;
      const r = Math.max(effectiveRadius(n), 1);
      if (n.x - r < minX) minX = n.x - r;
      if (n.x + r > maxX) maxX = n.x + r;
      if (n.y - r < minY) minY = n.y - r;
      if (n.y + r > maxY) maxY = n.y + r;
    }
    if (alive === 0) return;

    const settled = reduceMotion || kinetic < 2.5 || elapsedRef.current > 2.4;
    if (!settled) return;

    const width = Math.max(maxX - minX, 20);
    const height = Math.max(maxY - minY, 20);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const pad = 1.12;

    const insets = fitChromeInsets(size.width);
    const availW = Math.max(size.width - insets.left - insets.right, 64);
    const availH = Math.max(size.height - insets.top - insets.bottom, 64);
    const zoom = Math.min(availW / (width * pad), availH / (height * pad), 12);
    const clampedZoom = Math.max(zoom, 0.75);

    const nextX = cx - (insets.left - insets.right) / 2 / clampedZoom;
    const nextY = cy - (insets.bottom - insets.top) / 2 / clampedZoom;

    /*
     * Keep re-fitting while the layout is still spreading. Cluster separation
     * pushes the graph outward for a while after the first fit, so a one-shot
     * fit leaves records stranded off-screen.
     */
    if (fitted.current) {
      const drifted =
        Math.abs(nextX - camera.position.x) > 4 / clampedZoom ||
        Math.abs(nextY - camera.position.y) > 4 / clampedZoom ||
        Math.abs(clampedZoom - camera.zoom) / camera.zoom > 0.04;
      if (!drifted) return;
    }

    targetRef.current = { x: nextX, y: nextY, zoom: clampedZoom };
    fitted.current = true;
  });

  return null;
}

/**
 * Tracks whether the reader has taken the camera over, from raw DOM input on
 * the canvas wrapper.
 *
 * Deliberately not derived from OrbitControls events: `start` fires on
 * pointer-down before anything moves, so a tap to select a record would count
 * as a pan, and `change` also fires from our own easing's `controls.update()`.
 * A wheel gesture or a drag past the tap threshold is unambiguous.
 */
function createCameraTakeover() {
  const state = {
    moved: false,
    downAt: null as { x: number; y: number } | null,
  };
  return {
    get: () => state.moved,
    onWheel: () => {
      state.moved = true;
    },
    onPointerDown: (event: React.PointerEvent) => {
      state.downAt = { x: event.clientX, y: event.clientY };
    },
    onPointerMove: (event: React.PointerEvent) => {
      const down = state.downAt;
      if (!down) return;
      if (
        Math.hypot(event.clientX - down.x, event.clientY - down.y) > TAP_SLOP_PX
      ) {
        state.moved = true;
      }
    },
    onPointerUp: () => {
      state.downAt = null;
    },
  };
}

type CameraTakeover = ReturnType<typeof createCameraTakeover>;

/**
 * Keep the keyboard-focused record on screen. Without this, arrowing through
 * the graph silently moves focus to nodes outside the viewport.
 */
function PanToFocus({
  sim,
  focusedId,
  reduceMotion,
  drawerOpen,
}: {
  sim: GraphSimulation;
  focusedId: string | null;
  reduceMotion: boolean;
  drawerOpen: boolean;
}) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const controls = useThree((s) => s.controls) as PanZoomControlsHandle | null;
  const size = useThree((s) => s.size);
  const pendingRef = useRef<string | null>(null);

  useEffect(() => {
    pendingRef.current = focusedId;
  }, [focusedId]);

  useFrame((_, delta) => {
    const id = pendingRef.current;
    if (!id) return;
    const node = sim.getState().nodes.find((n) => n.id === id);
    if (!node) {
      pendingRef.current = null;
      return;
    }

    /*
     * The drawer covers the right edge, so aim left of centre while it is
     * open. Otherwise pressing Enter can park the record you just selected
     * underneath the panel describing it.
     */
    const isWide = size.width >= 640;
    const shiftPx = drawerOpen && isWide ? 200 : 0;
    const halfW = size.width / 2 / camera.zoom;
    const halfH = size.height / 2 / camera.zoom;
    const dx = node.x + shiftPx / camera.zoom - camera.position.x;
    const dy = node.y - camera.position.y;
    if (Math.abs(dx) < halfW * 0.5 && Math.abs(dy) < halfH * 0.6) {
      pendingRef.current = null;
      return;
    }

    const t = reduceMotion ? 1 : 1 - Math.exp(-delta * 8);
    camera.position.x += dx * t;
    camera.position.y += dy * t;
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.set(camera.position.x, camera.position.y, 0);
      controls.update();
    }
    if (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) pendingRef.current = null;
  });

  return null;
}

/**
 * Orthographic pan + zoom controls tuned for 2D:
 *  - no orbit tumble
 *  - screen-space pan
 *  - mouse: LMB pan / wheel zoom
 *  - touch: one-finger pan / two-finger dolly + pan
 */
function PanZoomControls() {
  return (
    <OrbitControls
      makeDefault
      enableRotate={false}
      screenSpacePanning
      minZoom={0.5}
      maxZoom={40}
      mouseButtons={{
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
    />
  );
}

interface NodeMeshProps {
  node: SimNode;
  meta: GraphNode;
  mode: ColorMode;
  aliveness: Aliveness;
  blocker: boolean;
  selected: boolean;
  focused: boolean;
  reduceMotion: boolean;
  onSelect: (id: string | null) => void;
  onFocus: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

/**
 * Base colour for a node. Records take their primitive's hue; Effort hubs take
 * a neutral structural tone, because a hub is scaffolding rather than another
 * coloured record. Cluster identity rides on the hub's tinted core instead.
 */
function nodeBaseOklch(meta: GraphNode, mode: ColorMode): Oklch {
  if (meta.kind === 'effort') return structuralOklch(mode);
  return primitiveOklch(meta.kind, mode);
}

function NodeMesh({
  node,
  meta,
  mode,
  aliveness,
  blocker,
  selected,
  focused,
  reduceMotion,
  onSelect,
  onFocus,
  onHover,
}: NodeMeshProps) {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Mesh>(null);
  const coreRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  const hitRef = useRef<Mesh>(null);
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const glyph = PRIMITIVES[meta.kind].glyph;
  const geometry = useMemo(() => glyphGeometry(glyph), [glyph]);
  const extent = useMemo(() => glyphExtent(glyph), [glyph]);
  const isHub = meta.kind === 'effort';

  const retired = aliveness === 'retired';
  const color = useMemo(() => {
    const base = nodeBaseOklch(meta, mode);
    return oklchToThreeColor(retired ? retiredOklch(base, mode) : base);
  }, [meta, mode, retired]);

  /** Cluster tint, shown only in a hub's core so it matches the legend chip. */
  const coreColor = useMemo(
    () => (isHub ? oklchToThreeColor(effortOklch(meta.id, mode)) : 0),
    [isHub, meta.id, mode]
  );

  const haloColor = useMemo(
    () =>
      oklchToThreeColor(
        mode === 'light'
          ? { l: 0.2, c: 0.01, h: 260 }
          : { l: 0.96, c: 0.01, h: 260 }
      ),
    [mode]
  );

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.x = node.x;
    g.position.y = node.y;
    const r = Math.max(effectiveRadius(node), 0.001);
    bodyRef.current?.scale.set(r, r, 1);
    coreRef.current?.scale.set(r, r, 1);

    const halo = haloRef.current;
    if (halo) {
      const show = selected || focused;
      halo.visible = show;
      if (show) {
        // Pad outward in world units so the halo clears pointy silhouettes
        // at every zoom level instead of hugging a circumscribed circle.
        halo.scale.setScalar(r + Math.max(1.6, r * 0.22) / extent);
      }
    }

    const hit = hitRef.current;
    if (hit) {
      /*
       * Guarantee a 44 CSS px pointer diameter at every zoom. R3F sizes an
       * orthographic frustum to the canvas in pixels, so one world unit is
       * exactly `camera.zoom` CSS px — world radius is therefore
       * `(MIN_HIT_DIAMETER_PX / 2) / zoom`. Do not reach for `viewport.factor`
       * here: R3F hard-codes it to 1 for orthographic cameras, which would
       * pin the hit radius to a constant 22 world units and make targets
       * grow as you zoom in. Do not world-cap the padding either: at
       * minZoom (~0.5) that floor needs ~44 world units of radius, and any
       * smaller cap shrinks the on-screen target below 44 CSS px.
       */
      const minWorld = MIN_HIT_DIAMETER_PX / 2 / Math.max(camera.zoom, 0.0001);
      hit.scale.setScalar(Math.max(r * extent, minWorld));
    }
  });

  const handlePointerDown = useCallback(
    (event: { clientX: number; clientY: number }) => {
      pointerStart.current = { x: event.clientX, y: event.clientY };
    },
    []
  );

  /**
   * Commit selection on pointer-up, and only when the pointer barely moved.
   * Left-drag pans the camera, so selecting on pointer-down opened the drawer
   * every time a pan happened to start over a record.
   */
  const handlePointerUp = useCallback(
    (event: {
      clientX: number;
      clientY: number;
      stopPropagation: () => void;
    }) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start) return;
      const travelled = Math.hypot(
        event.clientX - start.x,
        event.clientY - start.y
      );
      if (travelled > TAP_SLOP_PX) return;
      event.stopPropagation();
      onSelect(node.id);
      onFocus(node.id);
    },
    [node.id, onSelect, onFocus]
  );

  return (
    <group ref={groupRef}>
      <mesh
        ref={haloRef}
        geometry={geometry}
        position={[0, 0, -0.02]}
        visible={false}
      >
        <meshBasicMaterial
          color={haloColor}
          transparent
          opacity={mode === 'dark' ? 0.5 : 0.35}
        />
      </mesh>
      {blocker && !retired && <BlockerRing animate={!reduceMotion} />}
      <mesh ref={bodyRef} geometry={geometry}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={retired ? 0.72 : 0.95}
        />
      </mesh>
      {/*
        A hub's core: fills the ring's hole so membership spokes converging on
        the centre don't show through as clutter, and carries the cluster tint
        that the Efforts legend keys against.
      */}
      {isHub && (
        <mesh ref={coreRef} position={[0, 0, 0.01]}>
          <circleGeometry args={[RING_INNER_RATIO * 0.82, CIRCLE_SEGMENTS]} />
          <meshBasicMaterial color={coreColor} transparent opacity={0.95} />
        </mesh>
      )}
      {/* Invisible, still raycast: an oversized circular pointer target. */}
      <mesh
        ref={hitRef}
        position={[0, 0, 0.03]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOver={(e) => {
          if (e.pointerType === 'touch') return;
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          onHover(node.id);
        }}
        onPointerOut={(e) => {
          if (e.pointerType === 'touch') return;
          document.body.style.cursor = '';
          onHover(null);
        }}
      >
        <circleGeometry args={[1, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * Warning outline marking an open blocker Issue — the record gating an Effort.
 *
 * The slow rotation is the only motion left once the layout settles, so it is
 * gated on `prefers-reduced-motion`: otherwise the canvas would never come to
 * rest for a reader who asked for exactly that.
 */
function BlockerRing({ animate }: { animate: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = animate ? clock.elapsedTime * 0.25 : 0;
  });
  return (
    <mesh ref={ref} position={[0, 0, -0.01]} scale={9}>
      <ringGeometry args={[0.82, 1, 3, 1, 0, Math.PI * 2]} />
      <meshBasicMaterial color={0xf59e0b} transparent opacity={0.6} />
    </mesh>
  );
}

interface EdgeLineProps {
  edge: SimEdge;
  edgeKind: GraphEdgeKind;
  mode: ColorMode;
  nodesById: Map<string, GraphNode>;
  lifecycles: Map<string, EffectiveLifecycle>;
  activeId: string | null;
  hoveredId: string | null;
}

/** Recover kind from `${source}:${kind}:${target}` ids when the map misses. */
function edgeKindFromId(id: string): GraphEdgeKind | null {
  const parts = id.split(':');
  if (parts.length < 3) return null;
  const kind = parts[1];
  return kind in RELATION_META ? (kind as GraphEdgeKind) : null;
}

function relationEmphasisOpacity(emphasis: RelationMeta['emphasis']): number {
  if (emphasis === 'subtle') return 0.4;
  if (emphasis === 'medium') return 0.62;
  if (emphasis === 'strong') return 0.88;
  return 0.72;
}

function dashWorldUnits(
  dash: RelationMeta['dash'],
  weight: RelationMeta['weight']
): { dashSize: number; gapSize: number } | null {
  if (dash === 'solid') return null;
  const scale = weight === 'medium' ? 1.15 : weight === 'bold' ? 1.3 : 1;
  if (dash === 'dashed') {
    return { dashSize: 1.0 * scale, gapSize: 0.65 * scale };
  }
  return { dashSize: 0.3 * scale, gapSize: 0.5 * scale };
}

/**
 * Membership spokes take their Effort's tint — this is the channel that keeps
 * cluster identity legible now that primitives own hue. Every other group
 * reads from the shared relation palette so the legend matches exactly.
 */
function edgeStrokeOklch(
  kind: GraphEdgeKind,
  sourceMeta: GraphNode | undefined,
  mode: ColorMode
): Oklch {
  const meta = RELATION_META[kind];
  if (meta.group === 'membership') {
    const effortId = sourceMeta?.effortId ?? sourceMeta?.id ?? 'unknown';
    return effortOklch(effortId, mode);
  }
  return relationStrokeOklch(meta.group, mode);
}

/**
 * Renders a single vein/edge as a styled line (+ optional arrowhead). Buffer
 * positions are refreshed in `useFrame` from `veinTipPolyline`, so the tip
 * grows in and retracts out with `edge.growth`. Style matches the legend.
 */
function EdgeLine({
  edge,
  edgeKind,
  mode,
  nodesById,
  lifecycles,
  activeId,
  hoveredId,
}: EdgeLineProps) {
  const meta = RELATION_META[edgeKind];
  const positionsRef = useRef<Float32Array>(new Float32Array(16 * 3));
  const scratchRef = useRef<VeinPoint[]>([]);
  const distanceCountRef = useRef(-1);

  const color = useMemo(() => {
    const sourceMeta = nodesById.get(edge.from);
    return oklchToThreeColor(edgeStrokeOklch(edgeKind, sourceMeta, mode));
  }, [edge.from, edgeKind, nodesById, mode]);

  /** Retired endpoints fade their relations too, so dead branches recede. */
  const retiredEndpoint = useMemo(
    () =>
      lifecycles.get(edge.from)?.aliveness === 'retired' ||
      lifecycles.get(edge.to)?.aliveness === 'retired',
    [lifecycles, edge.from, edge.to]
  );

  const { line, arrow } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positionsRef.current, 3)
    );
    geometry.setDrawRange(0, 0);

    const pattern = dashWorldUnits(meta.dash, meta.weight);
    const material =
      pattern === null
        ? new THREE.LineBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
          })
        : new THREE.LineDashedMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            dashSize: pattern.dashSize,
            gapSize: pattern.gapSize,
          });

    const lineObj = new THREE.Line(geometry, material);
    lineObj.renderOrder = -1;
    lineObj.frustumCulled = false;

    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0);
    arrowShape.lineTo(-0.85, 0.38);
    arrowShape.lineTo(-0.85, -0.38);
    arrowShape.closePath();
    const arrowGeom = new THREE.ShapeGeometry(arrowShape);
    const arrowMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const arrowMesh = new THREE.Mesh(arrowGeom, arrowMat);
    arrowMesh.visible = false;
    arrowMesh.renderOrder = 0;
    arrowMesh.frustumCulled = false;

    return { line: lineObj, arrow: arrowMesh };
  }, [meta.dash, meta.weight]);

  useEffect(() => {
    (line.material as THREE.LineBasicMaterial).color.setHex(color);
    (arrow.material as THREE.MeshBasicMaterial).color.setHex(color);
  }, [line, arrow, color]);

  useEffect(() => {
    return () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
      arrow.geometry.dispose();
      (arrow.material as THREE.Material).dispose();
    };
  }, [line, arrow]);

  useFrame(() => {
    const geom = line.geometry;
    const material = line.material as THREE.LineBasicMaterial;
    const arrowMaterial = arrow.material as THREE.MeshBasicMaterial;

    if (isEdgeGone(edge)) {
      geom.setDrawRange(0, 0);
      arrow.visible = false;
      return;
    }
    const path = edge.path;
    if (!path || path.length < 2) {
      geom.setDrawRange(0, 0);
      arrow.visible = false;
      return;
    }
    const visible = veinTipPolyline(path, edge.growth, scratchRef.current);
    if (visible.length < 2) {
      geom.setDrawRange(0, 0);
      arrow.visible = false;
      return;
    }
    const needed = visible.length * 3;
    let positions = positionsRef.current;
    if (positions.length < needed) {
      positions = new Float32Array(Math.max(needed, positions.length * 2, 16));
      positionsRef.current = positions;
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      distanceCountRef.current = -1;
    }
    for (let i = 0; i < visible.length; i++) {
      positions[i * 3] = visible[i].x;
      positions[i * 3 + 1] = visible[i].y;
      positions[i * 3 + 2] = 0;
    }
    const attr = geom.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined;
    if (attr) attr.needsUpdate = true;
    geom.setDrawRange(0, visible.length);
    // `computeLineDistances` allocates a fresh attribute on every call, so
    // only recompute when the vertex count actually changes. Dash phase drift
    // as endpoints move is imperceptible; a per-frame allocation for every
    // dashed edge is not.
    if (meta.dash !== 'solid' && distanceCountRef.current !== visible.length) {
      line.computeLineDistances();
      distanceCountRef.current = visible.length;
    }

    const highlighted =
      (activeId !== null && (activeId === edge.from || activeId === edge.to)) ||
      (hoveredId !== null &&
        (hoveredId === edge.from || hoveredId === edge.to));

    const baseOpacity = relationEmphasisOpacity(meta.emphasis);
    const modeScale = mode === 'dark' ? 1.05 : 0.95;
    const retiredScale = retiredEndpoint && !highlighted ? 0.5 : 1;
    const target = highlighted
      ? Math.min(baseOpacity * modeScale + 0.35, 0.98)
      : baseOpacity * modeScale * retiredScale;
    const growthOpacity = target * Math.max(0.001, edge.growth);
    material.opacity = growthOpacity;
    arrowMaterial.opacity = growthOpacity;

    if (meta.arrow && visible.length >= 2) {
      const tip = visible[visible.length - 1];
      const prev = visible[visible.length - 2];
      const angle = Math.atan2(tip.y - prev.y, tip.x - prev.x);
      const scale = highlighted ? 1.2 : 1;
      arrow.position.set(tip.x, tip.y, 0.02);
      arrow.rotation.z = angle;
      arrow.scale.set(scale, scale, 1);
      arrow.visible = true;
    } else {
      arrow.visible = false;
    }
  });

  return (
    <group>
      <primitive object={line} />
      {meta.arrow ? <primitive object={arrow} /> : null}
    </group>
  );
}

interface NodeLabelProps {
  node: SimNode;
  meta: GraphNode;
  active: boolean;
  retired: boolean;
}

function NodeLabel({ node, meta, active, retired }: NodeLabelProps) {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const r = effectiveRadius(node);
    g.position.x = node.x;
    g.position.y = node.y + r + 1.5;
    g.visible = r > 0.5;
  });

  return (
    <group ref={groupRef}>
      <LabelSurface
        text={meta.title}
        classes={labelClasses(meta.kind === 'effort', active, retired)}
      />
    </group>
  );
}

/**
 * Effort title, anchored above the whole cluster rather than above the hub.
 *
 * The hub sits at its cluster's centroid, so a label placed on it lands in the
 * middle of the records it is naming. Riding the cluster's top edge instead
 * turns it into a heading for the group and clears the records entirely.
 */
function ClusterLabel({
  sim,
  node,
  meta,
  active,
  retired,
}: {
  sim: GraphSimulation;
  node: SimNode;
  meta: GraphNode;
  active: boolean;
  retired: boolean;
}) {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const r = effectiveRadius(node);
    if (r <= 0.5) {
      g.visible = false;
      return;
    }
    g.visible = true;

    let top = node.y + r;
    let sumX = 0;
    let members = 0;
    for (const other of sim.getState().nodes) {
      if (other.effortId !== node.effortId) continue;
      const otherR = effectiveRadius(other);
      if (otherR <= 0.1) continue;
      if (other.y + otherR > top) top = other.y + otherR;
      sumX += other.x;
      members += 1;
    }
    g.position.x = members > 0 ? sumX / members : node.x;
    g.position.y = top + 2.5;
  });

  return (
    <group ref={groupRef}>
      <LabelSurface
        text={meta.title}
        classes={labelClasses(true, active, retired)}
      />
    </group>
  );
}

function labelClasses(hub: boolean, active: boolean, retired: boolean): string {
  const classes = ['effort-label'];
  if (hub) classes.push('effort-label-hub');
  if (active) classes.push('effort-label-active');
  if (retired) classes.push('effort-label-retired');
  return classes.join(' ');
}

function LabelSurface({ text, classes }: { text: string; classes: string }) {
  return (
    <Html
      transform={false}
      center
      zIndexRange={[40, 0]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div className={classes} style={{ transform: 'translateY(-100%)' }}>
        {text}
      </div>
    </Html>
  );
}

function CursorReset() {
  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
    };
  }, []);
  return null;
}

export { toSimInputs };
