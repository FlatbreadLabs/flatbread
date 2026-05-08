import test from 'ava';
import filesystem from '@flatbread/source-filesystem';
import markdownTransformer from '@flatbread/transformer-markdown';
import { VFile } from 'vfile';
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
        path: 'examples/content/markdown/authors',
        collection: 'Author',
        refs: {
          friend: 'Author',
        },
      },
    ],
  });
}

const inlineYamlTransformer = {
  extensions: ['.yml'],
  inspect: () => 'inline-yaml-test-transformer',
  parse: (input: VFile) =>
    Object.fromEntries(
      String(input.value)
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [key, rawValue] = line.split(': ');
          const numericValue = Number(rawValue);
          return [key, Number.isFinite(numericValue) ? numericValue : rawValue];
        })
    ),
};

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
      allAuthors(filter: {friend: {name: {eq: "Eva"}}}) {
        name
        enjoys
      }
    }
  `,
  });

  t.snapshot(result);
});

test('normalizes numeric content IDs for GraphQL ID args and refs', async (t) => {
  const flatbread = new FlatbreadProvider({
    source: {
      fetch: async () => ({
        Author: [
          new VFile({
            path: 'ada.yml',
            value: 'id: 1\nname: Ada\nfriend: 2',
          }),
          new VFile({
            path: 'grace.yml',
            value: 'id: 2\nname: Grace',
          }),
        ],
      }),
    },
    transformer: inlineYamlTransformer,
    content: [
      {
        collection: 'Author',
        refs: {
          friend: 'Author',
        },
      },
    ],
  });

  const result = await flatbread.query({
    source: `
    query NumericID {
      Author(id: "1") {
        id
        name
        friend {
          id
          name
        }
      }
    }
  `,
  });

  t.deepEqual(result.data, {
    Author: {
      id: 1,
      name: 'Ada',
      friend: {
        id: 2,
        name: 'Grace',
      },
    },
  });
});

test('normalizes id filters across string GraphQL input and numeric records', async (t) => {
  const flatbread = new FlatbreadProvider({
    source: {
      fetch: async () => ({
        Author: [
          new VFile({
            path: 'ada.yml',
            value: 'id: 1\nname: Ada',
          }),
          new VFile({
            path: 'grace.yml',
            value: 'id: 2\nname: Grace',
          }),
        ],
      }),
    },
    transformer: inlineYamlTransformer,
    content: [
      {
        collection: 'Author',
      },
    ],
  });

  const result = await flatbread.query({
    source: `
    query NumericIDFilter {
      allAuthors(filter: { id: { eq: "2" } }) {
        id
        name
      }
    }
  `,
  });

  t.deepEqual(result.data, {
    allAuthors: [
      {
        id: 2,
        name: 'Grace',
      },
    ],
  });
});
