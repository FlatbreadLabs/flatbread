import test from 'ava';
import sift from '../sift';

const nodes = [
  { id: 1, name: 'foo', child: { id: 2, name: 'bar', age: 44 } },
  { id: 3, name: 'baz', child: { id: 4, name: 'qux', age: 9 } },
  { id: 5, name: 'quux', child: { id: 6, name: 'quuz', age: 18 } },
];

test('Sifting an empty array returns an empty array', (t) => {
  t.deepEqual([].filter(sift({ id: { eq: 1 } })), []);
});

test('Sifting with empty filter args returns the unfiltered nodes', (t) => {
  t.deepEqual(nodes.filter(sift({})), nodes);
});

test('Sift for nodes with name equal to "foo"', (t) => {
  t.deepEqual(nodes.filter(sift({ name: { eq: 'foo' } })), [nodes[0]]);
});

test('Sift normalizes ID filters before strict comparison', (t) => {
  t.deepEqual(nodes.filter(sift({ id: { eq: '1' } })), [nodes[0]]);
});

test('Sift rejects invalid ID filter comparators', (t) => {
  t.throws(() => nodes.filter(sift({ id: { eq: '' } })), {
    message:
      'filter id comparator "eq" must be a non-empty string or finite number identifier.',
  });
});

test('Sift supports wildcard and regex filters against string arrays', (t) => {
  const taggedNodes = [
    { id: 1, tags: ['alpha', 'beta'] },
    { id: 2, tags: ['gamma'] },
  ];

  t.deepEqual(taggedNodes.filter(sift({ tags: { wildcard: '*ta' } })), [
    taggedNodes[0],
  ]);
  t.deepEqual(taggedNodes.filter(sift({ tags: { regex: /^gam/ } })), [
    taggedNodes[1],
  ]);
});

test('Sift for nodes with nested object "child" having age greater than or equal to 18', (t) => {
  t.deepEqual(nodes.filter(sift({ child: { age: { gte: 18 } } })), [
    nodes[0],
    nodes[2],
  ]);
});

test('Union sift for nodes with id greater than 1 and nested object "child" having age greater than or equal to 18', (t) => {
  t.deepEqual(
    nodes.filter(
      sift({
        id: {
          gt: 1,
        },
        child: {
          age: {
            gte: 18,
          },
        },
      })
    ),
    [nodes[2]]
  );
});

const nodes2 = [
  { id: 1, title: 'My pretzel collection', postMeta: { rating: 97 } },
  { id: 2, title: 'Debugging the simulation', postMeta: { rating: 20 } },
  {
    id: 3,
    title: 'Liquid Proust is a great tea vendor btw',
    postMeta: { rating: 99 },
  },
  { id: 4, title: 'Sitting in a chair', postMeta: { rating: 74 } },
];

test('Sift by regex where title contains "pretzel"', (t) => {
  t.deepEqual(nodes2.filter(sift({ title: { regex: /pretzel/i } })), [
    nodes2[0],
  ]);
});

test('Union sift for nodes with wildcard title matching "*tion", rating greater than 80', (t) => {
  t.deepEqual(
    nodes2.filter(
      sift({ title: { wildcard: '*tion' }, postMeta: { rating: { gt: 80 } } })
    ),
    [nodes2[0]]
  );
});

test('Ordered comparators return no match for missing, null, non-primitive, or type-mismatched fields without throwing', (t) => {
  const varied = [
    { id: 1, rank: 10 },
    { id: 2 },
    { id: 3, rank: null },
    { id: 4, rank: {} as unknown },
    { id: 5, rank: 'nine' },
  ];

  t.notThrows(() => varied.filter(sift({ rank: { gte: 5 } })));
  t.deepEqual(varied.filter(sift({ rank: { gte: 5 } })), [varied[0]]);

  t.notThrows(() => [{ id: 1, rank: 10 }].filter(sift({ rank: { gt: '1' } })));
  t.deepEqual([{ id: 1, rank: 10 }].filter(sift({ rank: { gt: '1' } })), [
    { id: 1, rank: 10 },
  ]);

  t.deepEqual(
    [
      { id: 1, n: 2 },
      { id: 2, n: 10 },
    ].filter(sift({ n: { lt: '9' } })),
    [{ id: 1, n: 2 }]
  );

  const withBool = [
    { id: 1, flag: true },
    { id: 2, flag: false },
  ];
  t.deepEqual(withBool.filter(sift({ flag: { eq: true } })), [withBool[0]]);
  t.deepEqual(withBool.filter(sift({ flag: { gt: false } })), [withBool[0]]);
});

test('String includes/excludes coerce the comparator value like String.prototype.includes', (t) => {
  const items = [
    { id: 1, title: 'post 123' },
    { id: 2, title: 'hello' },
  ];

  t.notThrows(() => items.filter(sift({ title: { includes: 123 } })));
  t.deepEqual(items.filter(sift({ title: { includes: 123 } })), [items[0]]);
  t.deepEqual(items.filter(sift({ title: { excludes: 123 } })), [items[1]]);
});

test('String includes/excludes reject RegExp search values like String.prototype.includes', (t) => {
  const row = { id: 1, title: 'abc' };

  t.throws(() => [row].filter(sift({ title: { includes: /a/ } })), {
    instanceOf: TypeError,
    message:
      'First argument to String.prototype.includes must not be a regular expression',
  });
  t.throws(() => [row].filter(sift({ title: { excludes: /a/ } })), {
    instanceOf: TypeError,
    message:
      'First argument to String.prototype.includes must not be a regular expression',
  });
});

test('Ordered comparator on sparse nested paths does not throw and skips non-matching nodes', (t) => {
  const rows = [{ id: 1 }, { id: 2, meta: { score: 5 } }];

  t.notThrows(() => rows.filter(sift({ meta: { score: { gte: 3 } } })));
  t.deepEqual(rows.filter(sift({ meta: { score: { gte: 3 } } })), [rows[1]]);
});
