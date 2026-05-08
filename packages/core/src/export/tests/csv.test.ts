import test from 'ava';
import filesystem from '@flatbread/source-filesystem';
import markdownTransformer from '@flatbread/transformer-markdown';
import { exportCollectionsAsCsv } from '../csv';
import { initializeConfig } from '../../utils/initializeConfig';

test('exports selected collections as flat CSV with relation IDs', async (t) => {
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

  const result = await exportCollectionsAsCsv(
    { config },
    { collections: ['Post'] }
  );

  t.deepEqual(Object.keys(result), ['Post']);
  t.is(
    result.Post,
    [
      'id,_filename,_path,_slug,author,authors,tags,title',
      'known-post,known-post.md,packages/core/src/providers/test/fixtures/missing-refs-clean/posts/known-post.md,known-post,known-author,known-author,known-tag,Post With Resolved Refs',
      '',
    ].join('\n')
  );
});

test('escapes CSV cells with delimiters, quotes, and newlines', async (t) => {
  const config = initializeConfig({
    source: {
      fetch: async () => ({
        Quote: [
          {
            basename: 'quote.md',
            extname: '.md',
            path: `${process.cwd()}/quote.md`,
            value: 'ignored',
          },
        ] as never,
      }),
    },
    transformer: [
      {
        extensions: ['.md'],
        inspect: () => 'quote',
        parse: () => ({
          id: 'quote',
          title: 'Comma, "quote"\nand newline',
        }),
      },
    ],
    content: [
      {
        path: 'virtual/quotes',
        collection: 'Quote',
      },
    ],
  });

  const result = await exportCollectionsAsCsv(
    { config },
    { collections: ['Quote'] }
  );

  t.is(
    result.Quote,
    'id,_filename,_path,title\nquote,quote.md,quote.md,"Comma, ""quote""\nand newline"\n'
  );
});

test('supports custom delimiters and relation separators', async (t) => {
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

  const result = await exportCollectionsAsCsv(
    { config },
    {
      collections: ['Post'],
      delimiter: '\t',
      relationSeparator: '|',
    }
  );

  t.true(result.Post.startsWith('id\t_filename\t_path\t_slug'));
  t.true(result.Post.includes('\tknown-author\tknown-author\tknown-tag\t'));
});
