import test from 'ava';
import type { LoadedFlatbreadConfig } from '@flatbread/core';
import source from '../../index';

const MISSING_DIRECTORY =
  'packages/source-filesystem/src/utils/tests/fixtures/never-written';
const CAPTURE_PATTERN =
  'packages/source-filesystem/src/utils/tests/fixtures/captures/[category]/[slug].md';
const CONTENT_FILE =
  'packages/source-filesystem/src/utils/tests/fixtures/captures/news/hello.md';

function initializedSource(content: { path: string; collection: string }[]) {
  const plugin = source();
  plugin.initialize?.({
    content,
    loaded: { extensions: ['.md'] },
  } as unknown as LoadedFlatbreadConfig);
  return plugin;
}

test('fetch returns an empty collection for a directory nothing has written', async (t) => {
  const content = [{ path: MISSING_DIRECTORY, collection: 'NeverWritten' }];
  const plugin = initializedSource(content);

  t.deepEqual(await plugin.fetch(content), { NeverWritten: [] });
});

test('fetch still reads the collections that exist beside a missing one', async (t) => {
  const content = [
    { path: MISSING_DIRECTORY, collection: 'NeverWritten' },
    { path: CAPTURE_PATTERN, collection: 'CaptureDoc' },
  ];
  const plugin = initializedSource(content);

  const nodes = await plugin.fetch(content);

  t.deepEqual(nodes.NeverWritten, []);
  t.is(nodes.CaptureDoc.length, 2);
});

test('fetch rejects when a configured directory path is a file', async (t) => {
  const content = [{ path: CONTENT_FILE, collection: 'NotADirectory' }];
  const plugin = initializedSource(content);

  const error = await t.throwsAsync(plugin.fetch(content));

  t.is((error as NodeJS.ErrnoException | undefined)?.code, 'ENOTDIR');
});
