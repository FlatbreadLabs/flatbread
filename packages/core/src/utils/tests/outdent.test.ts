import test from 'ava';
import { outdent } from '../outdent';

test('basic outdent', (t) => {
  const result = outdent`This
  is
  a
  test you
    this should still be indented`;

  t.is(
    result,
    `This
is
a
test you
  this should still be indented`
  );
});

test('it still interpolates data', (t) => {
  const p = 'animal';
  const result = outdent`This
  is
  a
  test you ${p}
    this should still be indented`;

  t.is(
    result,
    `This
is
a
test you animal
  this should still be indented`
  );
});
