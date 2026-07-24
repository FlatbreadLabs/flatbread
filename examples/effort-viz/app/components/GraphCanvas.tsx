'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Group, Mesh, OrthographicCamera } from 'three';

/** Minimal controls surface used by FitCamera (drei OrbitControls instance). */
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
} from '@/lib/physics';
import { nodeColor, oklchToThreeColor, type Oklch } from '@/lib/oklch';
import type { GraphEdge, GraphEdgeKind, GraphNode } from '@/lib/types';
import { useTheme, type ColorMode } from '../hooks/useTheme';
import { RELATION_META, type RelationMeta } from './RelationLegend';

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

function idsChanged(current: Array<{ id: string }>, previous: string[]): boolean {
  if (current.length !== previous.length) return true;
  for (let i = 0; i < current.length; i++) {
    if (current[i].id !== previous[i]) return true;
  }
  return false;
}

export default function GraphCanvas(props: GraphCanvasProps) {
  const { mode } = useTheme();
  return (
    <Canvas
      className="h-full w-full touch-none"
      orthographic
      camera={{ position: [0, 0, 100], zoom: 4, near: 0.1, far: 1000 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
      onPointerMissed={() => props.onSelect(null)}
    >
      <ambientLight intensity={1} />
      <GraphScene {...props} mode={mode} />
    </Canvas>
  );
}

interface GraphSceneProps extends GraphCanvasProps {
  mode: ColorMode;
}

function GraphScene({ nodes, edges, selectedId, onSelect, mode }: GraphSceneProps) {
  const simRef = useRef<GraphSimulation | null>(null);
  if (simRef.current === null) {
    simRef.current = createGraphSimulation();
  }
  const sim = simRef.current;

  const nodeIdsRef = useRef<string[]>([]);
  const edgeIdsRef = useRef<string[]>([]);
  const [, setRenderTick] = useState(0);

  useEffect(() => {
    const { simNodes, simEdges } = toSimInputs(nodes, edges);
    sim.sync(simNodes, simEdges);
    const state = sim.getState();
    nodeIdsRef.current = state.nodes.map((n) => n.id);
    edgeIdsRef.current = state.edges.map((e) => e.id);
    setRenderTick((t) => t + 1);
  }, [nodes, edges, sim]);

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

  const nodeMetaById = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  const edgesById = useMemo(() => {
    const map = new Map<string, GraphEdge>();
    for (const e of edges) map.set(e.id, e);
    return map;
  }, [edges]);

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      <PanZoomControls />
      <FitCamera sim={sim} nodeCount={nodes.length} />
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
              selectedId={selectedId}
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
              selected={selectedId === node.id}
              onSelect={onSelect}
              onHover={setHoveredId}
            />
          );
        })}
      </group>
      <group>
        {state.nodes.map((node) => {
          const meta = nodeMetaById.get(node.id);
          if (!meta) return null;
          const isSelected = selectedId === node.id;
          const isHovered = hoveredId === node.id;
          const shouldLabel =
            meta.kind === 'effort' || isSelected || isHovered;
          if (!shouldLabel) return null;
          return (
            <NodeLabel
              key={`label-${node.id}`}
              node={node}
              meta={meta}
              selected={isSelected}
            />
          );
        })}
      </group>
      <CursorReset />
    </>
  );
}

/** Screen-space padding so fitted nodes stay clear of floating chrome. */
function fitChromeInsets(viewportWidth: number): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const isWide = viewportWidth >= 640;
  return {
    top: 32,
    bottom: isWide ? 104 : 128,
    left: isWide ? 220 : 16,
    right: isWide ? 348 : 16,
  };
}

/**
 * Frame the orthographic camera on the live simulation bounds once the
 * layout has mostly settled (or after a short timeout). Re-fits when the
 * node count changes substantially (live add/remove bursts) or the canvas
 * viewport resizes.
 */
