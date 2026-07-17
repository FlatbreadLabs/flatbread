import test from 'ava';
import { createQueryExecutor } from '../index';
import type { ContentNode, Override } from '../../types';

const authors: ContentNode[] = [
  { id: 1, name: 'Eva' },
  { id: '2', name: 'Noah' },
];
const posts: ContentNode[] = [
  {
    id: ' 10 ',
    title: 'Beta',
    rank: 2,
    nested: { label: 'second' },
    friend: 1,
    authors: [1, '2'],
    _content: { raw: 'Hello world' },
  },
  {
    id: 11,
    title: 'Alpha',
    rank: 1,
    nested: { label: 'first' },
    friend: 2,
    authors: [2],
    _content: { raw: 'Other words' },
  },
];

const executor = (
  collections: Record<string, readonly ContentNode[]> = {
    Post: posts,
    Author: authors,
  },
  overridesByCollection: Record<string, readonly Override[] | undefined> = {},
  preknownSchemaFragments: Record<string, unknown> = {}
) =>
  createQueryExecutor({
    collections,
    relations: { Post: { friend: 'Author', authors: 'Author' } },
    fieldNameTransform: (field) => field,
    preknownSchemaFragments,
    overridesByCollection,
  });

test('1. filters plain and nested record fields', async (t) => {
  const result = await executor().all(
    { name: 'Post' },
    { filter: { nested: { label: { eq: 'first' } } } }
  );
  t.deepEqual(
    result.map((node) => node.id),
    [11]
  );
});

test('2. filters root id with normalized eq including numeric IDs', async (t) => {
  const result = await executor().all(
    { name: 'Post' },
    { filter: { id: { eq: 11 } } }
  );
  t.deepEqual(
    result.map((node) => node.id),
    [11]
  );
});

test('3. traverses a scalar reference filter', async (t) => {
  const result = await executor().all(
    { name: 'Post' },
    { filter: { friend: { name: { eq: 'Eva' } } } }
  );
  t.deepEqual(
    result.map((node) => node.id),
    [' 10 ']
  );
});

test('4. traverses list references existentially', async (t) => {
  const result = await executor().all(
    { name: 'Post' },
    { filter: { authors: { name: { eq: 'Eva' } } } }
  );
  t.deepEqual(
    result.map((node) => node.id),
    [' 10 ']
  );
});

test('5. filters preknown derived fields with default args without memoizing canonical data', async (t) => {
  let receivedSpeed: number | undefined;
  let receivedRaw: unknown;
  const fragments = {
    _content: {
      timeToRead: () => ({
        args: { speed: { defaultValue: 230 } },
        resolve: async (
          parent: Record<string, unknown>,
          args: { speed: number }
        ) => {
          receivedSpeed = args.speed;
          receivedRaw = parent.raw;
          parent.html = 'memoized';
          return String(parent.raw).length;
        },
      }),
    },
  };
  const snapshot = [{ id: 'post', _content: { raw: 'content' } }];
  const result = await executor({ Post: snapshot }, {}, fragments).all(
    { name: 'Post' },
    { filter: { _content: { timeToRead: { eq: 7 } } } }
  );
  t.is(receivedSpeed, 230);
  t.is(receivedRaw, 'content');
  t.is(result.length, 1);
  t.false('html' in (snapshot[0]._content as Record<string, unknown>));
});

test('14. skips derived resolvers when the fragment parent is missing', async (t) => {
  let invoked = false;
  const fragments = {
    _content: {
      timeToRead: () => ({
        resolve: async () => {
          invoked = true;
          return 1;
        },
      }),
    },
  };
  const result = await executor(
    { Post: [{ id: 'plain', title: 'YAML' }] },
    {},
    fragments
  ).all({ name: 'Post' }, { filter: { _content: { timeToRead: { eq: 1 } } } });
  t.false(invoked);
  t.is(result.length, 0);
});

test('6. filters config overrides with source/value convention and defaults', async (t) => {
  let received:
    | { value: unknown; source: unknown; args: Record<string, unknown> }
    | undefined;
  const override: Override = {
    field: 'metadata.score',
    type: 'Int',
    args: { factor: { type: 'Int' as never, defaultValue: 2 } },
    resolve: (value, extended) => {
      received = { value, source: extended.source, args: extended.args };
      return Number(value) * Number(extended.args.factor);
    },
  };
  const result = await executor(
    { Post: [{ id: 'post', metadata: { score: 4 } }] },
    { Post: [override] }
  ).all({ name: 'Post' }, { filter: { metadata: { score: { eq: 8 } } } });
  t.is(result.length, 1);
  t.is(received?.value, 4);
  t.deepEqual(received?.source, { score: 4 });
  t.deepEqual(received?.args, { factor: 2 });
});

