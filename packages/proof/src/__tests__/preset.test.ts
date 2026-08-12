import test from 'ava';
import { proofContent } from '../preset.js';

test('returns exactly eight entries with exact paths and refs', (t) => {
  const entries = proofContent();
  t.deepEqual(entries, [
    {
      collection: 'Effort',
      path: '.flatbread-proof/efforts',
    },
    {
      collection: 'Issue',
      path: '.flatbread-proof/issues',
      refs: {
        effort: 'Effort',
        supersedes: 'Issue',
        superseded_by: 'Issue',
        cites: 'Citation',
      },
    },
    {
      collection: 'Finding',
      path: '.flatbread-proof/findings',
      refs: {
        effort: 'Effort',
        supersedes: 'Finding',
        superseded_by: 'Finding',
        cites: 'Citation',
      },
    },
    {
      collection: 'Decision',
      path: '.flatbread-proof/decisions',
      refs: {
        effort: 'Effort',
        supersedes: 'Decision',
        superseded_by: 'Decision',
        rejected_by: 'Decision',
        cites: 'Citation',
      },
    },
    {
      collection: 'Constraint',
      path: '.flatbread-proof/constraints',
      refs: {
        effort: 'Effort',
        supersedes: 'Constraint',
        superseded_by: 'Constraint',
        cites: 'Citation',
      },
    },
    {
      collection: 'Risk',
      path: '.flatbread-proof/risks',
      refs: {
        effort: 'Effort',
        supersedes: 'Risk',
        superseded_by: 'Risk',
        mitigated_by: 'Decision',
        cites: 'Citation',
      },
    },
    {
      collection: 'Citation',
      path: '.flatbread-proof/citations',
      refs: { effort: 'Effort', blob: 'Blob' },
    },
    {
      collection: 'Blob',
      path: '.flatbread-proof/blobs',
      refs: { effort: 'Effort' },
    },
  ]);
});

test('a custom root is respected in every path', (t) => {
  const entries = proofContent('memory/graph');
  t.deepEqual(
    entries.map((e) => e.path),
    [
      'memory/graph/efforts',
      'memory/graph/issues',
      'memory/graph/findings',
      'memory/graph/decisions',
      'memory/graph/constraints',
      'memory/graph/risks',
      'memory/graph/citations',
      'memory/graph/blobs',
    ]
  );
});

test('polymorphic union fields are absent from every refs map', (t) => {
  const polymorphic = [
    'derives_from',
    'invalidates',
    'invalidated_by',
    'resolved_by',
    'evidence',
    'cite_meta',
  ];
  for (const entry of proofContent()) {
    for (const field of polymorphic) {
      t.false(
        Object.keys(entry.refs ?? {}).includes(field),
        `${entry.collection} must not declare ${field} in refs`
      );
    }
  }
});

test('cites is a Citation ref on records that can create cites', (t) => {
  for (const entry of proofContent()) {
    if (
      entry.collection === 'Effort' ||
      entry.collection === 'Blob' ||
      entry.collection === 'Citation'
    ) {
      t.falsy(entry.refs?.cites);
      continue;
    }
    t.is(entry.refs?.cites, 'Citation', `${entry.collection}.cites → Citation`);
  }
});
