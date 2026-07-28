import test from 'ava';
import { mkdtemp, rm, writeFile, mkdir, rename } from 'node:fs/promises';
import { join, relative } from 'node:path';
import filesystem from '@flatbread/source-filesystem';
import markdownTransformer from '@flatbread/transformer-markdown';
import { initializeConfig } from '@flatbread/core';
import type { ConfigResult, LoadedFlatbreadConfig } from '@flatbread/core';
import { startGraphqlServer } from './liveServer';
import type { WatchSubscribe, WatchSubscribeEvent } from './liveServer';

/** Concurrent AVA fixtures under cwd; keep them out of this suite's watcher. */
const TEST_WATCH_IGNORE = [
  '**/.tmp-effort-*/**',
  '**/.tmp-explorer-*/**',
] as const;

interface Fixture {
  /** Absolute temp dir inside the repo (source-filesystem resolves content paths against cwd). */
  dir: string;
  /** Content path relative to cwd, as a flatbread config would declare it. */
  postsPath: string;
  postOne: string;
  postTwo: string;
  cleanup: () => Promise<void>;
}

const POST_ONE = (title: string) => `---
id: post-1
title: ${title}
---

Post one body.
`;

const POST_TWO = (id = 'post-2') => `---
id: ${id}
title: Second Post
---

Post two body.
`;

async function makeFixture(): Promise<Fixture> {
  // Keep the temp dir inside the repo: the filesystem source reads content
  // paths relative to process.cwd().
  const dir = await mkdtemp(join(process.cwd(), '.tmp-live-server-test-'));
  const postsDir = join(dir, 'posts');
  await mkdir(postsDir, { recursive: true });
  const postOne = join(postsDir, 'post-1.md');
  const postTwo = join(postsDir, 'post-2.md');
  await writeFile(postOne, POST_ONE('Original Title'));
  await writeFile(postTwo, POST_TWO());
  return {
    dir,
    postsPath: join(relative(process.cwd(), dir), 'posts'),
    postOne,
    postTwo,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

function makeConfig(fixture: Fixture): ConfigResult<LoadedFlatbreadConfig> {
  const config = initializeConfig({
    source: filesystem(),
    transformer: markdownTransformer(),
    content: [
      {
        path: fixture.postsPath,
        collection: 'LiveServerPost',
      },
    ],
  });
  return { config };
}

async function queryTitles(port: number): Promise<string[]> {
  const response = await fetch(`http://localhost:${port}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { allLiveServerPosts { id title } }`,
    }),
  });
  const result = (await response.json()) as {
    data?: { allLiveServerPosts: Array<{ id: string; title: string }> };
    errors?: Array<{ message: string }>;
  };
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join('\n'));
  }
  return result
    .data!.allLiveServerPosts.slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((post) => post.title);
}

test.serial(
  'watch:false keeps the startup schema until a fresh server is started',
  async (t) => {
    const fixture = await makeFixture();
    t.teardown(fixture.cleanup);

    const server = await startGraphqlServer({
      config: makeConfig(fixture),
      port: 0,
      watch: false,
    });

    try {
      t.deepEqual(await queryTitles(server.port), [
        'Original Title',
        'Second Post',
      ]);

      await writeFile(fixture.postOne, POST_ONE('Edited Title'));

      // No watcher: the running endpoint still serves the startup snapshot.
      t.deepEqual(await queryTitles(server.port), [
        'Original Title',
        'Second Post',
      ]);
      t.is(server.reloader.generation, 0);
    } finally {
      await server.close();
    }

    const freshServer = await startGraphqlServer({
      config: makeConfig(fixture),
      port: 0,
      watch: false,
    });
    try {
      t.deepEqual(await queryTitles(freshServer.port), [
        'Edited Title',
        'Second Post',
      ]);
    } finally {
      await freshServer.close();
    }
  }
);

test.serial(
  'watch:true hot-swaps an edited fixture on the same port (real filesystem watcher)',
  async (t) => {
    const fixture = await makeFixture();
    t.teardown(fixture.cleanup);

    const server = await startGraphqlServer({
      config: makeConfig(fixture),
      port: 0,
      watch: true,
      watchIgnore: TEST_WATCH_IGNORE,
    });

    try {
      t.deepEqual(await queryTitles(server.port), [
        'Original Title',
        'Second Post',
      ]);

      await writeFile(fixture.postOne, POST_ONE('Watched Title'));

      await Promise.race([
        server.reloader.waitForGeneration(1),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('watcher did not commit within 20s')),
            20_000
          )
        ),
      ]);

      t.deepEqual(await queryTitles(server.port), [
        'Watched Title',
        'Second Post',
      ]);
      t.true(server.reloader.generation >= 1);
    } finally {
      await server.close();
    }
  }
);

