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
        path: 'examples/content/markdown/authors',
        collection: 'Author',
        refs: {
          friend: 'Author',
        },
      },
    ],
  });
}

function idSemanticsProject(
  path = 'packages/core/src/providers/test/fixtures/id-semantics'
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
        path: `${path}/posts`,
        collection: 'Post',
        refs: {
          author: 'Author',
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

test('normalizes numeric record IDs and string query args', async (t) => {
  const flatbread = idSemanticsProject();

  const result = await flatbread.query({
    source: `
    query NumericAuthor {
      Author(id: "123") {
        id
        name
      }
    }
  `,
  });

  t.deepEqual(result.data, {
    Author: {
      id: 123,
      name: 'Numeric Author',
    },
  });
});

test('accepts GraphQL ID integer literals for numeric record IDs', async (t) => {
  const flatbread = idSemanticsProject();

  const result = await flatbread.query({
    source: `
    query NumericAuthorIntegerLiteral {
      Author(id: 123) {
        id
        name
      }
    }
  `,
  });

  t.deepEqual(result.data, {
    Author: {
      id: 123,
      name: 'Numeric Author',
    },
  });
});

test('normalizes numeric relation targets when resolving refs', async (t) => {
  const flatbread = idSemanticsProject();

  const result = await flatbread.query({
    source: `
    query NumericAuthorRelation {
      allPosts {
        id
        title
        author {
          id
          name
        }
      }
    }
  `,
  });

  t.deepEqual(result.data, {
    allPosts: [
      {
        id: 'numeric-author-post',
        title: 'Numeric Author Post',
        author: {
          id: 123,
          name: 'Numeric Author',
        },
      },
    ],
  });
});

test('normalizes ID filter values against numeric record IDs', async (t) => {
  const flatbread = idSemanticsProject();

  const result = await flatbread.query({
    source: `
    query NumericAuthorFilter {
      allAuthors(filter: {id: {eq: "123"}}) {
        id
        name
      }
    }
  `,
  });

  t.deepEqual(result.data, {
    allAuthors: [
      {
        id: 123,
        name: 'Numeric Author',
      },
    ],
  });
});

test('rejects invalid record IDs before schema use', async (t) => {
  const flatbread = idSemanticsProject(
    'packages/core/src/providers/test/fixtures/id-semantics-invalid'
  );

  const error = await t.throwsAsync(() =>
    flatbread.query({
      source: `
      query InvalidId {
        allAuthors {
          id
        }
      }
    `,
    })
  );

  t.regex(error?.message ?? '', /Flatbread found 2 invalid record IDs/);
  t.regex(error?.message ?? '', /empty-id\.md/);
  t.regex(error?.message ?? '', /boolean-id\.md/);
});

test('rejects duplicate normalized record IDs before schema use', async (t) => {
  const flatbread = idSemanticsProject(
    'packages/core/src/providers/test/fixtures/id-semantics-duplicates'
  );

  const error = await t.throwsAsync(() =>
    flatbread.query({
      source: `
      query DuplicateId {
        allAuthors {
          id
        }
      }
    `,
    })
  );

  t.regex(error?.message ?? '', /Author record id "123" is duplicated/);
  t.regex(error?.message ?? '', /numeric\.md/);
  t.regex(error?.message ?? '', /string\.md/);
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
