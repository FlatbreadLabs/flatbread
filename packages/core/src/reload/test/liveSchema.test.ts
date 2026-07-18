import test from 'ava';
import { graphql, GraphQLSchema } from 'graphql';
import { resolve } from 'node:path';
import { VFile } from 'vfile';
import { createLiveSchemaReloader } from '../liveSchema';
import { initializeConfig } from '../../utils/initializeConfig';
import type {
  EntryNode,
  LoadedFlatbreadConfig,
  SchemaSnapshot,
  Source,
  Transformer,
} from '../../types';

const AUTHORS_ROOT = 'virtual/live/authors';
const POSTS_ROOT = 'virtual/live/posts';

interface FakeProject {
  config: LoadedFlatbreadConfig;
  store: Map<string, EntryNode>;
  counters: {
    fetch: number;
    fetchPaths: string[][];
  };
  events: string[];
  path: (relative: string) => string;
}

/**
 * In-memory Source + trivial transformer so reloader tests never touch disk.
 * Entries are keyed by absolute path; a missing key doubles as a deleted file.
 */
function makeProject(initialEntries: Record<string, EntryNode>): FakeProject {
  const store = new Map<string, EntryNode>();
  for (const [relativePath, entry] of Object.entries(initialEntries)) {
    store.set(resolve(relativePath), entry);
  }
  const counters = { fetch: 0, fetchPaths: [] as string[][] };
  const events: string[] = [];

  const toFile = (absolutePath: string, entry: EntryNode): VFile => {
    const file = new VFile({ path: absolutePath });
    file.data.entry = entry;
    return file;
  };

  const source: Source = {
    fetch: async (content) => {
      counters.fetch += 1;
      events.push('fetch');
      const result: Record<string, VFile[]> = {};
      for (const contentEntry of content) {
        const root = resolve(String(contentEntry.path));
        result[String(contentEntry.collection)] = [...store.entries()]
          .filter(([path]) => path.startsWith(`${root}/`))
          .map(([path, entry]) => toFile(path, entry));
      }
      return result;
    },
    fetchPaths: async (paths) => {
      counters.fetchPaths.push([...paths]);
      events.push('fetchPaths');
      return paths
        .map((path) => resolve(path))
        .filter((path) => store.has(path))
        .map((path) => toFile(path, store.get(path)!));
    },
  };

  const transformer: Transformer = {
    extensions: ['.json'],
    inspect: (input) => JSON.stringify(input),
    parse: (input) => input.data.entry as EntryNode,
  };

  const config = initializeConfig({
    source,
    transformer,
    content: [
      { path: AUTHORS_ROOT, collection: 'LiveAuthor' },
      {
        path: POSTS_ROOT,
        collection: 'LivePost',
        refs: { author: 'LiveAuthor' },
      },
    ],
  });

  return {
    config,
    store,
    counters,
    events,
    path: (relative) => resolve(relative),
  };
}

function basicEntries(): Record<string, EntryNode> {
  return {
    [`${AUTHORS_ROOT}/a1.json`]: { id: 'a1', name: 'Original Author' },
    [`${AUTHORS_ROOT}/a2.json`]: { id: 'a2', name: 'Second Author' },
    [`${POSTS_ROOT}/p1.json`]: { id: 'p1', title: 'First Post', author: 'a1' },
  };
}

async function queryData(
  schema: GraphQLSchema,
  source: string
): Promise<Record<string, unknown>> {
  const result = await graphql({ schema, source });
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join('\n'));
  }
  return result.data as Record<string, unknown>;
}

test.serial(
  'initial build commits generation 0 and calls commitSchema',
  async (t) => {
    const project = makeProject(basicEntries());
    const commits: Array<Omit<SchemaSnapshot, 'generation'>> = [];

    const reloader = await createLiveSchemaReloader({
      config: project.config,
      commitSchema: async (candidate) => {
        commits.push(candidate);
      },
    });

    t.is(reloader.generation, 0);
    t.is(reloader.getSnapshot().generation, 0);
    t.is(commits.length, 1);
    t.is(commits[0].schema, reloader.getSnapshot().schema);
    t.is(project.counters.fetch, 1);
    t.deepEqual(project.counters.fetchPaths, []);

    const data = await queryData(
      reloader.getSnapshot().schema,
      `query { allLiveAuthors { id name } }`
    );
    t.deepEqual(data.allLiveAuthors, [
      { id: 'a1', name: 'Original Author' },
      { id: 'a2', name: 'Second Author' },
    ]);
  }
);

