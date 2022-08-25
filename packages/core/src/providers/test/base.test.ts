import markdownTransformer from '@flatbread/transformer-markdown';
import test from 'ava';
import { SourceVirtual } from '../../sources/virtual';
import { FlatbreadProvider } from '../base';
import { mockData } from './mockData';
import { CollectionResolverArgs } from '../../types';

const sourceVirtual = new SourceVirtual(mockData);

function basicProject() {
  return new FlatbreadProvider({
    source: sourceVirtual,
    transformer: markdownTransformer({
      markdown: {
        gfm: true,
        externalLinks: true,
      },
    }),

    content: [
      {
        path: 'examples/content/markdown/authors',
        name: 'Author',
        refs: {
          friend: 'Author',
        },
      },
    ],
  });
}

test('create custom collection resolver', async (t) => {
  const flatbread = await new FlatbreadProvider({
    source: sourceVirtual,
    transformer: markdownTransformer({
      markdown: {
        gfm: true,
        externalLinks: true,
      },
    }),

    collectionResolvers: [
      function fakeResolver(schemaComposer, args) {
        const { name } = args;

        schemaComposer.Query.addFields({
          [`fake${name}`]: {
            type: 'String',
            description: `fake resolver`,
            resolve() {
              return `fake ${name}!`;
            },
          },
        });
      },
    ],

    content: [
      {
        path: 'examples/content/markdown/authors',
        name: 'Author',
        refs: {
          friend: 'Author',
        },
      },
    ],
  });

  const result: any = await flatbread.query({ source: `{ fakeAuthor }` });
  t.is(result.data.fakeAuthor, 'fake Author!');
});

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
      allAuthors(filter: {friend: {name: {wildcard: "Ev*"}}}) {
        name
        enjoys
      }
    }
  `,
  });

  t.snapshot(result);
});

test('update collection record', async (t) => {
  const flatbread = basicProject();
  const sitting = (Math.random() * 100) | 0;
  const result: any = await flatbread.query({
    variableValues: { author: { id: '2a3e', skills: { sitting } } },
    source: `
      mutation UpdateAuthor($author: AuthorInput){
        updateAuthor(Author: $author) {
          id
          skills {
            sitting
          }
        }
      }
    `,
  });

  t.is(result.data.updateAuthor.skills.sitting, sitting);

  const updated: any = await flatbread.query({
    source: `
      query  {
        Author(id: "2a3e") {
          id
          skills {
            sitting
          }
        }
      }
    `,
  });

  t.is(updated.data.Author.skills.sitting, sitting);
});

test('create collection record', async (t) => {
  const flatbread = basicProject();
  const sitting = 69;
  const result: any = await flatbread.query({
    variableValues: { test: { skills: { sitting } } },
    source: `
      mutation CreateAuthor($test: AuthorInput){
        createAuthor(Author: $test) {
          id
          skills {
            sitting
          }
        }
      }
    `,
  });

  t.is(result.data.createAuthor.skills.sitting, sitting);

  const updated: any = await flatbread.query({
    variableValues: { id: result.data.createAuthor.id },
    source: `
      query QueryAuthor($id: String)  {
        Author(id: $id) {
          id
          skills {
            sitting
          }
        }
      }
    `,
  });

  t.is(updated.data.Author.skills.sitting, sitting);
});

test('prevents creating record with duplicate reference', async (t) => {
  const flatbread = basicProject();

  const result = await flatbread.query({
    variableValues: { test: { id: '2a3e' } },
    source: `
      mutation CreateAuthor($test: AuthorInput){
        createAuthor(Author: $test) {
          id
          skills {
            sitting
          }
        }
      }
    `,
  });

  t.snapshot(result.errors);
});
