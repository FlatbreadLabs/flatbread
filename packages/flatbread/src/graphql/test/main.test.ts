import test from 'ava';
import { filesystem, markdownTransforer } from 'flatbread';
import initFlatbread from '../main.js';

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