function FitCamera({
  sim,
  nodeCount,
}: {
  sim: GraphSimulation;
  nodeCount: number;
}) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const controls = useThree((s) => s.controls) as PanZoomControlsHandle | null;
  const size = useThree((s) => s.size);
  const fittedForCount = useRef<number | null>(null);
  const fittedForSize = useRef<string | null>(null);
  const elapsedRef = useRef(0);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
  }, []);

  const sizeKey = `${size.width}x${size.height}`;

  useEffect(() => {
    fittedForCount.current = null;
    fittedForSize.current = null;
    elapsedRef.current = 0;
  }, [nodeCount, sizeKey]);

  useFrame((_, delta) => {
    if (
      fittedForCount.current === nodeCount &&
      fittedForSize.current === sizeKey
    ) {
      return;
    }
    elapsedRef.current += delta;

    const { nodes } = sim.getState();
    const alive = nodes.filter(
      (n) => n.growth > 0.35 && n.state !== 'retracting'
    );
    if (alive.length === 0) return;

    let kinetic = 0;
    for (const n of alive) kinetic += n.vx * n.vx + n.vy * n.vy;
    const settled =
      reduceMotionRef.current ||
      kinetic < 2.5 ||
      elapsedRef.current > 2.4;
    if (!settled) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const n of alive) {
      const r = Math.max(effectiveRadius(n), 1);
      if (n.x - r < minX) minX = n.x - r;
      if (n.x + r > maxX) maxX = n.x + r;
      if (n.y - r < minY) minY = n.y - r;
      if (n.y + r > maxY) maxY = n.y + r;
    }

    const width = Math.max(maxX - minX, 20);
    const height = Math.max(maxY - minY, 20);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const pad = 1.35;

    const insets = fitChromeInsets(size.width);
    const availW = Math.max(
      size.width - insets.left - insets.right,
      64
    );
    const availH = Math.max(
      size.height - insets.top - insets.bottom,
      64
    );
    const zoom = Math.min(
      availW / (width * pad),
      availH / (height * pad),
      12
    );
    const clampedZoom = Math.max(zoom, 0.75);

    const offsetX = (insets.left - insets.right) / 2 / clampedZoom;
    const offsetY = (insets.bottom - insets.top) / 2 / clampedZoom;
    const fitCx = cx - offsetX;
    const fitCy = cy - offsetY;

    camera.position.set(fitCx, fitCy, 100);
    camera.zoom = clampedZoom;
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.set(fitCx, fitCy, 0);
      controls.update();
    }
    fittedForCount.current = nodeCount;
    fittedForSize.current = sizeKey;
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
  selected: boolean;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

const CIRCLE_SEGMENTS = 40;

