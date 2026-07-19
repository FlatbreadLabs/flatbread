'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Group, Mesh } from 'three';

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
import { nodeColor, oklchToThreeColor } from '@/lib/oklch';
import type { GraphEdge, GraphNode } from '@/lib/types';
import { useTheme, type ColorMode } from '../hooks/useTheme';

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
      orthographic
      camera={{ position: [0, 0, 100], zoom: 4, near: 0.1, far: 1000 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
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

  return (
    <>
      <PanZoomControls />
      <group>
        {state.edges.map((edge) => (
          <EdgeLine
            key={edge.id}
            edge={edge}
            mode={mode}
            nodesById={nodeMetaById}
            selectedId={selectedId}
          />
        ))}
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
            />
          );
        })}
      </group>
      <group>
        {state.nodes.map((node) => {
          const meta = nodeMetaById.get(node.id);
          if (!meta) return null;
          const isSelected = selectedId === node.id;
          const shouldLabel = meta.kind === 'effort' || isSelected;
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
}

const CIRCLE_SEGMENTS = 40;

function NodeMesh({ node, meta, mode, selected, onSelect }: NodeMeshProps) {
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
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
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
  mode: ColorMode;
  nodesById: Map<string, GraphNode>;
  selectedId: string | null;
}

/**
 * Renders a single vein/edge as a `<line>` primitive. Buffer positions are
 * refreshed in `useFrame` from `veinTipPolyline`, so the tip grows in and
 * retracts out with `edge.growth`.
 */
function EdgeLine({ edge, mode, nodesById, selectedId }: EdgeLineProps) {
  const positionsRef = useRef<Float32Array>(new Float32Array(16 * 3));
  const scratchRef = useRef<VeinPoint[]>([]);

  const color = useMemo(() => {
    const sourceMeta = nodesById.get(edge.from);
    const effortId =
      sourceMeta?.effortId ?? sourceMeta?.id ?? edge.from ?? 'unknown';
    const kind = sourceMeta?.kind ?? 'effort';
    return oklchToThreeColor(nodeColor(effortId, kind, mode).oklch);
  }, [edge.from, nodesById, mode]);

  // Build the line object once. Using `<primitive>` sidesteps the JSX conflict
  // between three's `Line` and SVG's `line` element.
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positionsRef.current, 3)
    );
    geometry.setDrawRange(0, 0);
    const material = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const obj = new THREE.Line(geometry, material);
    obj.renderOrder = -1;
    obj.frustumCulled = false;
    return obj;
  }, []);

  useEffect(() => {
    (line.material as THREE.LineBasicMaterial).color.setHex(color);
  }, [line, color]);

  useEffect(() => {
    return () => {
      line.geometry.dispose();
      (line.material as THREE.LineBasicMaterial).dispose();
    };
  }, [line]);

  useFrame(() => {
    const geom = line.geometry;
    const material = line.material as THREE.LineBasicMaterial;
    if (isEdgeGone(edge)) {
      geom.setDrawRange(0, 0);
      return;
    }
    const path = edge.path;
    if (!path || path.length < 2) {
      geom.setDrawRange(0, 0);
      return;
    }
    const visible = veinTipPolyline(path, edge.growth, scratchRef.current);
    if (visible.length < 2) {
      geom.setDrawRange(0, 0);
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

    const isTouched =
      selectedId !== null &&
      (selectedId === edge.from || selectedId === edge.to);
    const base = mode === 'dark' ? 0.42 : 0.36;
    const target = isTouched ? Math.min(base + 0.4, 0.95) : base;
    material.opacity = target * Math.max(0.001, edge.growth);
  });

  return <primitive object={line} />;
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
