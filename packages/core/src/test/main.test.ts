import test from 'ava';
import filesystem from '@flatbread/source-filesystem';
import  markdownTransforer from '@flatbread/transformer-markdown';
import initFlatbread from '../main';

test('basic query', async (t) => {
  console.log(process.cwd());
  const flatbread = await initFlatbread({
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

  const result = await flatbread({
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
