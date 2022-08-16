import test from 'ava';
import { createPath } from './index';

test('create path can correctly populate a path', (t) => {
  const path = createPath(
    {
      name: 'Test',
      path: '/[test]/[nested.test]/[blah].md',
    },
    {
      test: 'first',
      nested: {
        test: 'second-part',
      },
      blah: 'blarghhh',
    },
    { extension: '' }
  );

  t.is(path, '/first/second-part/blarghhh.md');
});

test('create path can correctly populate a path without an extension', (t) => {
  const path = createPath(
    {
      name: 'Test',
      path: '/[test]/[nested.test]/[blah]',
    },
    {
      test: 'first',
      nested: {
        test: 'second-part',
      },
      blah: 'blarghhh',
    },
    { extension: '.md', reference: 'test-name', referenceField: 'id' }
  );

  t.is(path, '/first/second-part/blarghhh/test-name.md');
});
