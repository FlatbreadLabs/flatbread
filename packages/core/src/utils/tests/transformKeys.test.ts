import test from 'ava';
import { camelCase } from 'lodash-es';
import transformKeys from '../transformKeys';

test('it works for basic entries', (t) => {
  t.deepEqual(
    transformKeys({ 'this is a test': true, blah: 'blah' }, camelCase),
    {
      thisIsATest: true,
      blah: 'blah',
    }
  );

  t.deepEqual(
    transformKeys({ 'this is a test': [1, 2, 3, 4], blah: 'blah' }, camelCase),
    {
      thisIsATest: [1, 2, 3, 4],
      blah: 'blah',
    }
  );
});

test('it works with arrays', (t) => {
  t.deepEqual(
    transformKeys({ 'this is a test': [1, 2, 3, 4], blah: 'blah' }, camelCase),
    {
      thisIsATest: [1, 2, 3, 4],
      blah: 'blah',
    }
  );
});

test('it works with undescores', (t) => {
  t.deepEqual(
    transformKeys({ this_is_a_test: [1, 2, 3, 4], blah: 'blah' }, camelCase),
    {
      thisIsATest: [1, 2, 3, 4],
      blah: 'blah',
    }
  );
});

test('it works with dates', (t) => {
  t.deepEqual(
    transformKeys(
      { this_is_a_test: new Date('2021-02-25T16:41:59.558Z'), blah: 'blah' },
      camelCase
    ),
    {
      thisIsATest: new Date('2021-02-25T16:41:59.558Z'),
      blah: 'blah',
    }
  );
});

test('it throws an error on illegal field names', (t) => {
  const error = t.throws(() =>
    transformKeys(
      {
        'thisisatest[]': test,
      },
      (s) => s
    )
  );
  t.snapshot(error?.message);
});
