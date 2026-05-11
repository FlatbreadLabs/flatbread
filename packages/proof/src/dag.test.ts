import test from 'ava';

import {
  resolveModelSelectionFromCatalog,
  type ModelCatalogItem,
  type ModelSelection,
} from './dag';

function resolveSelection(
  selection: ModelSelection,
  variants: NonNullable<ModelCatalogItem['variants']>
): ModelSelection {
  const catalog: ModelCatalogItem[] = [
    { id: 'composer-2', displayName: 'Composer 2', variants },
  ];
  return resolveModelSelectionFromCatalog(selection, catalog, 'test model');
}

test('resolveModelSelectionFromCatalog prefers highest-scoring variant among matches', (t) => {
  const resolved = resolveSelection(
    { id: 'composer-2', params: [{ id: 'effort', value: 'max' }] },
    [
      {
        displayName: 'Default medium concise',
        isDefault: true,
        params: [
          { id: 'effort', value: 'medium' },
          { id: 'style', value: 'concise' },
        ],
      },
      {
        displayName: 'Max concise',
        params: [
          { id: 'effort', value: 'max' },
          { id: 'style', value: 'concise' },
        ],
      },
      {
        displayName: 'Max verbose',
        params: [
          { id: 'effort', value: 'max' },
          { id: 'style', value: 'verbose' },
        ],
      },
    ]
  );

  t.deepEqual(resolved, {
    id: 'composer-2',
    params: [
      { id: 'effort', value: 'max' },
      { id: 'style', value: 'concise' },
    ],
  });
});

test('resolveModelSelectionFromCatalog breaks equal-score ties to catalog default variant', (t) => {
  const resolved = resolveSelection(
    { id: 'composer-2', params: [{ id: 'effort', value: 'max' }] },
    [
      {
        displayName: 'Max with style override',
        params: [
          { id: 'effort', value: 'max' },
          { id: 'style', value: 'verbose' },
        ],
      },
      {
        displayName: 'Default max',
        isDefault: true,
        params: [{ id: 'effort', value: 'max' }],
      },
    ]
  );

  t.deepEqual(resolved, {
    id: 'composer-2',
    params: [{ id: 'effort', value: 'max' }],
  });
});

test('resolveModelSelectionFromCatalog throws a descriptive error when no variant matches', (t) => {
  const err = t.throws(() =>
    resolveSelection(
      { id: 'composer-2', params: [{ id: 'effort', value: 'max' }] },
      [
        {
          displayName: 'Default medium',
          isDefault: true,
          params: [{ id: 'effort', value: 'medium' }],
        },
      ]
    )
  );

  if (!err) {
    t.fail('Expected no-match variant selection to throw.');
    return;
  }
  t.regex(
    err.message,
    /does not match any Cursor SDK preset variant\. Valid variants:/
  );
});