function NodeMesh({
  node,
  meta,
  mode,
  selected,
  onSelect,
  onHover,
}: NodeMeshProps) {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);

  const color = useMemo(() => {
    const effortId = meta.effortId ?? meta.id;
    return oklchToThreeColor(nodeColor(effortId, meta.kind, mode).oklch);
  }, [meta.effortId, meta.id, meta.kind, mode]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.x = node.x;
    g.position.y = node.y;
    const r = effectiveRadius(node);
    const s = Math.max(r, 0.001);
    if (bodyRef.current) {
      bodyRef.current.scale.set(s, s, 1);
    }
    if (ringRef.current) {
      const ringScale = s + Math.max(1.4, s * 0.18);
      ringRef.current.scale.set(ringScale, ringScale, 1);
      ringRef.current.visible = selected;
    }
  });

  const handlePointerDown = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onSelect(node.id);
    },
    [node.id, onSelect]
  );

  return (
    <group ref={groupRef}>
      <mesh ref={ringRef} position={[0, 0, -0.01]} visible={selected}>
        <ringGeometry args={[0.86, 1, CIRCLE_SEGMENTS]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={mode === 'dark' ? 0.85 : 0.9}
        />
      </mesh>
      <mesh
        ref={bodyRef}
        onPointerDown={handlePointerDown}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          onHover(node.id);
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
          onHover(null);
        }}
      >
        <circleGeometry args={[1, CIRCLE_SEGMENTS]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

interface EdgeLineProps {
  edge: SimEdge;
  edgeKind: GraphEdgeKind;
  mode: ColorMode;
  nodesById: Map<string, GraphNode>;
  selectedId: string | null;
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
  if (emphasis === 'subtle') return 0.45;
  if (emphasis === 'medium') return 0.65;
  if (emphasis === 'strong') return 0.9;
  return 0.75;
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
  return { dashSize: 0.35 * scale, gapSize: 0.55 * scale };
}

function edgeStrokeOklch(
  kind: GraphEdgeKind,
  sourceMeta: GraphNode | undefined,
  mode: ColorMode
): Oklch {
  const meta = RELATION_META[kind];
  if (meta.group === 'membership') {
    const effortId = sourceMeta?.effortId ?? sourceMeta?.id ?? 'unknown';
    const nodeKind = sourceMeta?.kind ?? 'effort';
    return nodeColor(effortId, nodeKind, mode).oklch;
  }
  if (meta.group === 'resolution') {
    return mode === 'light'
      ? { l: 0.52, c: 0.13, h: 160 }
      : { l: 0.7, c: 0.11, h: 160 };
  }
  if (meta.group === 'rejection') {
    return mode === 'light'
      ? { l: 0.55, c: 0.02, h: 260 }
      : { l: 0.62, c: 0.02, h: 260 };
  }
  return mode === 'light'
    ? { l: 0.42, c: 0.02, h: 260 }
    : { l: 0.78, c: 0.02, h: 260 };
}

/**
 * Renders a single vein/edge as a styled line (+ optional arrowhead). Buffer
 * positions are refreshed in `useFrame` from `veinTipPolyline`, so the tip
 * grows in and retracts out with `edge.growth`. Style matches RelationLegend.
 */
function EdgeLine({
  edge,
  edgeKind,
  mode,
  nodesById,
  selectedId,
  hoveredId,
}: EdgeLineProps) {
  const meta = RELATION_META[edgeKind];
  const positionsRef = useRef<Float32Array>(new Float32Array(16 * 3));
  const scratchRef = useRef<VeinPoint[]>([]);

  const color = useMemo(() => {
    const sourceMeta = nodesById.get(edge.from);
    return oklchToThreeColor(edgeStrokeOklch(edgeKind, sourceMeta, mode));
  }, [edge.from, edgeKind, nodesById, mode]);

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
    if (meta.dash !== 'solid') {
      line.computeLineDistances();
    }

    const isTouched =
      selectedId !== null &&
      (selectedId === edge.from || selectedId === edge.to);
    const isHovered =
      hoveredId !== null &&
      (hoveredId === edge.from || hoveredId === edge.to);
    const highlighted = isTouched || isHovered;

    const baseOpacity = relationEmphasisOpacity(meta.emphasis);
    const modeScale = mode === 'dark' ? 1.05 : 0.95;
    const target = highlighted
      ? Math.min(baseOpacity * modeScale + 0.35, 0.98)
      : baseOpacity * modeScale;
    const growthOpacity = target * Math.max(0.001, edge.growth);
    material.opacity = growthOpacity;
    arrowMaterial.opacity = growthOpacity;

    if (meta.arrow && visible.length >= 2) {
      const tip = visible[visible.length - 1];
      const prev = visible[visible.length - 2];
      const dx = tip.x - prev.x;
      const dy = tip.y - prev.y;
      const angle = Math.atan2(dy, dx);
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
  selected: boolean;
}

function NodeLabel({ node, meta, selected }: NodeLabelProps) {
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
      <Html
        transform={false}
        center
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          className={
            selected
              ? 'effort-label effort-label-selected'
              : meta.kind === 'effort'
                ? 'effort-label effort-label-primary'
                : 'effort-label'
          }
          style={{ transform: 'translateY(-100%)' }}
        >
          {meta.title}
        </div>
      </Html>
    </group>
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
