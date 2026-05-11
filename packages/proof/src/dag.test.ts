import test from 'ava';

import {
  createModelSelectionResolver,
  normalizeModelSelection,
  parseDAG,
  resolveModelSelectionFromCatalog,
  validateModelMap,
  type ModelCatalogItem,
  type ModelSpec,
  type ModelSelection,
} from './dag.js';

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

test('resolveModelSelectionFromCatalog returns default variant when no params requested', (t) => {
  const resolved = resolveSelection({ id: 'composer-2' }, [
    {
      displayName: 'Fast',
      params: [{ id: 'effort', value: 'low' }],
    },
    {
      displayName: 'Default',
      isDefault: true,
      params: [{ id: 'effort', value: 'medium' }],
    },
  ]);

  t.deepEqual(resolved, {
    id: 'composer-2',
    params: [{ id: 'effort', value: 'medium' }],
  });
});

test('resolveModelSelectionFromCatalog falls back to first variant when no default is flagged', (t) => {
  const resolved = resolveSelection({ id: 'composer-2' }, [
    {
      displayName: 'Fast',
      params: [{ id: 'effort', value: 'low' }],
    },
    {
      displayName: 'Careful',
      params: [{ id: 'effort', value: 'high' }],
    },
  ]);

  t.deepEqual(resolved, {
    id: 'composer-2',
    params: [{ id: 'effort', value: 'low' }],
  });
});

test('resolveModelSelectionFromCatalog treats empty params as no params requested', (t) => {
  const resolved = resolveSelection({ id: 'composer-2', params: [] }, [
    {
      displayName: 'Fast',
      params: [{ id: 'effort', value: 'low' }],
    },
    {
      displayName: 'Default',
      isDefault: true,
      params: [{ id: 'effort', value: 'medium' }],
    },
  ]);

  t.deepEqual(resolved, {
    id: 'composer-2',
    params: [{ id: 'effort', value: 'medium' }],
  });
});

test('resolveModelSelectionFromCatalog throws when no variant fully matches requested params', (t) => {
  const err = t.throws(() =>
    resolveSelection(
      {
        id: 'composer-2',
        params: [
          { id: 'effort', value: 'max' },
          { id: 'style', value: 'verbose' },
        ],
      },
      [
        {
          displayName: 'Max concise',
          params: [
            { id: 'effort', value: 'max' },
            { id: 'style', value: 'concise' },
          ],
        },
        {
          displayName: 'Medium verbose',
          params: [
            { id: 'effort', value: 'medium' },
            { id: 'style', value: 'verbose' },
          ],
        },
      ]
    )
  );

  if (!err) {
    t.fail('Expected partial variant match to throw.');
    return;
  }
  t.regex(err.message, /does not match any Cursor SDK preset variant/);
});

test('resolveModelSelectionFromCatalog throws on unknown model id', (t) => {
  const catalog: ModelCatalogItem[] = [
    { id: 'composer-2', displayName: 'Composer 2' },
  ];
  const err = t.throws(() =>
    resolveModelSelectionFromCatalog({ id: 'unknown-model' }, catalog, 'test')
  );

  if (!err) {
    t.fail('Expected unknown model id to throw.');
    return;
  }
  t.regex(err.message, /uses unknown Cursor SDK model/);
});

test('resolveModelSelectionFromCatalog passes through selection when model has no variants', (t) => {
  const catalog: ModelCatalogItem[] = [
    { id: 'composer-2', displayName: 'Composer 2' },
  ];
  const selection: ModelSelection = {
    id: 'composer-2',
  };
  const resolved = resolveModelSelectionFromCatalog(selection, catalog, 'test');

  t.deepEqual(resolved, selection);
  t.not(resolved, selection);
});

test('resolveModelSelectionFromCatalog accepts valid params declared by catalog parameters', (t) => {
  const catalog: ModelCatalogItem[] = [
    {
      id: 'composer-2',
      displayName: 'Composer 2',
      parameters: [
        {
          id: 'effort',
          values: [{ value: 'low' }, { value: 'medium' }, { value: 'high' }],
        },
      ],
    },
  ];
  const selection: ModelSelection = {
    id: 'composer-2',
    params: [{ id: 'effort', value: 'high' }],
  };

  const resolved = resolveModelSelectionFromCatalog(selection, catalog, 'test');

  t.deepEqual(resolved, selection);
  t.not(resolved, selection);
});

test('resolveModelSelectionFromCatalog throws when catalog parameters reject a param id', (t) => {
  const catalog: ModelCatalogItem[] = [
    {
      id: 'composer-2',
      displayName: 'Composer 2',
      parameters: [{ id: 'effort', values: [{ value: 'medium' }] }],
    },
  ];
  const err = t.throws(() =>
    resolveModelSelectionFromCatalog(
      { id: 'composer-2', params: [{ id: 'style', value: 'concise' }] },
      catalog,
      'test'
    )
  );

  if (!err) {
    t.fail('Expected unknown parameter id to throw.');
    return;
  }
  t.regex(err.message, /does not support param "style"/);
});