test.serial(
  'notifyChanged hot-swaps an edited fixture on the same port',
  async (t) => {
    const fixture = await makeFixture();
    t.teardown(fixture.cleanup);

    const server = await startGraphqlServer({
      config: makeConfig(fixture),
      port: 0,
      watch: false,
    });
    t.teardown(() => server.close());

    t.deepEqual(await queryTitles(server.port), [
      'Original Title',
      'Second Post',
    ]);

    await writeFile(fixture.postOne, POST_ONE('Swapped Title'));
    const result = await server.reloader.notifyChanged({
      paths: [fixture.postOne],
      source: 'watcher',
    });

    t.deepEqual(result, { status: 'committed', generation: 1 });
    t.deepEqual(await queryTitles(server.port), [
      'Swapped Title',
      'Second Post',
    ]);
  }
);

test.serial(
  'invalid watched edit keeps the old response and generation',
  async (t) => {
    const fixture = await makeFixture();
    t.teardown(fixture.cleanup);

    const server = await startGraphqlServer({
      config: makeConfig(fixture),
      port: 0,
      watch: false,
    });
    t.teardown(() => server.close());

    t.deepEqual(await queryTitles(server.port), [
      'Original Title',
      'Second Post',
    ]);

    // Duplicate the first post's id: the candidate graph must be rejected.
    await writeFile(fixture.postTwo, POST_TWO('post-1'));
    const result = await server.reloader.notifyChanged({
      paths: [fixture.postTwo],
      source: 'watcher',
    });

    t.is(result.status, 'rejected');
    if (result.status === 'rejected') {
      t.regex(result.error.message, /duplicated/);
    }
    t.is(server.reloader.generation, 0);
    t.deepEqual(await queryTitles(server.port), [
      'Original Title',
      'Second Post',
    ]);
  }
);

test.serial(
  'watched deletion of an unreferenced record updates the list result',
  async (t) => {
    const fixture = await makeFixture();
    t.teardown(fixture.cleanup);

    const server = await startGraphqlServer({
      config: makeConfig(fixture),
      port: 0,
      watch: false,
    });
    t.teardown(() => server.close());

    t.deepEqual(await queryTitles(server.port), [
      'Original Title',
      'Second Post',
    ]);

    await rm(fixture.postTwo);
    const result = await server.reloader.notifyChanged({
      paths: [fixture.postTwo],
      source: 'watcher',
    });

    t.deepEqual(result, { status: 'committed', generation: 1 });
    t.deepEqual(await queryTitles(server.port), ['Original Title']);
  }
);

test.serial(
  'rename coalesced into one batch keeps the record on the same endpoint',
  async (t) => {
    const fixture = await makeFixture();
    t.teardown(fixture.cleanup);

    const server = await startGraphqlServer({
      config: makeConfig(fixture),
      port: 0,
      watch: false,
    });
    t.teardown(() => server.close());

    const renamedPath = join(fixture.dir, 'posts', 'post-2-renamed.md');
    await rename(fixture.postTwo, renamedPath);
    const result = await server.reloader.notifyChanged({
      paths: [fixture.postTwo, renamedPath],
      source: 'watcher',
    });

    t.deepEqual(result, { status: 'committed', generation: 1 });
    t.deepEqual(await queryTitles(server.port), [
      'Original Title',
      'Second Post',
    ]);
  }
);

