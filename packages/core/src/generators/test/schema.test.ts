import test from 'ava';
import { schemaComposer } from 'graphql-compose';
import { graphql } from 'graphql';
import { VFile } from 'vfile';
import { generateSchema } from '../schema';
import { initializeConfig } from '../../utils/initializeConfig';
import type {
  EntryNode,
  LoadedFlatbreadConfig,
  Source,
  Transformer,
} from '../../types';

interface InMemoryProject {
  config: LoadedFlatbreadConfig;
  setEntries: (entries: EntryNode[]) => void;
}

function makeProject(
  collection: string,
  initialEntries: EntryNode[]
): InMemoryProject {
  let entries = initialEntries;
  const source: Source = {
    fetch: async () => ({
      [collection]: entries.map((entry, index) => {
        const file = new VFile({
          path: `virtual/${collection}/${index}.json`,
        });
        file.data.entry = entry;
        return file;
      }),
    }),
  };
  const transformer: Transformer = {
    extensions: ['.json'],
    inspect: (input) => JSON.stringify(input),
    parse: (input) => input.data.entry as EntryNode,
  };
  return {
    config: initializeConfig({
      source,
      transformer,
      content: [{ path: `virtual/${collection}`, collection }],
    }),
    setEntries: (nextEntries) => {
      entries = nextEntries;
    },
  };
}

async function querySchema(
  schema: Awaited<ReturnType<typeof generateSchema>>,
  source: string
): Promise<Record<string, unknown>> {
  const result = await graphql({ schema, source });
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join('\n'));
  }
  return result.data as Record<string, unknown>;
}

test.serial(
  'builds sequential schemas on isolated composers with independent data',
  async (t) => {
    const first = makeProject('IsolatedAuthor', [
      { id: 'author', name: 'Author A' },
    ]);
    const second = makeProject('IsolatedAuthor', [
      { id: 'author', name: 'Author B' },
    ]);

    const schemaA = await generateSchema({ config: first.config });
    const schemaB = await generateSchema({ config: second.config });

    t.deepEqual(
      (await querySchema(schemaA, `query { allIsolatedAuthors { name } }`))
        .allIsolatedAuthors,
      [{ name: 'Author A' }]
    );
    t.deepEqual(
      (await querySchema(schemaB, `query { allIsolatedAuthors { name } }`))
        .allIsolatedAuthors,
      [{ name: 'Author B' }]
    );
  }
);

test.serial(
  'rebuilds from changed content with the same config object',
  async (t) => {
    const project = makeProject('MutableAuthor', [
      { id: 'author', name: 'Value A' },
    ]);
    const schemaA = await generateSchema({ config: project.config });

    t.deepEqual(
      (await querySchema(schemaA, `query { allMutableAuthors { name } }`))
        .allMutableAuthors,
      [{ name: 'Value A' }]
    );

    project.setEntries([{ id: 'author', name: 'Value B' }]);
    const schemaB = await generateSchema({ config: project.config });

    t.not(schemaB, schemaA);
    t.deepEqual(
      (await querySchema(schemaB, `query { allMutableAuthors { name } }`))
        .allMutableAuthors,
      [{ name: 'Value B' }]
    );
  }
);

test.serial(
  'isolates nested object types between sequential builds',
  async (t) => {
    const project = makeProject('NestedAuthor', [
      { id: 'author', meta: { a: 1 } },
    ]);
    const schemaA = await generateSchema({ config: project.config });

    project.setEntries([{ id: 'author', meta: { a: 1, b: 'x' } }]);
    const schemaB = await generateSchema({ config: project.config });

    t.deepEqual(
      await querySchema(schemaB, `query { allNestedAuthors { meta { a b } } }`),
      { allNestedAuthors: [{ meta: { a: 1, b: 'x' } }] }
    );
    const fieldsA = (
      schemaA.getType('NestedAuthor_Meta') as {
        getFields: () => Record<string, unknown>;
      }
    ).getFields();
    t.false('b' in fieldsA);
  }
);

test.serial('registers nothing on the process-global composer', async (t) => {
  const project = makeProject('IsolatedAuthorGlobal', [
    { id: 'author', meta: { value: 'local' } },
  ]);

  await generateSchema({ config: project.config });

  t.false(schemaComposer.has('IsolatedAuthorGlobal'));
  t.false(schemaComposer.has('IsolatedAuthorGlobal_Meta'));
});
