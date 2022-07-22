import test from 'ava';
import filesystem from '@flatbread/source-filesystem';
import markdownTransforer from '@flatbread/transformer-markdown';
import { FlatbreadProvider } from '../base';

test('basic query', async (t) => {
  console.log(process.cwd());
  const flatbread = new FlatbreadProvider({
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