test.serial(
  'concurrent queries during a swap always see a complete old or new generation',
  async (t) => {
    const fixture = await makeFixture();
    t.teardown(fixture.cleanup);

    const server = await startGraphqlServer({
      config: makeConfig(fixture),
      port: 0,
      watch: false,
    });
    t.teardown(() => server.close());

    await writeFile(fixture.postOne, POST_ONE('After Swap Title'));
    const pendingChange = server.reloader.notifyChanged({
      paths: [fixture.postOne],
      source: 'watcher',
    });

    // Race queries against the in-progress swap. Every response must be a
    // complete generation (old or new titles), never an error or a torn read.
    const inFlight = Array.from({ length: 8 }, () => queryTitles(server.port));
    const responses = await Promise.all(inFlight);
    for (const titles of responses) {
      t.true(
        (titles[0] === 'Original Title' || titles[0] === 'After Swap Title') &&
          titles[1] === 'Second Post',
        `unexpected response during swap: ${JSON.stringify(titles)}`
      );
    }

    const result = await pendingChange;
    t.deepEqual(result, { status: 'committed', generation: 1 });
    t.deepEqual(await queryTitles(server.port), [
      'After Swap Title',
      'Second Post',
    ]);
  }
);

type WatchCallback = (
  error: Error | null,
  events: WatchSubscribeEvent[]
) => unknown;

function captureWatcherSubscribe(): {
  subscribe: WatchSubscribe;
  getCallback: () => WatchCallback;
} {
  let callback: WatchCallback | undefined;
  const subscribe: WatchSubscribe = async (_dir, cb) => {
    callback = cb;
    return { unsubscribe: async () => undefined };
  };
  return {
    subscribe,
    getCallback: () => {
      if (!callback) throw new Error('watcher subscribe was never called');
      return callback;
    },
  };
}

test.serial(
  'watcher callback error keeps the server alive and answering queries',
  async (t) => {
    const fixture = await makeFixture();
    t.teardown(fixture.cleanup);
    const stub = captureWatcherSubscribe();

    const server = await startGraphqlServer({
      config: makeConfig(fixture),
      port: 0,
      watch: true,
      watchIgnore: TEST_WATCH_IGNORE,
      watcherSubscribe: stub.subscribe,
    });

    try {
      t.notThrows(() =>
        stub.getCallback()(new Error('inotify_add_watch race'), [])
      );
      t.deepEqual(await queryTitles(server.port), [
        'Original Title',
        'Second Post',
      ]);
      t.is(server.reloader.generation, 0);
    } finally {
      await server.close();
    }
  }
);

test.serial(
  'watcher push failure is logged and the server keeps serving',
  async (t) => {
    const fixture = await makeFixture();
    t.teardown(fixture.cleanup);
    const stub = captureWatcherSubscribe();
    const errors: unknown[][] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    t.teardown(() => {
      console.error = originalError;
    });

    const server = await startGraphqlServer({
      config: makeConfig(fixture),
      port: 0,
      watch: true,
      watchIgnore: TEST_WATCH_IGNORE,
      watcherSubscribe: stub.subscribe,
    });

    try {
      const badEvents = {
        map(): never {
          throw new Error('synthetic push boom');
        },
      } as unknown as WatchSubscribeEvent[];

      t.notThrows(() => stub.getCallback()(null, badEvents));
      t.true(
        errors.some(
          (args) =>
            typeof args[0] === 'string' &&
            args[0].includes('Flatbread watcher push failed:')
        ),
        `expected push failure log, got: ${JSON.stringify(errors)}`
      );
      t.deepEqual(await queryTitles(server.port), [
        'Original Title',
        'Second Post',
      ]);
    } finally {
      await server.close();
    }
  }
);

test.serial(
  'stubbed watcher update reaches the reindex path on the same port',
  async (t) => {
    const fixture = await makeFixture();
    t.teardown(fixture.cleanup);
    const stub = captureWatcherSubscribe();

    const server = await startGraphqlServer({
      config: makeConfig(fixture),
      port: 0,
      watch: true,
      watchIgnore: TEST_WATCH_IGNORE,
      watcherSubscribe: stub.subscribe,
    });

    try {
      t.deepEqual(await queryTitles(server.port), [
        'Original Title',
        'Second Post',
      ]);

      await writeFile(fixture.postOne, POST_ONE('Stubbed Watch Title'));
      stub.getCallback()(null, [{ path: fixture.postOne, type: 'update' }]);

      await Promise.race([
        server.reloader.waitForGeneration(1),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('stubbed watcher did not commit within 5s')),
            5_000
          )
        ),
      ]);

      t.deepEqual(await queryTitles(server.port), [
        'Stubbed Watch Title',
        'Second Post',
      ]);
      t.true(server.reloader.generation >= 1);
    } finally {
      await server.close();
    }
  }
);
