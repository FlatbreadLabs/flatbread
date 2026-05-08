import test from 'ava';
import filesystem from '@flatbread/source-filesystem';
import markdownTransformer from '@flatbread/transformer-markdown';
import { exportCollectionsAsJson } from '../json';
import { initializeConfig } from '../../utils/initializeConfig';

test('exports selected collections as stable normalized JSON', async (t) => {
  const config = initializeConfig({
    source: filesystem(),
    transformer: markdownTransformer(),
    content: [
      {
        path: 'packages/core/src/providers/test/fixtures/missing-refs-clean/authors',
        collection: 'Author',
      },
      {
        path: 'packages/core/src/providers/test/fixtures/missing-refs-clean/tags',
        collection: 'Tag',
      },
      {
        path: 'packages/core/src/providers/test/fixtures/missing-refs-clean/posts',
        collection: 'Post',
        refs: {
          author: 'Author',
          authors: 'Author',
          tags: 'Tag',
        },
      },
    ],
  });

  const result = await exportCollectionsAsJson(
    { config },
    { collections: ['Post'] }
  );

  t.deepEqual(Object.keys(result), ['Post']);
  t.deepEqual(result.Post, [
    {
      _content: {
        raw: '\nAll references resolve, so missing-ref validation must remain silent and the\nschema should build cleanly.\n',
      },
      _filename: 'known-post.md',
      _path:
        'packages/core/src/providers/test/fixtures/missing-refs-clean/posts/known-post.md',
      _slug: 'known-post',
      author: 'known-author',
      authors: ['known-author'],
      id: 'known-post',
      tags: ['known-tag'],
      title: 'Post With Resolved Refs',
    },
  ]);
});

test('rejects unknown selected collections', async (t) => {
  const config = initializeConfig({
    source: filesystem(),
    transformer: markdownTransformer(),
    content: [
      {
        path: 'packages/core/src/providers/test/fixtures/missing-refs-clean/authors',
        collection: 'Author',
      },
    ],
  });

  const error = await t.throwsAsync(() =>
    exportCollectionsAsJson({ config }, { collections: ['Missing'] })
  );

  t.is(error?.message, 'Cannot export unknown collection: Missing');
});

test('reuses validation diagnostics before exporting JSON', async (t) => {
  const config = initializeConfig({
    source: filesystem(),
    transformer: markdownTransformer(),
    content: [
      {
        path: 'packages/core/src/providers/test/fixtures/id-semantics-duplicates/authors',
        collection: 'Author',
      },
    ],
  });

  const error = await t.throwsAsync(() =>
    exportCollectionsAsJson({ config }, { collections: ['Author'] })
  );

  t.regex(error?.message ?? '', /Author record id "123" is duplicated/);
});
