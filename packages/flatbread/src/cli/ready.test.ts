import test from 'ava';
import {
  createGqlReadyHandler,
  type ChildLike,
  type ReadyHandlerDeps,
} from './ready.js';

function createFakeChild(): ChildLike & {
  emitClose(code: number | null): void;
  emitExit(code: number | null): void;
  emitError(err?: Error): void;
} {
  const closeListeners: Array<(code: number | null) => void> = [];
  const exitListeners: Array<(code: number | null) => void> = [];
  const errorListeners: Array<(err: Error) => void> = [];
  return {
    on(
      event: 'close' | 'exit' | 'error',
      listener: ((code: number | null) => void) | ((err: Error) => void)
    ) {
      if (event === 'close') {
        closeListeners.push(listener as (code: number | null) => void);
      } else if (event === 'exit') {
        exitListeners.push(listener as (code: number | null) => void);
      } else if (event === 'error') {
        errorListeners.push(listener as (err: Error) => void);
      }
      return this;
    },
    kill() {
      return undefined;
    },
    emitClose(code: number | null) {
      for (const listener of closeListeners) {
        listener(code);
      }
    },
    emitExit(code: number | null) {
      for (const listener of exitListeners) {
        listener(code);
      }
    },
    emitError(err: Error = new Error('spawn failed')) {
      for (const listener of errorListeners) {
        listener(err);
      }
    },
  };
}

function createDeps(
  overrides: Partial<ReadyHandlerDeps> & {
    spawned?: string[];
    exits?: number[];
    readyCount?: { value: number };
    errors?: string[];
  } = {}
): ReadyHandlerDeps & {
  spawned: string[];
  exits: number[];
  readyCount: { value: number };
  errors: string[];
} {
  const spawned = overrides.spawned ?? [];
  const exits = overrides.exits ?? [];
  const readyCount = overrides.readyCount ?? { value: 0 };
  const errors = overrides.errors ?? [];

  return {
    corunner: overrides.corunner ?? '',
    packageManager: overrides.packageManager ?? null,
    spawnCorunner:
      overrides.spawnCorunner ??
      ((command: string) => {
        spawned.push(command);
        return createFakeChild();
      }),
    onExit:
      overrides.onExit ??
      ((code: number) => {
        exits.push(code);
      }),
    onReady:
      overrides.onReady ??
      (() => {
        readyCount.value += 1;
      }),
    logError:
      overrides.logError ??
      ((message: string) => {
        errors.push(message);
      }),
    spawned,
    exits,
    readyCount,
    errors,
  };
}

test('server-only: onReady fires once and nothing is spawned', (t) => {
  const gql = createFakeChild();
  const deps = createDeps({ corunner: '' });
  const handle = createGqlReadyHandler(gql, deps);

  const result = handle('flatbread-gql-ready');

  t.true(result.accepted);
  t.true(result.serverOnly);
  t.is(deps.readyCount.value, 1);
  t.deepEqual(deps.spawned, []);
  t.deepEqual(deps.exits, []);
});

test('server-only: process exits with child close code 0', (t) => {
  const gql = createFakeChild();
  const deps = createDeps({ corunner: '   ' });
  const handle = createGqlReadyHandler(gql, deps);

  handle('flatbread-gql-ready');
  gql.emitClose(0);

  t.deepEqual(deps.exits, [0]);
});

test('server-only: null child close code exits with 1', (t) => {
  const gql = createFakeChild();
  const deps = createDeps({ corunner: '' });
  const handle = createGqlReadyHandler(gql, deps);

  handle('flatbread-gql-ready');
  gql.emitClose(null);

  t.deepEqual(deps.exits, [1]);
});

test('corunner: spawns with package manager and onReady still fires', (t) => {
  const gql = createFakeChild();
  const deps = createDeps({
    corunner: 'next dev',
    packageManager: 'pnpm',
  });
  const handle = createGqlReadyHandler(gql, deps);

  const result = handle('flatbread-gql-ready');

  t.true(result.accepted);
  t.false(result.serverOnly);
  t.is(deps.readyCount.value, 1);
  t.deepEqual(deps.spawned, ['pnpm']);
});

test('corunner: defaults package manager command to npm run', (t) => {
  const gql = createFakeChild();
  const deps = createDeps({
    corunner: 'next build',
    packageManager: null,
  });
  const handle = createGqlReadyHandler(gql, deps);

  handle('flatbread-gql-ready');

  t.deepEqual(deps.spawned, ['npm run']);
});

