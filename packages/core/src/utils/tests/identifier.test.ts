import test from 'ava';
import {
  createIdentifierSet,
  identifiersEqual,
  normalizeIdentifier,
  normalizeIdentifiers,
} from '../identifier';

test('normalizes string and numeric identifiers to strings', (t) => {
  t.is(normalizeIdentifier('post-1'), 'post-1');
  t.is(normalizeIdentifier(42), '42');
});

test('rejects unsupported identifier values', (t) => {
  t.is(normalizeIdentifier(undefined), undefined);
  t.is(normalizeIdentifier(null), undefined);
  t.is(normalizeIdentifier(Number.NaN), undefined);
  t.is(normalizeIdentifier({ id: 'post-1' }), undefined);
});

test('compares supported identifiers with normalized semantics', (t) => {
  t.true(identifiersEqual(1, '1'));
  t.true(identifiersEqual('author-a', 'author-a'));
  t.false(identifiersEqual('01', 1));
  t.false(identifiersEqual(undefined, '1'));
});

test('normalizes identifier arrays and drops unsupported values', (t) => {
  t.deepEqual(normalizeIdentifiers(['1', 2, null, Number.NaN, 'author']), [
    '1',
    '2',
    'author',
  ]);
});

test('creates normalized identifier sets', (t) => {
  const identifiers = createIdentifierSet(['1', 2]);

  t.true(identifiers.has('1'));
  t.true(identifiers.has('2'));
  t.false(identifiers.has('3'));
});