test.serial(
  'changed file reindexes through fetchPaths only, includes ref-affected neighbors, and advances generation 0→1 with a fresh schema',
  async (t) => {
    const project = makeProject(basicEntries());
    const reloader = await createLiveSchemaReloader({
      config: project.config,
      commitSchema: async () => {},
    });
    const initialSchema = reloader.getSnapshot().schema;
    const authorPath = project.path(`${AUTHORS_ROOT}/a1.json`);
    const postPath = project.path(`${POSTS_ROOT}/p1.json`);

    project.store.set(authorPath, { id: 'a1', name: 'Renamed Author' });
    const result = await reloader.notifyChanged({
      paths: [authorPath],
      source: 'watcher',
    });

    t.deepEqual(result, { status: 'committed', generation: 1 });
    t.is(reloader.generation, 1);
    // Full fetch ran exactly once (initial build); the reindex used fetchPaths.
    t.is(project.counters.fetch, 1);
    t.true(project.counters.fetchPaths.length >= 1);
    const requestedPaths = project.counters.fetchPaths.flat();
    t.true(requestedPaths.includes(authorPath));
    // p1 references a1, so it is a ref-affected neighbor and must be re-read.
    t.true(requestedPaths.includes(postPath));

    // useSchemaCache: false → a fresh schema object per committed generation
    // even though the config is identical.
    t.not(reloader.getSnapshot().schema, initialSchema);

    const data = await queryData(
      reloader.getSnapshot().schema,
      `query { LiveAuthor(id: "a1") { name } allLivePosts { id author { name } } }`
    );
    t.deepEqual(data.LiveAuthor, { name: 'Renamed Author' });
    t.deepEqual(data.allLivePosts, [
      { id: 'p1', author: { name: 'Renamed Author' } },
    ]);
  }
);

test.serial(
  'duplicate ID edit is rejected and preserves the prior schema and generation',
  async (t) => {
    const project = makeProject(basicEntries());
    const reloader = await createLiveSchemaReloader({
      config: project.config,
      commitSchema: async () => {},
    });
    const schemaBefore = reloader.getSnapshot().schema;

    const duplicatePath = project.path(`${AUTHORS_ROOT}/dupe.json`);
    project.store.set(duplicatePath, { id: 'a1', name: 'Duplicate of a1' });
    const result = await reloader.notifyChanged({ paths: [duplicatePath] });

    t.is(result.status, 'rejected');
    if (result.status === 'rejected') {
      t.is(result.generation, 0);
      t.regex(result.error.message, /duplicated/);
    }
    t.is(reloader.generation, 0);
    t.is(reloader.getSnapshot().schema, schemaBefore);

    const data = await queryData(
      reloader.getSnapshot().schema,
      `query { allLiveAuthors { id } }`
    );
    t.deepEqual(data.allLiveAuthors, [{ id: 'a1' }, { id: 'a2' }]);
  }
);

test.serial(
  'deleting a referenced target is rejected and keeps the prior snapshot',
  async (t) => {
    const project = makeProject(basicEntries());
    const reloader = await createLiveSchemaReloader({
      config: project.config,
      commitSchema: async () => {},
    });
    const schemaBefore = reloader.getSnapshot().schema;
    const authorPath = project.path(`${AUTHORS_ROOT}/a1.json`);

    project.store.delete(authorPath);
    const result = await reloader.notifyChanged({ paths: [authorPath] });

    t.is(result.status, 'rejected');
    if (result.status === 'rejected') {
      t.regex(result.error.message, /broken reference/);
    }
    t.is(reloader.generation, 0);
    t.is(reloader.getSnapshot().schema, schemaBefore);

    const data = await queryData(
      reloader.getSnapshot().schema,
      `query { allLiveAuthors { id } }`
    );
    t.deepEqual(data.allLiveAuthors, [{ id: 'a1' }, { id: 'a2' }]);
  }
);

test.serial('deleting an unreferenced node commits', async (t) => {
  const project = makeProject({
    ...basicEntries(),
    [`${POSTS_ROOT}/p2.json`]: {
      id: 'p2',
      title: 'Unreferenced Post',
      author: 'a2',
    },
  });
  const reloader = await createLiveSchemaReloader({
    config: project.config,
    commitSchema: async () => {},
  });
  const postPath = project.path(`${POSTS_ROOT}/p2.json`);

  project.store.delete(postPath);
  const result = await reloader.notifyChanged({ paths: [postPath] });

  t.deepEqual(result, { status: 'committed', generation: 1 });

  const data = await queryData(
    reloader.getSnapshot().schema,
    `query { allLivePosts { id } allLiveAuthors { id } }`
  );
  t.deepEqual(data.allLivePosts, [{ id: 'p1' }]);
  t.deepEqual(data.allLiveAuthors, [{ id: 'a1' }, { id: 'a2' }]);
});

