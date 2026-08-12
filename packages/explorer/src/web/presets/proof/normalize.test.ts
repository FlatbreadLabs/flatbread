import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeProof } from './normalize';
import type { ProofQueryResult } from './query';

describe('normalizeProof', () => {
  const emptyGraph = (): ProofQueryResult => ({
    allEfforts: [],
    allIssues: [],
    allFindings: [],
    allDecisions: [],
    allConstraints: [],
    allRisks: [],
  });

  it('maps _content.raw to node.body (trimmed)', () => {
    const data: ProofQueryResult = {
      ...emptyGraph(),
      allEfforts: [
        {
          id: 'eff-1',
          title: 'Effort one',
          _content: { raw: '  ## Context\n\nBody text.  ' },
        },
      ],
    };

    const graph = normalizeProof(data);
    assert.equal(graph.nodes.length, 1);
    assert.equal(graph.nodes[0]?.body, '## Context\n\nBody text.');
  });

  it('omits body when _content.raw is empty or whitespace', () => {
    const data: ProofQueryResult = {
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

    const graph = normalizeProof(data);
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    assert.equal(byId.get('dec-1')?.body, undefined);
    assert.equal(byId.get('dec-2')?.body, undefined);
  });

  it('keeps one directed edge for a supersession pair', () => {
    // The writer materializes both sides. Rendering both drew two opposing
    // arrows between the same records and listed the relation twice.
    const data: ProofQueryResult = {
      ...emptyGraph(),
      allDecisions: [
        {
          id: 'dec-old',
          title: 'Old',
          superseded_by: [{ id: 'dec-new' }],
        },
        {
          id: 'dec-new',
          title: 'New',
          supersedes: [{ id: 'dec-old' }],
        },
      ],
    };

    const graph = normalizeProof(data);
    const pair = graph.edges.filter(
      (e) => e.kind === 'supersedes' || e.kind === 'superseded_by'
    );

    assert.equal(pair.length, 1);
    assert.equal(pair[0].kind, 'supersedes');
    assert.equal(pair[0].source, 'dec-new');
    assert.equal(pair[0].target, 'dec-old');
  });

  it('keeps a lone superseded_by when the forward edge is absent', () => {
    const data: ProofQueryResult = {
      ...emptyGraph(),
      allDecisions: [
        { id: 'dec-old', title: 'Old', superseded_by: [{ id: 'dec-new' }] },
        { id: 'dec-new', title: 'New' },
      ],
    };

    const graph = normalizeProof(data);
    const pair = graph.edges.filter(
      (e) => e.kind === 'supersedes' || e.kind === 'superseded_by'
    );

    assert.equal(pair.length, 1);
    assert.equal(pair[0].kind, 'superseded_by');
  });

  it('keeps superseded_by when the superseder is absent from the query', () => {
    const data: ProofQueryResult = {
      ...emptyGraph(),
      allDecisions: [
        { id: 'dec-old', title: 'Old', superseded_by: [{ id: 'dec-missing' }] },
      ],
    };

    const graph = normalizeProof(data);
    const pair = graph.edges.filter((e) => e.kind === 'superseded_by');

    assert.equal(pair.length, 1);
    assert.equal(pair[0].source, 'dec-old');
    assert.equal(pair[0].target, 'dec-missing');
  });
});
