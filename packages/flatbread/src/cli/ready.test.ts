import test from 'ava';
import {
  createGqlReadyHandler,
  type ChildLike,
  type ReadyHandlerDeps,
} from './ready.js';

function createFakeChild(): ChildLike & {
  emitClose(code: number | null): void;
} {
  const closeListeners: Array<(code: number | null) => void> = [];
  return {
    on(event: 'close', listener: (code: number | null) => void) {
      if (event === 'close') {
        closeListeners.push(listener);
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
  };
}

function createDeps(
  overrides: Partial<ReadyHandlerDeps> & {
    spawned?: string[];
    exits?: number[];
    readyCount?: { value: number };
  } = {}
): ReadyHandlerDeps & {
  spawned: string[];
  exits: number[];
  readyCount: { value: number };
} {
  const spawned = overrides.spawned ?? [];
  const exits = overrides.exits ?? [];
  const readyCount = overrides.readyCount ?? { value: 0 };

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
    spawned,
    exits,
    readyCount,
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