test('resolveModelSelectionFromCatalog throws when catalog parameters reject a param value', (t) => {
  const catalog: ModelCatalogItem[] = [
    {
      id: 'composer-2',
      displayName: 'Composer 2',
      parameters: [{ id: 'effort', values: [{ value: 'medium' }] }],
    },
  ];
  const err = t.throws(() =>
    resolveModelSelectionFromCatalog(
      { id: 'composer-2', params: [{ id: 'effort', value: 'max' }] },
      catalog,
      'test'
    )
  );

  if (!err) {
    t.fail('Expected unsupported parameter value to throw.');
    return;
  }
  t.regex(err.message, /param "effort" does not support value "max"/);
});

test('resolveModelSelectionFromCatalog throws when explicit params have no catalog declaration', (t) => {
  const catalog: ModelCatalogItem[] = [
    { id: 'composer-2', displayName: 'Composer 2' },
  ];
  const err = t.throws(() =>
    resolveModelSelectionFromCatalog(
      { id: 'composer-2', params: [{ id: 'effort', value: 'medium' }] },
      catalog,
      'test'
    )
  );

  if (!err) {
    t.fail('Expected undeclared parameters to throw.');
    return;
  }
  t.regex(err.message, /does not declare parameters or preset variants/);
});

test('normalizeModelSelection trims string model ids', (t) => {
  t.deepEqual(normalizeModelSelection('  composer-2  '), { id: 'composer-2' });
});

test('normalizeModelSelection normalizes valid object model specs', (t) => {
  const input: ModelSelection = {
    id: '  composer-2  ',
    params: [{ id: '  effort  ', value: '  medium  ' }],
  };
  const result = normalizeModelSelection(input, 'test model');

  t.deepEqual(result, {
    id: 'composer-2',
    params: [{ id: 'effort', value: 'medium' }],
  });
  t.not(result, input);
  t.not(result.params, input.params);
});

test('normalizeModelSelection throws label-prefixed errors for invalid model specs', (t) => {
  for (const raw of ['', '   ', 42, null]) {
    const err = t.throws(() =>
      normalizeModelSelection(raw as unknown as ModelSpec, 'test model')
    );

    if (!err) {
      t.fail(`Expected invalid model spec ${String(raw)} to throw.`);
      continue;
    }
    t.regex(err.message, /^test model must be /);
  }
});

test('normalizeModelSelection throws label-prefixed errors for invalid param values', (t) => {
  for (const value of ['', '   ', 42]) {
    const err = t.throws(() =>
      normalizeModelSelection(
        {
          id: 'composer-2',
          params: [{ id: 'effort', value }],
        } as unknown as ModelSpec,
        'test model'
      )
    );

    if (!err) {
      t.fail(`Expected invalid param value ${String(value)} to throw.`);
      continue;
    }
    t.is(err.message, 'test model.params[0].value must be a non-empty string.');
  }
});

test('normalizeModelSelection throws on duplicate param ids', (t) => {
  const err = t.throws(() =>
    normalizeModelSelection(
      {
        id: 'composer-2',
        params: [
          { id: 'effort', value: 'low' },
          { id: 'effort', value: 'high' },
        ],
      },
      'test model'
    )
  );

  if (!err) {
    t.fail('Expected duplicate param id to throw.');
    return;
  }
  t.regex(err.message, /duplicate id: effort/);
});

test('validateModelMap accepts plain string model ids', (t) => {
  t.deepEqual(
    validateModelMap(
      {
        HIGH: '  claude-opus-4-7  ',
        LOW: 'gpt-5.4-nano',
      },
      'test models'
    ),
    {
      HIGH: { id: 'claude-opus-4-7' },
      LOW: { id: 'gpt-5.4-nano' },
    }
  );
});

test('validateModelMap accepts model selection objects with params', (t) => {
  t.deepEqual(
    validateModelMap(
      {
        MED: {
          id: 'composer-2',
          params: [{ id: 'effort', value: 'max' }],
        },
      },
      'test models'
    ),
    {
      MED: {
        id: 'composer-2',
        params: [{ id: 'effort', value: 'max' }],
      },
    }
  );
});

test('createModelSelectionResolver normalizes mixed override shapes', (t) => {
  const modelFor = createModelSelectionResolver({
    HIGH: 'claude-opus-4-7',
    MED: {
      id: 'composer-2',
      params: [{ id: 'effort', value: 'medium' }],
    },
  });

  t.deepEqual(modelFor('HIGH'), { id: 'claude-opus-4-7' });
  t.deepEqual(modelFor('MED'), {
    id: 'composer-2',
    params: [{ id: 'effort', value: 'medium' }],
  });
  t.deepEqual(modelFor('LOW'), { id: 'gpt-5.4-nano' });
});

test('parseDAG normalizes mixed model override shapes', (t) => {
  const dag = parseDAG({
    title: 'Mixed model overrides',
    models: {
      HIGH: 'claude-opus-4-7',
      MED: {
        id: 'composer-2',
        params: [{ id: 'effort', value: 'medium' }],
      },
    },
    tasks: [
      {
        id: 'review',
        depends_on: [],
        complexity: 'HIGH',
        subtask_prompt: 'Review the change.',
      },
    ],
  });

  t.deepEqual(dag.models, {
    HIGH: { id: 'claude-opus-4-7' },
    MED: {
      id: 'composer-2',
      params: [{ id: 'effort', value: 'medium' }],
    },
  });
});
