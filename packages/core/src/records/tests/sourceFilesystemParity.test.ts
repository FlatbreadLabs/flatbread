import test from 'ava';
import { resolve } from 'node:path';
import filesystem from '@flatbread/source-filesystem';
import type { LoadedFlatbreadConfig } from '../../types';
import { classifyPath } from '../classify';

const root = 'packages/source-filesystem/src/utils/tests/fixtures/captures';
const paths = [
  `${root}/news/hello.md`,
  `${root}/tech/world.md`,
  `${root}/tech/notes.txt`,
  `${root}/news/missing.md`,
];

test('fetchPaths capture data and inclusion match classifyPath', async (t) => {
  const content = [
    { collection: 'Plain', path: `${root}/news` },
    { collection: 'Capture', path: `${root}/[category]/[slug].md` },
    { collection: 'Recursive', path: `${root}/**/[slug].md` },
  ];
  const config = {
    content,
    loaded: { extensions: ['.md'] },
  } as unknown as LoadedFlatbreadConfig;
  const plugin = filesystem();
  plugin.initialize?.(config);
  const files = await plugin.fetchPaths!(paths);
  const byPath = new Map(files.map((file) => [resolve(file.path), file]));
  for (const path of paths) {
    const expected = path.endsWith('/missing.md')
      ? undefined
      : classifyPath(path, config);
    const actual = byPath.get(resolve(path));
    t.is(Boolean(actual), expected !== undefined, path);
    if (actual && expected) t.deepEqual(actual.data, expected.captures, path);
  }
});
