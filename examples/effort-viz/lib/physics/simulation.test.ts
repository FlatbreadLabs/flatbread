/**
 * Unit tests for the graph simulation engine.
 *
 * Uses the built-in `node:test` runner so it doesn't require a bundler.
 * Run from `examples/effort-viz`:
 *
 *   pnpm test
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createGraphSimulation } from './simulation';
import { buildVeinPath, veinTipPolyline } from './growth';
import { hashString, mulberry32 } from './hash';
import type { GraphInputEdge, GraphInputNode } from './types';

function makeGraph(): {
  nodes: GraphInputNode[];
  edges: GraphInputEdge[];
} {
  return {
    nodes: [
      { id: 'effort-a', effortId: 'effort-a', kind: 'effort' },
      { id: 'rec-1', effortId: 'effort-a', kind: 'record' },
      { id: 'rec-2', effortId: 'effort-a', kind: 'record' },
    ],
    edges: [
      { id: 'e1', from: 'effort-a', to: 'rec-1' },
      { id: 'e2', from: 'effort-a', to: 'rec-2' },
    ],
  };
}

function stepFor(sim: ReturnType<typeof createGraphSimulation>, seconds: number, dt = 1 / 60) {
  const steps = Math.ceil(seconds / dt);
  for (let i = 0; i < steps; i++) sim.step(dt);
}

describe('hash / rng', () => {
  it('hashString is deterministic and 32-bit', () => {
    const h = hashString('effort-a');
    assert.equal(h, hashString('effort-a'));
    assert.ok(h >= 0 && h < 2 ** 32);
    assert.notEqual(h, hashString('effort-b'));
  });

  it('mulberry32 returns values in [0, 1)', () => {
    const rand = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = rand();
      assert.ok(v >= 0 && v < 1, `value ${v} out of range`);
    }
  });
});

describe('vein path helpers', () => {
  it('buildVeinPath contains endpoints and correct segment count', () => {
    const path = buildVeinPath(0, 0, 10, 0, [0.5, -0.5], 0.2);
    assert.equal(path.length, 4);
    assert.deepEqual(path[0], { x: 0, y: 0 });
    assert.deepEqual(path[path.length - 1], { x: 10, y: 0 });
  });

  it('veinTipPolyline is empty at growth=0 and full at growth=1', () => {
    const path = buildVeinPath(0, 0, 10, 0, [0], 0.1);
    assert.equal(veinTipPolyline(path, 0).length, 0);
    const full = veinTipPolyline(path, 1);
    assert.equal(full.length, path.length);
  });

  it('veinTipPolyline reveals interpolated tip mid-growth', () => {
    const path = buildVeinPath(0, 0, 10, 0, [], 0);
    const mid = veinTipPolyline(path, 0.5);
    assert.equal(mid.length, 2);
    assert.equal(mid[0].x, 0);
    assert.ok(mid[1].x > 0 && mid[1].x < 10);
  });
});

describe('createGraphSimulation', () => {
  it('sync adds nodes and edges', () => {
    const sim = createGraphSimulation();
    const { nodes, edges } = makeGraph();
    sim.sync(nodes, edges);
    const state = sim.getState();
    assert.equal(state.nodes.length, 3);
    assert.equal(state.edges.length, 2);
    for (const n of state.nodes) {
      assert.equal(n.state, 'growing');
      assert.equal(n.growth, 0);
    }
  });

  it('spawn positions are deterministic given the same ids + seed', () => {
    const a = createGraphSimulation({ seed: 7 });
    const b = createGraphSimulation({ seed: 7 });
    const { nodes, edges } = makeGraph();
    a.sync(nodes, edges);
    b.sync(nodes, edges);
    const na = a.getState().nodes;
    const nb = b.getState().nodes;
    for (let i = 0; i < na.length; i++) {
      assert.equal(na[i].x, nb[i].x);
      assert.equal(na[i].y, nb[i].y);
    }
  });

  it('step advances growth to fully settled', () => {
    const sim = createGraphSimulation({ growthRate: 5 });
    const { nodes, edges } = makeGraph();
    sim.sync(nodes, edges);
    stepFor(sim, 1);
    const state = sim.getState();
    for (const n of state.nodes) {
      assert.equal(n.growth, 1);
      assert.equal(n.state, 'settled');
    }
    for (const e of state.edges) {
      assert.equal(e.growth, 1);
      assert.equal(e.state, 'settled');
    }
  });

  it('records spawn near their effort hub', () => {
    const sim = createGraphSimulation({ spawnJitter: 0.5 });
    const { nodes, edges } = makeGraph();
    sim.sync(nodes, edges);
    const state = sim.getState();
    const hub = state.nodes.find((n) => n.id === 'effort-a')!;
    for (const rec of state.nodes.filter((n) => n.kind === 'record')) {
      const d = Math.hypot(rec.x - hub.x, rec.y - hub.y);
      // Distance is bounded by parent radius * (0.6 + jitter).
      assert.ok(d <= hub.radius * (0.6 + 0.5) + 1e-6, `record ${rec.id} spawned too far (${d})`);
    }
  });

  it('removing a node marks it retracting, then drops it', () => {
    const sim = createGraphSimulation({ growthRate: 5, retractRate: 5 });
    const { nodes, edges } = makeGraph();
    sim.sync(nodes, edges);
    stepFor(sim, 1);

    const trimmed = nodes.filter((n) => n.id !== 'rec-2');
    const trimmedEdges = edges.filter((e) => e.to !== 'rec-2');
    sim.sync(trimmed, trimmedEdges);
    const rec2 = sim.getState().nodes.find((n) => n.id === 'rec-2');
    assert.ok(rec2, 'rec-2 still exists after sync');
    assert.equal(rec2!.state, 'retracting');
    stepFor(sim, 2);
    assert.equal(
      sim.getState().nodes.find((n) => n.id === 'rec-2'),
      undefined,
      'rec-2 should be dropped after retraction completes'
    );
    assert.equal(
      sim.getState().edges.find((e) => e.to === 'rec-2'),
      undefined,
      'edge to rec-2 should be dropped'
    );
  });

  it('re-adding a retracting node revives it', () => {
    const sim = createGraphSimulation({ growthRate: 5, retractRate: 0.1 });
    const { nodes, edges } = makeGraph();
    sim.sync(nodes, edges);
    stepFor(sim, 1);
    sim.sync(
      nodes.filter((n) => n.id !== 'rec-1'),
      edges.filter((e) => e.to !== 'rec-1')
    );
    // Small step so it retracts a bit but doesn't die.
    sim.step(0.1);
    assert.equal(sim.getState().nodes.find((n) => n.id === 'rec-1')!.state, 'retracting');
    sim.sync(nodes, edges);
    const revived = sim.getState().nodes.find((n) => n.id === 'rec-1')!;
    assert.notEqual(revived.state, 'retracting');
  });

  it('displaces overlapping neighbors when a new node is packed in', () => {
    const sim = createGraphSimulation({ growthRate: 10 });
    const { nodes, edges } = makeGraph();
    sim.sync(nodes, edges);
    stepFor(sim, 2);
    const rec1Before = { ...sim.getState().nodes.find((n) => n.id === 'rec-1')! };

    const expanded: GraphInputNode[] = [
      ...nodes,
      { id: 'rec-3', effortId: 'effort-a', kind: 'record' },
      { id: 'rec-4', effortId: 'effort-a', kind: 'record' },
      { id: 'rec-5', effortId: 'effort-a', kind: 'record' },
    ];
    const expandedEdges: GraphInputEdge[] = [
      ...edges,
      { id: 'e3', from: 'effort-a', to: 'rec-3' },
      { id: 'e4', from: 'effort-a', to: 'rec-4' },
      { id: 'e5', from: 'effort-a', to: 'rec-5' },
    ];
    sim.sync(expanded, expandedEdges);
    stepFor(sim, 2);
    const rec1After = sim.getState().nodes.find((n) => n.id === 'rec-1')!;
    const drift = Math.hypot(rec1After.x - rec1Before.x, rec1After.y - rec1Before.y);
    assert.ok(drift > 0, 'existing record should be nudged by the new arrivals');
  });

  it('is stable under many random steps (no NaN, bounded positions)', () => {
    const sim = createGraphSimulation();
    const inputNodes: GraphInputNode[] = [];
    const inputEdges: GraphInputEdge[] = [];
    for (let e = 0; e < 4; e++) {
      const effortId = `effort-${e}`;
      inputNodes.push({ id: effortId, effortId, kind: 'effort' });
      for (let r = 0; r < 10; r++) {
        const id = `${effortId}-r${r}`;
        inputNodes.push({ id, effortId, kind: 'record' });
        inputEdges.push({ id: `${effortId}-e${r}`, from: effortId, to: id });
      }
    }
    sim.sync(inputNodes, inputEdges);
    for (let i = 0; i < 600; i++) sim.step(1 / 60);
    for (const n of sim.getState().nodes) {
      assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y), `NaN position on ${n.id}`);
      assert.ok(Math.hypot(n.x, n.y) < 1e4, `runaway position on ${n.id}`);
    }
  });

  it('vein paths track moving endpoints each step', () => {
    const sim = createGraphSimulation({ growthRate: 10 });
    const { nodes, edges } = makeGraph();
    sim.sync(nodes, edges);
    stepFor(sim, 1);
    const edge = sim.getState().edges[0];
    const from = sim.getState().nodes.find((n) => n.id === edge.from)!;
    const to = sim.getState().nodes.find((n) => n.id === edge.to)!;
    assert.equal(edge.path[0].x, from.x);
    assert.equal(edge.path[0].y, from.y);
    assert.equal(edge.path[edge.path.length - 1].x, to.x);
    assert.equal(edge.path[edge.path.length - 1].y, to.y);
  });
});
