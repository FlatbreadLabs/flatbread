import test from 'ava';
import filesystem from '@flatbread/source-filesystem';
import markdownTransforer from '@flatbread/transformer-markdown';
import { FlatbreadProvider } from '../base';

function basicProject() {
  return new FlatbreadProvider({
    source: filesystem(),
    transformer: markdownTransforer({
      markdown: {
        gfm: true,
        externalLinks: true,
      },
    }),

    content: [
      {
        path: 'packages/flatbread/content/authors',
        collection: 'Author',
        refs: {
          friend: 'Author',
        },
      },
    ],
  });
}

test('basic query', async (t) => {
  const flatbread = basicProject();

  const result = await flatbread.query({
    source: `
    query AllAuthors {
      allAuthors {
        name
        enjoys
      }
    }
  `,
  });

  t.snapshot(result);
});

test('relational filter query', async (t) => {
  const flatbread = basicProject();

  const result = await flatbread.query({
    source: `
    query AllAuthors {
      allAuthors(filter: {friend: {name: {wildcard: "Anot*"}}}) {
        name
        enjoys
      }
    }
  `,
  });

  t.snapshot(result);
});
