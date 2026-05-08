import test from 'ava';
import type { ExecutionContext } from 'ava';
import filesystem from '@flatbread/source-filesystem';
import markdownTransformer from '@flatbread/transformer-markdown';
import { FlatbreadProvider } from '../base';

function project(path: string, refs: Record<string, string> = {}) {
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
        refs,
      },
    ],
  });
}

function authorOnlyProject(path: string) {
  return new FlatbreadProvider({
    source: filesystem(),
    transformer: markdownTransformer(),
    content: [
      {
        path: `${path}/authors`,
        collection: 'Author',
      },
    ],
  });
}

async function validationMessage(
  t: ExecutionContext,
  flatbread: FlatbreadProvider
): Promise<string> {
  const error = await t.throwsAsync(() =>
    flatbread.query({
      source: `
      query ValidationSnapshot {
        allAuthors {
          id
        }
      }
    `,
    })
  );

  return normalizeMessage(error?.message ?? '');
}

function normalizeMessage(message: string): string {
  return message.replaceAll(process.cwd(), '<workspace>');
}

test('validation snapshot: missing references and invalid relation shapes', async (t) => {
  const flatbread = project(
    'packages/core/src/providers/test/fixtures/missing-refs',
    {
      author: 'Author',
      authors: 'Author',
      tags: 'Tag',
    }
  );

  t.snapshot(await validationMessage(t, flatbread));
});

test('validation snapshot: unknown target collection', async (t) => {
  const flatbread = project(
    'packages/core/src/providers/test/fixtures/missing-refs-clean',
    {
      author: 'MissingCollection',
    }
  );

  t.snapshot(await validationMessage(t, flatbread));
});

test('validation snapshot: duplicate normalized IDs', async (t) => {
  const flatbread = authorOnlyProject(
    'packages/core/src/providers/test/fixtures/id-semantics-duplicates'
  );

  t.snapshot(await validationMessage(t, flatbread));
});

test('validation snapshot: required ID field', async (t) => {
  const flatbread = authorOnlyProject(
    'packages/core/src/providers/test/fixtures/required-fields'
  );

  t.snapshot(await validationMessage(t, flatbread));
});
