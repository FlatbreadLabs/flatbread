import test from 'ava';
import filesystem from '@flatbread/source-filesystem';
import markdownTransformer from '@flatbread/transformer-markdown';
import { FlatbreadProvider } from '../base';

function basicProject() {
  return new FlatbreadProvider({
    source: filesystem(),
    transformer: markdownTransformer({
      markdown: {
        gfm: true,
        externalLinks: true,
      },
    }),

    content: [
      {
        path: 'packages/flatbread/content/authors',
        name: 'Author',
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

// test('update collection record', async (t) => {
//   const flatbread = basicProject();
//   const sitting = (Math.random() * 100) | 0;
//   const result: any = await flatbread.query({
//     rootValue: { author: { id: '2a3e', skills: { sitting } } },
//     source: `
//       mutation UpdateAuthor($author: AuthorInput){
//         updateAuthor(Author: $author) {
//           id
//           skills {
//             sitting
//           }
//         }
//       }
//     `,
//   });

//   t.is(result.data.updateAuthor.skills.sitting, sitting);

//   const updated: any = await flatbread.query({
//     source: `
//       query  {
//         Author(id: "2a3e") {
//           id
//           skills {
//             sitting
//           }
//         }
//       }
//     `,
//   });

//   t.is(updated.data.Author.skills.sitting, sitting);
// });
