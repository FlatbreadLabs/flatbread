import test from 'ava';
import sift from '../sift.js';

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
