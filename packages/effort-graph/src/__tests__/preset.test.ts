import test from 'ava';
import { effortGraphContent } from '../preset.js';

test('returns exactly eight entries with exact paths and refs', (t) => {
  const entries = effortGraphContent();
  t.deepEqual(entries, [
    {
      collection: 'Effort',
      path: '.flatbread-efforts/efforts',
    },
    {
      collection: 'Issue',
      path: '.flatbread-efforts/issues',
      refs: {
        effort: 'Effort',
        supersedes: 'Issue',
        superseded_by: 'Issue',
        cites: 'Citation',
      },
    },
    {
      collection: 'Finding',
      path: '.flatbread-efforts/findings',
      refs: {
        effort: 'Effort',
        supersedes: 'Finding',
        superseded_by: 'Finding',
        cites: 'Citation',
      },
    },
    {
      collection: 'Decision',
      path: '.flatbread-efforts/decisions',
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
      path: '.flatbread-efforts/constraints',
      refs: {
        effort: 'Effort',
        supersedes: 'Constraint',
        superseded_by: 'Constraint',
        cites: 'Citation',
      },
    },
    {
      collection: 'Risk',
      path: '.flatbread-efforts/risks',
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
      path: '.flatbread-efforts/citations',
      refs: { effort: 'Effort', blob: 'Blob' },
    },
    {
      collection: 'Blob',
      path: '.flatbread-efforts/blobs',
      refs: { effort: 'Effort' },
    },
  ]);
});

test('a custom root is respected in every path', (t) => {
  const entries = effortGraphContent('memory/graph');
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
  for (const entry of effortGraphContent()) {
    for (const field of polymorphic) {
      t.false(
        Object.keys(entry.refs ?? {}).includes(field),
        `${entry.collection} must not declare ${field} in refs`
      );
    }
  }
});

test('cites is a Citation ref on records that can create cites', (t) => {
  for (const entry of effortGraphContent()) {
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
