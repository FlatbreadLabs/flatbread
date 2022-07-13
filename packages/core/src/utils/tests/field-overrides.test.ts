import test from 'ava';
import { getFieldOverrides } from '../field-overrides.js';

function getProps(overrides: any[]): [string, any] {
  return ['t', { content: [{ collection: 't', overrides }] }];
}

test('basic override', (t) => {
  const result = getFieldOverrides(
    ...getProps([
      {
        field: 'basic',
        type: 'string',
        resolve: (source: string) => {
          t.is(source, 'test');
          return true;
        },
      },
    ])
  );
  t.snapshot(result);
  t.is(result.basic().resolve({ basic: 'test' }), true);
});

test('nested basic override', (t) => {
  const result = getFieldOverrides(
    ...getProps([
      {
        field: 'nested.basic',
        type: 'string',
        resolve: (source: string) => {
          t.is(source, 'test');
          return true;
        },
      },
    ])
  );
  t.snapshot(result);
  t.is(result.nested.basic().resolve({ basic: 'test' }), true);
});

test('basic array override', (t) => {
  const result = getFieldOverrides(
    ...getProps([
      {
        field: 'basic[]',
        type: 'string',
        resolve: (items: any) => {
          t.deepEqual(items, ['']);
          return items.map(() => true);
        },
      },
    ])
  );
  t.snapshot(result);
  t.deepEqual(result.basic().resolve({ basic: [''] }), [true]);
});

test('basic object array override', (t) => {
  const result = getFieldOverrides(
    ...getProps([
      {
        field: 'basic[]obj',
        type: 'string',
        resolve: (source: string) => {
          t.is(source, 'test');
          return true;
        },
      },
    ])
  );
  t.snapshot(result);
  t.deepEqual(result.basic[0].obj().resolve({ obj: 'test' }), true);
});
