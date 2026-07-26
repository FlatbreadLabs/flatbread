import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  buildAlivenessMap,
  buildLifecycleIndex,
  effectiveLifecycle,
  isOpenBlocker,
  summarizeGraph,
} from './lifecycle';
import type { GraphEdge, GraphNode } from './types';

function node(partial: Partial<GraphNode> & Pick<GraphNode, 'id' | 'kind'>): GraphNode {
  return {
    title: partial.id,
    effortId: 'eff-1',
    ...partial,
  } as GraphNode;
}

function edge(kind: GraphEdge['kind'], source: string, target: string): GraphEdge {
  return { id: `${source}:${kind}:${target}`, kind, source, target };
}

describe('effectiveLifecycle', () => {
  test('reports a superseded Decision as retired even though it says accepted', () => {
    // This is the whole reason the module exists: the writer expresses
    // supersession as an edge, so replaced Decisions keep `state: accepted`.
    const decision = node({ id: 'dec-old', kind: 'decision', lifecycle: 'accepted' });
    const index = buildLifecycleIndex([edge('superseded_by', 'dec-old', 'dec-new')]);

    const life = effectiveLifecycle(decision, index);

    assert.equal(life.state, 'superseded');
    assert.equal(life.aliveness, 'retired');
    assert.equal(life.overturnedByEdge, true);
  });

  test('derives supersession from the newer record’s forward edge too', () => {
    const decision = node({ id: 'dec-old', kind: 'decision', lifecycle: 'accepted' });
    const index = buildLifecycleIndex([edge('supersedes', 'dec-new', 'dec-old')]);

    assert.equal(effectiveLifecycle(decision, index).aliveness, 'retired');
  });

  test('invalidation outranks supersession', () => {
    const finding = node({ id: 'fnd-1', kind: 'finding' });
    const index = buildLifecycleIndex([
      edge('superseded_by', 'fnd-1', 'fnd-2'),
      edge('invalidates', 'fnd-3', 'fnd-1'),
    ]);

    assert.equal(effectiveLifecycle(finding, index).state, 'invalidated');
  });

  test('classifies frontmatter states without edges', () => {
    const index = buildLifecycleIndex([]);
    const cases: Array<[GraphNode, string]> = [
      [node({ id: 'a', kind: 'issue', lifecycle: 'open' }), 'open'],
      [node({ id: 'b', kind: 'issue', lifecycle: 'wontfix' }), 'retired'],
      [node({ id: 'c', kind: 'issue', lifecycle: 'resolved' }), 'settled'],
      [node({ id: 'd', kind: 'decision', lifecycle: 'proposed' }), 'open'],
      [node({ id: 'e', kind: 'decision', lifecycle: 'rejected' }), 'retired'],
      [node({ id: 'f', kind: 'risk', lifecycle: 'mitigated' }), 'settled'],
      [node({ id: 'g', kind: 'constraint' }), 'settled'],
    ];
    for (const [record, expected] of cases) {
      assert.equal(effectiveLifecycle(record, index).aliveness, expected, record.id);
    }
  });

  test('is case-insensitive about frontmatter state', () => {
    const index = buildLifecycleIndex([]);
    const record = node({ id: 'a', kind: 'issue', lifecycle: 'WontFix' });
    assert.equal(effectiveLifecycle(record, index).aliveness, 'retired');
  });
});

describe('isOpenBlocker', () => {
  test('only flags open Issues whose kind is blocker', () => {
    const index = buildLifecycleIndex([]);
    const blocker = node({
      id: 'iss-1',
      kind: 'issue',
      kindLabel: 'blocker',
      lifecycle: 'open',
    });
    const gap = node({ id: 'iss-2', kind: 'issue', kindLabel: 'gap', lifecycle: 'open' });
    const closed = node({
      id: 'iss-3',
      kind: 'issue',
      kindLabel: 'blocker',
      lifecycle: 'resolved',
    });

    assert.equal(isOpenBlocker(blocker, effectiveLifecycle(blocker, index)), true);
    assert.equal(isOpenBlocker(gap, effectiveLifecycle(gap, index)), false);
    assert.equal(isOpenBlocker(closed, effectiveLifecycle(closed, index)), false);
  });
});

describe('summarizeGraph', () => {
  test('counts primitives and lifecycle rather than nodes and edges', () => {
    const nodes = [
      node({ id: 'eff-1', kind: 'effort', effortId: null, lifecycle: 'active' }),
      node({ id: 'iss-1', kind: 'issue', lifecycle: 'open' }),
      node({ id: 'iss-2', kind: 'issue', lifecycle: 'wontfix' }),
      node({ id: 'dec-1', kind: 'decision', lifecycle: 'proposed' }),
      node({ id: 'dec-2', kind: 'decision', lifecycle: 'accepted' }),
      node({ id: 'rsk-1', kind: 'risk', lifecycle: 'open' }),
    ];
    const edges = [edge('superseded_by', 'dec-2', 'dec-3')];

    const summary = summarizeGraph(nodes, buildAlivenessMap(nodes, edges));

    assert.equal(summary.efforts, 1);
    assert.equal(summary.records, 5);
    assert.equal(summary.openIssues, 1);
    assert.equal(summary.proposedDecisions, 1);
    assert.equal(summary.liveRisks, 1);
    // wontfix Issue plus the superseded Decision.
    assert.equal(summary.retired, 2);
  });

  test('counts a realized Risk as live', () => {
    // `realized` is settled on the aliveness axis — nothing will overturn it —
    // but it is precisely the record a reader needs surfaced, so it must not
    // vanish from every headline total.
    const nodes = [
      node({ id: 'rsk-1', kind: 'risk', lifecycle: 'realized' }),
      node({ id: 'rsk-2', kind: 'risk', lifecycle: 'mitigated' }),
    ];

    const summary = summarizeGraph(nodes, buildAlivenessMap(nodes, []));

    assert.equal(summary.liveRisks, 1);
    assert.equal(summary.retired, 0);
  });

  test('does not count Efforts as records', () => {
    const nodes = [node({ id: 'eff-1', kind: 'effort', effortId: null })];
    const summary = summarizeGraph(nodes, buildAlivenessMap(nodes, []));
    assert.equal(summary.records, 0);
    assert.equal(summary.efforts, 1);
  });
});
