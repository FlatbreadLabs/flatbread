import test from 'ava';
import filesystem from '@flatbread/source-filesystem';
import markdownTransformer from '@flatbread/transformer-markdown';
import { FlatbreadProvider } from '../base';

function missingRefsProject(
  path = 'packages/core/src/providers/test/fixtures/missing-refs'
) {
  return new FlatbreadProvider({
    source: filesystem(),
    transformer: markdownTransformer(),
    content: [
      {
        path: `${path}/authors`,
        collection: 'Author',
      },
      {
        path: `${path}/tags`,
        collection: 'Tag',
      },
      {
        path: `${path}/posts`,
        collection: 'Post',
        refs: {
          author: 'Author',
          authors: 'Author',
          tags: 'Tag',
        },
      },
    ],
  });
}

test('rejects missing array reference targets before schema use', async (t) => {
  const flatbread = missingRefsProject();

  const error = await t.throwsAsync(() =>
    flatbread.query({
      source: `
      query MissingAuthorRef {
        allPosts {
          id
        }
      }
    `,
    })
  );

  const message = error?.message ?? '';

  t.regex(message, /Flatbread found \d+ broken reference/);
  t.regex(
    message,
    /Post\.authors\[1\][\s\S]*has-missing-author\.md[\s\S]*ghost-author[\s\S]*Author/
  );
});

test('rejects missing array reference into a Tag collection', async (t) => {
  const flatbread = missingRefsProject();

  const error = await t.throwsAsync(() =>
    flatbread.query({
      source: `
      query MissingTagRef {
        allPosts {
          id
        }
      }
    `,
    })
  );

  const message = error?.message ?? '';

  t.regex(
    message,
    /Post\.tags\[1\][\s\S]*has-missing-tag\.md[\s\S]*ghost-tag[\s\S]*Tag/
  );
});

test('rejects invalid scalar reference shape before schema use', async (t) => {
  const flatbread = missingRefsProject();

  const error = await t.throwsAsync(() =>
    flatbread.query({
      source: `
      query BadAuthorShape {
        allPosts {
          id
        }
      }
    `,
    })
  );

  const message = error?.message ?? '';

  t.regex(
    message,
    /Post\.author[\s\S]*has-bad-author-shape\.md[\s\S]*invalid reference value[\s\S]*Author/
  );
});

test('builds and queries cleanly when every reference resolves', async (t) => {
  const flatbread = missingRefsProject(
    'packages/core/src/providers/test/fixtures/missing-refs-clean'
  );

  const result = await flatbread.query({
    source: `
    query KnownPost {
      allPosts {
        id
        author {
          id
          name
        }
        authors {
          id
        }
        tags {
          id
        }
      }
    }
  `,
  });

  t.is(result.errors, undefined);
  t.deepEqual(result.data, {
    allPosts: [
      {
        id: 'known-post',
        author: {
          id: 'known-author',
          name: 'Known Author',
        },
        authors: [
          {
            id: 'known-author',
          },
        ],
        tags: [
          {
            id: 'known-tag',
          },
        ],
      },
    ],
  });
});
