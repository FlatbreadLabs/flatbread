import test from 'ava';
import { effortGraphContent } from '../preset.js';

test('returns exactly six entries with exact paths and refs', (t) => {
  const entries = effortGraphContent();
  t.deepEqual(entries, [
    { collection: 'Effort', path: '.flatbread-efforts/efforts' },
    {
      collection: 'Issue',
      path: '.flatbread-efforts/issues',
      refs: { effort: 'Effort', supersedes: 'Issue', superseded_by: 'Issue' },
    },
    {
      collection: 'Finding',
      path: '.flatbread-efforts/findings',
      refs: {
        effort: 'Effort',
        supersedes: 'Finding',
        superseded_by: 'Finding',
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
      },
    },
    {
      collection: 'Constraint',
      path: '.flatbread-efforts/constraints',
      refs: {
        effort: 'Effort',
        supersedes: 'Constraint',
        superseded_by: 'Constraint',
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
      },
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
