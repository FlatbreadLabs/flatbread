import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  applyClusterCohesion,
  applyClusterSeparation,
  computeClusters,
  ensureScratch,
} from './forces';
import type { SimNode } from './types';

function node(
  id: string,
  effortId: string,
  x: number,
  y: number,
  radius = 6
): SimNode {
  return {
    id,
    effortId,
    kind: 'record',
    radius,
    x,
    y,
    vx: 0,
    vy: 0,
    birth: 0,
    growth: 1,
    state: 'settled',
    mass: 1,
  };
}

describe('ensureScratch', () => {
  test('keeps the cluster index map identity across growth', () => {
    // `computeClusters` clears and refills this map every step; replacing the
    // instance on every resize would churn a map per frame while nodes stream in.
    const first = ensureScratch(null, 4);
    const map = first.clusters.indexOf;
    const grown = ensureScratch(first, 64);
    assert.equal(grown.clusters.indexOf, map);
    assert.ok(grown.clusters.cx.length >= 64);
    assert.ok(grown.clusters.memberStart.length >= 65);
  });

  test('zeroes force accumulators on reuse', () => {
    const scratch = ensureScratch(null, 8);
    scratch.fx[3] = 99;
    scratch.fy[3] = -99;
    const reused = ensureScratch(scratch, 8);
    assert.equal(reused.fx[3], 0);
    assert.equal(reused.fy[3], 0);
  });
});

describe('computeClusters', () => {
  test('buckets nodes by effortId with centroids and reach', () => {
    const nodes = [
      node('a1', 'A', 0, 0),
      node('a2', 'A', 10, 0),
      node('b1', 'B', 100, 100),
    ];
    const scratch = ensureScratch(null, nodes.length);
    computeClusters(nodes, scratch);
    const { clusters } = scratch;

    assert.equal(clusters.count, 2);
    const a = clusters.indexOf.get('A')!;
    const b = clusters.indexOf.get('B')!;
    assert.equal(clusters.members[a], 2);
    assert.equal(clusters.members[b], 1);
    assert.equal(clusters.cx[a], 5);
    assert.equal(clusters.cy[a], 0);
    // 5 units from centroid to either member, plus the member radius.
    assert.equal(clusters.reach[a], 11);
    assert.equal(clusters.reach[b], 6);
  });

  test('member buckets cover every node exactly once', () => {
    const nodes = [
      node('a1', 'A', 0, 0),
      node('b1', 'B', 1, 1),
      node('a2', 'A', 2, 2),
      node('c1', 'C', 3, 3),
      node('a3', 'A', 4, 4),
    ];
    const scratch = ensureScratch(null, nodes.length);
    computeClusters(nodes, scratch);
    const { clusters } = scratch;

    const seen: number[] = [];
    for (let s = 0; s < clusters.count; s++) {
      for (let k = clusters.memberStart[s]; k < clusters.memberStart[s + 1]; k++) {
        const i = clusters.memberIndices[k];
        assert.equal(clusters.nodeCluster[i], s);
        seen.push(i);
      }
    }
    assert.deepEqual([...seen].sort((x, y) => x - y), [0, 1, 2, 3, 4]);
  });

  test('member counts survive the bucketing pass', () => {
    // Bucketing borrows `members` as a write cursor; it must be restored or
    // separation would divide its impulse by a byte offset.
    const nodes = [node('a1', 'A', 0, 0), node('a2', 'A', 1, 1), node('b1', 'B', 9, 9)];
    const scratch = ensureScratch(null, nodes.length);
    computeClusters(nodes, scratch);
    assert.equal(scratch.clusters.members[scratch.clusters.indexOf.get('A')!], 2);
    assert.equal(scratch.clusters.members[scratch.clusters.indexOf.get('B')!], 1);
  });
});

describe('applyClusterSeparation', () => {
  test('pushes overlapping clusters apart along their centroid axis', () => {
    const nodes = [node('a1', 'A', 0, 0), node('b1', 'B', 5, 0)];
    const scratch = ensureScratch(null, nodes.length);
    computeClusters(nodes, scratch);
    applyClusterSeparation(scratch, 1, 10);

    // A sits left of B, so A is pushed further left and B further right.
    assert.ok(scratch.fx[0] < 0, `expected A pushed -x, got ${scratch.fx[0]}`);
    assert.ok(scratch.fx[1] > 0, `expected B pushed +x, got ${scratch.fx[1]}`);
    assert.equal(scratch.fy[0], 0);
  });

  test('leaves well-separated clusters alone', () => {
    const nodes = [node('a1', 'A', 0, 0), node('b1', 'B', 500, 0)];
    const scratch = ensureScratch(null, nodes.length);
    computeClusters(nodes, scratch);
    applyClusterSeparation(scratch, 1, 10);
    assert.equal(scratch.fx[0], 0);
    assert.equal(scratch.fx[1], 0);
  });

  test('stays finite when two centroids coincide', () => {
    const nodes = [node('a1', 'A', 0, 0), node('b1', 'B', 0, 0)];
    const scratch = ensureScratch(null, nodes.length);
    computeClusters(nodes, scratch);
    applyClusterSeparation(scratch, 2, 40);

    for (let i = 0; i < nodes.length; i++) {
      assert.ok(Number.isFinite(scratch.fx[i]), `fx[${i}] = ${scratch.fx[i]}`);
      assert.ok(Number.isFinite(scratch.fy[i]), `fy[${i}] = ${scratch.fy[i]}`);
      // A distance floor keeps the impulse bounded rather than relying on the
      // integrator's step clamp to absorb a near-divide-by-zero.
      assert.ok(Math.abs(scratch.fx[i]) < 1_000, `fx[${i}] = ${scratch.fx[i]}`);
    }
  });

  test('separates big and small clusters by the same distance', () => {
    const nodes = [
      node('a1', 'A', -1, 0),
      node('a2', 'A', 0, 0),
      node('a3', 'A', 1, 0),
      node('b1', 'B', 20, 0),
    ];
    const scratch = ensureScratch(null, nodes.length);
    computeClusters(nodes, scratch);
    applyClusterSeparation(scratch, 1, 30);

    // Per-node force is divided by member count, so the three-record cluster
    // moves as one body rather than being flung by the single-record one.
    const totalA = scratch.fx[0] + scratch.fx[1] + scratch.fx[2];
    assert.ok(Math.abs(totalA + scratch.fx[3]) < 1e-9);
  });
});

describe('applyClusterCohesion', () => {
  test('pulls members toward their own centroid only', () => {
    const nodes = [node('a1', 'A', -10, 0), node('a2', 'A', 10, 0), node('b1', 'B', 99, 0)];
    const scratch = ensureScratch(null, nodes.length);
    computeClusters(nodes, scratch);
    applyClusterCohesion(nodes, scratch, 1);

    assert.equal(scratch.fx[0], 10);
    assert.equal(scratch.fx[1], -10);
    // Single-member clusters have nothing to cohere to.
    assert.equal(scratch.fx[2], 0);
  });
});
