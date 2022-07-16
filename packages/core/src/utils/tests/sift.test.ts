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