test.serial('rename (unlink + add in one batch) commits', async (t) => {
  const project = makeProject(basicEntries());
  const reloader = await createLiveSchemaReloader({
    config: project.config,
    commitSchema: async () => {},
  });
  const oldPath = project.path(`${AUTHORS_ROOT}/a2.json`);
  const newPath = project.path(`${AUTHORS_ROOT}/a2-renamed.json`);
  const entry = project.store.get(oldPath)!;

  project.store.delete(oldPath);
  project.store.set(newPath, entry);
  const result = await reloader.notifyChanged({ paths: [oldPath, newPath] });

  t.deepEqual(result, { status: 'committed', generation: 1 });

  const data = await queryData(
    reloader.getSnapshot().schema,
    `query { allLiveAuthors { id name } }`
  );
  t.deepEqual(data.allLiveAuthors, [
    { id: 'a1', name: 'Original Author' },
    { id: 'a2', name: 'Second Author' },
  ]);
});

test.serial(
  'waitForGeneration(1) resolves only after commitSchema has completed',
  async (t) => {
    const project = makeProject(basicEntries());
    let releaseCommit: (() => void) | undefined;
    let commitCalls = 0;

    const reloader = await createLiveSchemaReloader({
      config: project.config,
      commitSchema: async () => {
        commitCalls += 1;
        // Initial build commits immediately; the second commit is gated so the
        // test can observe the pre-commit state.
        if (commitCalls > 1) {
          await new Promise<void>((resolveGate) => {
            releaseCommit = resolveGate;
          });
        }
      },
    });

    let waited: SchemaSnapshot | undefined;
    const waiter = reloader.waitForGeneration(1).then((snapshot) => {
      waited = snapshot;
      return snapshot;
    });

    const postPath = project.path(`${POSTS_ROOT}/p1.json`);
    project.store.set(postPath, {
      id: 'p1',
      title: 'Edited Post',
      author: 'a1',
    });
    const pendingChange = reloader.notifyChanged({ paths: [postPath] });

    // Let the reindex reach the gated commitSchema call.
    await new Promise((resolveTick) => setTimeout(resolveTick, 20));
    t.is(commitCalls, 2);
    t.is(waited, undefined, 'waiter must not resolve before commit completes');
    t.is(reloader.generation, 0);

    releaseCommit!();
    const [changeResult, snapshot] = await Promise.all([pendingChange, waiter]);
    t.deepEqual(changeResult, { status: 'committed', generation: 1 });
    t.is(snapshot.generation, 1);
    t.is(waited, snapshot);
  }
);

test.serial(
  'commitSchema throwing rejects the candidate without advancing the generation',
  async (t) => {
    const project = makeProject(basicEntries());
    let commitCalls = 0;

    const reloader = await createLiveSchemaReloader({
      config: project.config,
      commitSchema: async () => {
        commitCalls += 1;
        if (commitCalls > 1) {
          throw new Error('apollo candidate failed to start');
        }
      },
    });
    const schemaBefore = reloader.getSnapshot().schema;

    const postPath = project.path(`${POSTS_ROOT}/p1.json`);
    project.store.set(postPath, {
      id: 'p1',
      title: 'Edited Post',
      author: 'a1',
    });
    const result = await reloader.notifyChanged({ paths: [postPath] });

    t.is(result.status, 'rejected');
    if (result.status === 'rejected') {
      t.is(result.generation, 0);
      t.regex(result.error.message, /apollo candidate failed to start/);
    }
    t.is(reloader.generation, 0);
    t.is(reloader.getSnapshot().schema, schemaBefore);
  }
);

test.serial(
  'barrier.waitUntilReadable is awaited before the source is read',
  async (t) => {
    const project = makeProject(basicEntries());
    const barrierPaths: string[][] = [];

    const reloader = await createLiveSchemaReloader({
      config: project.config,
      commitSchema: async () => {},
      barrier: {
        waitUntilReadable: async (paths) => {
          barrierPaths.push([...paths]);
          project.events.push('barrier');
          // Yield so an unawaited barrier would let fetchPaths run first.
          await new Promise((resolveTick) => setTimeout(resolveTick, 10));
        },
      },
    });

    const postPath = project.path(`${POSTS_ROOT}/p1.json`);
    project.store.set(postPath, {
      id: 'p1',
      title: 'Edited Post',
      author: 'a1',
    });
    const result = await reloader.notifyChanged({ paths: [postPath] });

    t.is(result.status, 'committed');
    t.deepEqual(barrierPaths, [[postPath]]);
    const barrierIndex = project.events.indexOf('barrier');
    const firstFetchPathsIndex = project.events.indexOf('fetchPaths');
    t.true(barrierIndex >= 0);
    t.true(firstFetchPathsIndex >= 0);
    t.true(
      barrierIndex < firstFetchPathsIndex,
      'barrier must complete before fetchPaths runs'
    );
  }
);