test('7. filters the collection meta field', async (t) => {
  const result = await executor().all(
    { name: 'Post' },
    { filter: { _collection: { eq: 'Post' } } }
  );
  t.is(result.length, 2);
});

test('8. sorts stably and does not mutate the input snapshot', async (t) => {
  const snapshot = [
    { id: 'a', rank: 1 },
    { id: 'b', rank: 1 },
    { id: 'c', rank: 2 },
  ];
  const result = await executor({ Post: snapshot }).all(
    { name: 'Post' },
    { sortBy: 'rank' }
  );
  t.deepEqual(
    result.map((node) => node.id),
    ['a', 'b', 'c']
  );
  t.deepEqual(
    snapshot.map((node) => node.id),
    ['a', 'b', 'c']
  );
});

test('9. DESC reverses collection order without sortBy', async (t) => {
  const result = await executor().all({ name: 'Post' }, { order: 'DESC' });
  t.deepEqual(
    result.map((node) => node.id),
    [11, ' 10 ']
  );
});

test('10. uses limit as the slice end index', async (t) => {
  const result = await executor().all({ name: 'Post' }, { skip: 1, limit: 2 });
  t.deepEqual(
    result.map((node) => node.id),
    [11]
  );
});

test('11. finds IDs with normalization and preserves missing/error behavior', async (t) => {
  const query = executor();
  t.is((await query.findById({ name: 'Post' }, 11))?.id, 11);
  t.is(await query.findById({ name: 'Post' }, 'missing'), undefined);
  const error = await t.throwsAsync(() =>
    query.findById({ name: 'Post' }, false)
  );
  t.is(
    error?.message,
    'Post query argument "id" must be a non-empty string or finite number identifier.'
  );
});

test('12. findMany preserves collection order, deduplicates IDs, and validates ids', async (t) => {
  const query = executor();
  const result = await query.findMany({ name: 'Post' }, [11, 11, '10'], {});
  t.deepEqual(
    result.map((node) => node.id),
    [' 10 ', 11]
  );
  const error = await t.throwsAsync(() =>
    query.findMany({ name: 'Post' }, '11', {})
  );
  t.is(
    error?.message,
    'Post query argument "ids" must be an array of identifiers.'
  );
});

test('13. output mutation cannot change the canonical snapshot or later queries', async (t) => {
  const snapshot = [{ id: 'post', nested: { values: [1] } }];
  const query = executor({ Post: snapshot });
  const all = await query.all({ name: 'Post' }, {});
  all[0].nested = { values: [9] };
  const many = await query.findMany({ name: 'Post' }, ['post'], {});
  (many[0].nested as { values: number[] }).values.push(8);
  const one = await query.findById({ name: 'Post' }, 'post');
  t.deepEqual(snapshot, [{ id: 'post', nested: { values: [1] } }]);
  t.deepEqual(one, { id: 'post', nested: { values: [1] } });
});

test('15. resolves trailing-array overrides against the whole raw array', async (t) => {
  let received: unknown;
  const override: Override = {
    field: 'array[]',
    type: 'String',
    resolve: (value) => {
      received = value;
      return (value as string[]).map((item) => item.toUpperCase());
    },
  };
  const rawArray = ['x', 'y'];
  const result = await executor(
    { Post: [{ id: 'post', array: rawArray }] },
    { Post: [override] }
  ).all({ name: 'Post' }, { filter: { array: { includes: 'X' } } });
  t.deepEqual(received, rawArray);
  t.is(result.length, 1);
});

test('16. keeps nested paths root-relative when they shadow derived fields', async (t) => {
  let invoked = false;
  const fragments = {
    _content: {
      html: () => ({
        resolve: () => {
          invoked = true;
          return 'derived-value';
        },
      }),
    },
  };
  const result = await executor(
    { Post: [{ id: 'post', x: { _content: { html: 'raw-value' } } }] },
    {},
    fragments
  ).all(
    { name: 'Post' },
    {
      filter: { x: { _content: { html: { eq: 'raw-value' } } } },
    }
  );
  t.is(result.length, 1);
  t.false(invoked);
});
