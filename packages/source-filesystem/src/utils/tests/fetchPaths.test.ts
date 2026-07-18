import test from 'ava';
import { resolve } from 'node:path';
import type { LoadedFlatbreadConfig } from '@flatbread/core';
import source from '../../index';

const CAPTURE_PATTERN =
  'packages/source-filesystem/src/utils/tests/fixtures/captures/[category]/[slug].md';

const HELLO_PATH =
  'packages/source-filesystem/src/utils/tests/fixtures/captures/news/hello.md';
const WORLD_PATH =
  'packages/source-filesystem/src/utils/tests/fixtures/captures/tech/world.md';
const TXT_PATH =
  'packages/source-filesystem/src/utils/tests/fixtures/captures/tech/notes.txt';
const MISSING_PATH =
  'packages/source-filesystem/src/utils/tests/fixtures/captures/news/missing.md';

function initializedSource() {
  const plugin = source();
  plugin.initialize?.({
    content: [{ path: CAPTURE_PATTERN, collection: 'CaptureDoc' }],
    loaded: { extensions: ['.md'] },
  } as unknown as LoadedFlatbreadConfig);
  return plugin;
}

test('fetchPaths reads only the requested existing paths', async (t) => {
  const plugin = initializedSource();

  const files = await plugin.fetchPaths!([HELLO_PATH, WORLD_PATH]);

  t.is(files.length, 2);
  t.deepEqual(
    files.map((file) => resolve(file.path)).sort(),
    [resolve(HELLO_PATH), resolve(WORLD_PATH)].sort()
  );
});

test('fetchPaths silently omits missing paths', async (t) => {
  const plugin = initializedSource();

  const files = await plugin.fetchPaths!([HELLO_PATH, MISSING_PATH]);

  t.is(files.length, 1);
  t.is(resolve(files[0].path), resolve(HELLO_PATH));
});

test('fetchPaths filters unsupported extensions', async (t) => {
  const plugin = initializedSource();

  const files = await plugin.fetchPaths!([TXT_PATH, WORLD_PATH]);

  t.is(files.length, 1);
  t.is(resolve(files[0].path), resolve(WORLD_PATH));
});

test('fetchPaths produces the same capture metadata as fetch for a [category]/[slug].md pattern', async (t) => {
  const plugin = initializedSource();

  const fetched = await plugin.fetch([
    { path: CAPTURE_PATTERN, collection: 'CaptureDoc' },
  ]);
  const fetchedFiles = fetched.CaptureDoc;
  t.true(fetchedFiles.length >= 2);

  const byPath = new Map(
    fetchedFiles.map((file) => [resolve(file.path), file])
  );
  const fetchedHello = byPath.get(resolve(HELLO_PATH));
  const fetchedWorld = byPath.get(resolve(WORLD_PATH));
  t.truthy(fetchedHello);
  t.truthy(fetchedWorld);
  t.deepEqual(fetchedHello!.data, { category: 'news', slug: 'hello' });
  t.deepEqual(fetchedWorld!.data, { category: 'tech', slug: 'world' });

  const pathFiles = await plugin.fetchPaths!([HELLO_PATH, WORLD_PATH]);
  const pathByPath = new Map(
    pathFiles.map((file) => [resolve(file.path), file])
  );

  t.deepEqual(
    pathByPath.get(resolve(HELLO_PATH))!.data,
    fetchedHello!.data,
    'fetchPaths must assign identical capture data to fetch'
  );
  t.deepEqual(pathByPath.get(resolve(WORLD_PATH))!.data, fetchedWorld!.data);
});

test('fetchPaths supports globstar capture patterns', async (t) => {
  const plugin = source();
  plugin.initialize?.({
    content: [
      {
        path: 'packages/source-filesystem/src/utils/tests/fixtures/captures/**/[slug].md',
        collection: 'Recursive',
      },
    ],
    loaded: { extensions: ['.md'] },
  } as unknown as LoadedFlatbreadConfig);

  const files = await plugin.fetchPaths!([HELLO_PATH, WORLD_PATH]);
  t.is(files.length, 2);
  t.deepEqual(
    Object.fromEntries(files.map((file) => [resolve(file.path), file.data])),
    {
      [resolve(HELLO_PATH)]: { slug: 'hello' },
      [resolve(WORLD_PATH)]: { slug: 'world' },
    }
  );
});