test('corunner: GraphQL child close exits parent with that code', (t) => {
  const gql = createFakeChild();
  const corunnerChild = createFakeChild();
  const deps = createDeps({
    corunner: 'next dev',
    packageManager: 'pnpm',
    spawnCorunner: () => corunnerChild,
  });
  const handle = createGqlReadyHandler(gql, deps);

  handle('flatbread-gql-ready');
  gql.emitClose(2);

  t.deepEqual(deps.exits, [2]);
});

test('corunner: corunner child close exits parent with that code', (t) => {
  const gql = createFakeChild();
  const corunnerChild = createFakeChild();
  const deps = createDeps({
    corunner: 'next dev',
    packageManager: 'pnpm',
    spawnCorunner: () => corunnerChild,
  });
  const handle = createGqlReadyHandler(gql, deps);

  handle('flatbread-gql-ready');
  corunnerChild.emitClose(0);

  t.deepEqual(deps.exits, [0]);
});

test('corunner: null close code exits with 1', (t) => {
  const gql = createFakeChild();
  const corunnerChild = createFakeChild();
  const deps = createDeps({
    corunner: 'next dev',
    packageManager: 'yarn',
    spawnCorunner: () => corunnerChild,
  });
  const handle = createGqlReadyHandler(gql, deps);

  handle('flatbread-gql-ready');
  corunnerChild.emitClose(null);

  t.deepEqual(deps.exits, [1]);
});

test('second flatbread-gql-ready does not spawn twice', (t) => {
  const gql = createFakeChild();
  const deps = createDeps({
    corunner: 'next dev',
    packageManager: 'pnpm',
  });
  const handle = createGqlReadyHandler(gql, deps);

  const first = handle('flatbread-gql-ready');
  const second = handle('flatbread-gql-ready');

  t.true(first.accepted);
  t.false(second.accepted);
  t.is(deps.readyCount.value, 1);
  t.deepEqual(deps.spawned, ['pnpm']);
});

test('ignores unrelated IPC messages', (t) => {
  const gql = createFakeChild();
  const deps = createDeps({ corunner: 'next dev', packageManager: 'pnpm' });
  const handle = createGqlReadyHandler(gql, deps);

  const result = handle('something-else');

  t.false(result.accepted);
  t.false(result.serverOnly);
  t.is(deps.readyCount.value, 0);
  t.deepEqual(deps.spawned, []);
});

test('child exit before ready exits parent with child code', (t) => {
  const gql = createFakeChild();
  const deps = createDeps({ corunner: 'next dev', packageManager: 'pnpm' });
  createGqlReadyHandler(gql, deps);

  gql.emitExit(7);

  t.deepEqual(deps.exits, [7]);
  t.is(deps.readyCount.value, 0);
  t.deepEqual(deps.spawned, []);
  t.true(
    deps.errors.some((message) =>
      message.includes('exited before ready (code 7)')
    )
  );
});

test('child exit with null code before ready exits parent with 1', (t) => {
  const gql = createFakeChild();
  const deps = createDeps({ corunner: '' });
  createGqlReadyHandler(gql, deps);

  gql.emitExit(null);

  t.deepEqual(deps.exits, [1]);
  t.is(deps.readyCount.value, 0);
  t.true(
    deps.errors.some((message) =>
      message.includes('exited before ready (code null)')
    )
  );
});

test('child exit after ready does not exit twice', (t) => {
  const gql = createFakeChild();
  const deps = createDeps({ corunner: '' });
  const handle = createGqlReadyHandler(gql, deps);

  handle('flatbread-gql-ready');
  gql.emitExit(3);
  gql.emitClose(0);

  t.deepEqual(deps.exits, [0]);
  t.deepEqual(deps.errors, []);
});

test('child error before ready exits parent with 1', (t) => {
  const gql = createFakeChild();
  const deps = createDeps({ corunner: 'next dev', packageManager: 'pnpm' });
  createGqlReadyHandler(gql, deps);

  gql.emitError(new Error('spawn failed'));

  t.deepEqual(deps.exits, [1]);
  t.is(deps.readyCount.value, 0);
  t.deepEqual(deps.spawned, []);
  t.true(
    deps.errors.some((message) =>
      message.includes('exited before ready (code 1)')
    )
  );
});

test('child error after ready does not exit a second time', (t) => {
  const gql = createFakeChild();
  const deps = createDeps({ corunner: '' });
  const handle = createGqlReadyHandler(gql, deps);

  handle('flatbread-gql-ready');
  gql.emitError(new Error('late error'));
  gql.emitClose(0);

  t.deepEqual(deps.exits, [0]);
  t.deepEqual(deps.errors, []);
});
