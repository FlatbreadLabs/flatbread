import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeEffortGraph } from './normalize';
import type { EffortGraphQueryResult } from './query';

describe('normalizeEffortGraph', () => {
  const emptyGraph = (): EffortGraphQueryResult => ({
    allEfforts: [],
    allIssues: [],
    allFindings: [],
    allDecisions: [],
    allConstraints: [],
    allRisks: [],
  });

  it('maps _content.raw to node.body (trimmed)', () => {
    const data: EffortGraphQueryResult = {
      ...emptyGraph(),
      allEfforts: [
        {
          id: 'eff-1',
          title: 'Effort one',
          _content: { raw: '  ## Context\n\nBody text.  ' },
        },
      ],
    };

    const graph = normalizeEffortGraph(data);
    assert.equal(graph.nodes.length, 1);
    assert.equal(graph.nodes[0]?.body, '## Context\n\nBody text.');
  });

  it('omits body when _content.raw is empty or whitespace', () => {
    const data: EffortGraphQueryResult = {
      ...emptyGraph(),
      allDecisions: [
        {
          id: 'dec-1',
          title: 'Decision',
          _content: { raw: '   \n  ' },
        },
        {
          id: 'dec-2',
          title: 'No content',
        },
      ],
    };

    const graph = normalizeEffortGraph(data);
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    assert.equal(byId.get('dec-1')?.body, undefined);
    assert.equal(byId.get('dec-2')?.body, undefined);
  });
});
