import test from 'ava';
import { resolve } from 'node:path';
import type {
  WatchAdapterGeneration,
  WatchContentChange,
  WatchCoordinator,
  WatchCoordinatorResult,
  WatchScheduler,
  WatchTimer,
} from '../coordinator';
import { createWatchCoordinator } from '../coordinator';
import type { LoadedFlatbreadConfig } from '../../types';

const cwd = process.cwd();
const contentPath = resolve('watch/content/post.md');
const secondContentPath = resolve('watch/content/other.md');

function config(
  documents: string[] = ['src/**/*.graphql']
): LoadedFlatbreadConfig {
  return {
    source: { fetch: async () => ({}) },
    transformer: [],
    content: [{ path: 'watch/content', collection: 'Post' }],
    fieldNameTransform: (field) => field,
    loaded: { extensions: ['md'] },
    codegen: { documents },
  };
}

class ManualScheduler implements WatchScheduler {
  callbacks: Array<{ callback: () => void; cancelled: boolean }> = [];
  schedule(_delayMs: number, callback: () => void): WatchTimer {
    const entry = { callback, cancelled: false };
    this.callbacks.push(entry);
    return { cancel: () => (entry.cancelled = true) };
  }
  fire() {
    const entries = this.callbacks.splice(0);
    for (const entry of entries) if (!entry.cancelled) entry.callback();
  }
}

function deferred<T>() {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => (resolvePromise = resolve));
  return { promise, resolve: resolvePromise };
}

function make(
  overrides: Partial<Parameters<typeof createWatchCoordinator>[0]> = {}
): {
  coordinator: WatchCoordinator;
  scheduler: ManualScheduler;
  calls: string[];
  results: WatchCoordinatorResult[];
} {
  const scheduler = new ManualScheduler();
  const calls: string[] = [];
  const results: WatchCoordinatorResult[] = [];
  const coordinator = createWatchCoordinator({
    config: config(),
    scheduler,
    documentPatterns: (cfg) => cfg.codegen?.documents ?? [],
    loadConfig: async () => config(),
    applyConfig: async () => ({ status: 'committed', generation: 1 }),
    reindexContent: async (changes) => {
      calls.push(`reindex:${changes.map((change) => change.type).join(',')}`);
      return { status: 'committed', generation: 1 };
    },
    refreshCodegen: async ({ reason }) => {
      calls.push(`codegen:${reason}`);
    },
    ...overrides,
  });
  coordinator.subscribe((result) => results.push(result));
  return { coordinator, scheduler, calls, results };
}

test.serial(
  'classifies config, content collection/captures, documents, and unmatched paths',
  async (t) => {
    const calls: string[] = [];
    const { coordinator, results } = make({
      config: {
        ...config(),
        content: [{ path: 'watch/[section]/post.md', collection: 'Section' }],
      },
      reindexContent: async (changes) => {
        calls.push(
          `${changes[0].collection}:${changes[0].captures.section}:${changes[0].type}`
        );
        return { status: 'committed' };
      },
      refreshCodegen: async ({ reason }) => {
        calls.push(reason);
      },
      loadConfig: async () => ({
        ...config(),
        content: [{ path: 'watch/[section]/post.md', collection: 'Section' }],
      }),
    });
    coordinator.push([
      { path: 'flatbread.config.ts', type: 'update' },
      { path: 'watch/news/post.md', type: 'update' },
      { path: 'src/queries/a.graphql', type: 'update' },
      { path: 'ignored.txt', type: 'update' },
    ]);
    await coordinator.flush();
    t.deepEqual(calls, [
      'config',
      'Section:news:update',
      'content',
      'documents',
    ]);
    t.deepEqual(
      results.map(({ kind, status }) => `${kind}:${status}`),
      [
        'config:committed',
        'codegen:committed',
        'content:committed',
        'codegen:committed',
        'documents:committed',
      ]
    );
  }
);

test.serial(
  'coalesces multiple content events into one reindex and lets delete win over recreate',
  async (t) => {
    const { coordinator, calls } = make();
    coordinator.push([
      { path: contentPath, type: 'update' },
      { path: contentPath, type: 'update' },
      { path: contentPath, type: 'delete' },
      { path: contentPath, type: 'create' },
    ]);
    await coordinator.flush();
    t.deepEqual(calls, ['reindex:delete', 'codegen:content']);
  }
);

test.serial(
  'reloads config before classifying remaining paths and recompiles document matchers',
  async (t) => {
    const newConfig = {
      ...config(['new/*.graphql']),
      content: [{ path: 'new/content', collection: 'New' }],
    };
    const order: string[] = [];
    const { coordinator } = make({
      loadConfig: async () => {
        order.push('load');
        return newConfig;
      },
      applyConfig: async () => {
        order.push('apply');
        return { status: 'committed' };
      },
      reindexContent: async (changes) => {
        order.push(`reindex:${changes[0].collection}`);
        return { status: 'committed' };
      },
      refreshCodegen: async ({ reason }) => {
        order.push(`codegen:${reason}`);
      },
      config: {
        ...config(['old/**/*.graphql']),
        content: [{ path: 'old', collection: 'Old' }],
      },
    });
    coordinator.push([
      { path: 'flatbread.config.ts', type: 'update' },
      { path: 'new/content/post.md', type: 'update' },
      { path: 'new/query.graphql', type: 'update' },
    ]);
    await coordinator.flush();
    t.deepEqual(order, [
      'load',
      'apply',
      'codegen:config',
      'reindex:New',
      'codegen:content',
      'codegen:documents',
    ]);
  }
);

test.serial(
  'queues events received during an in-flight live-style reindex for the next batch',
  async (t) => {
    const gate = deferred<void>();
    const calls: string[] = [];
    const { coordinator } = make({
      reindexContent: async (changes) => {
        calls.push(changes[0].path);
        if (calls.length === 1) await gate.promise;
        return { status: 'committed' };
      },
      refreshCodegen: async () => {},
    });
    coordinator.push([{ path: contentPath, type: 'update' }]);
    const first = coordinator.flush();
    await Promise.resolve();
    coordinator.push([{ path: secondContentPath, type: 'update' }]);
    gate.resolve();
    await first;
    await coordinator.drain();
    t.deepEqual(calls, [contentPath, secondContentPath]);
  }
);

test.serial(
  'queues events received during an in-flight codegen-style rebuild for the next batch',
  async (t) => {
    const gate = deferred<void>();
    let refreshes = 0;
    const { coordinator } = make({
      reindexContent: async () => ({ status: 'committed' }),
      refreshCodegen: async () => {
        refreshes++;
        if (refreshes === 1) await gate.promise;
      },
    });
    coordinator.push([{ path: contentPath, type: 'update' }]);
    const first = coordinator.flush();
    await Promise.resolve();
    coordinator.push([{ path: secondContentPath, type: 'update' }]);
    gate.resolve();
    await first;
    await coordinator.drain();
    t.is(refreshes, 2);
  }
);

test.serial(
  'recovers after rejected content generation and processes the next batch',
  async (t) => {
    let count = 0;
    const { coordinator, results, calls } = make({
      reindexContent: async () => {
        count++;
        return count === 1
          ? ({
              status: 'rejected',
              error: new Error('bad'),
            } as WatchAdapterGeneration)
          : ({ status: 'committed', generation: 2 } as WatchAdapterGeneration);
      },
    });
    coordinator.push([{ path: contentPath, type: 'update' }]);
    await coordinator.flush();
    coordinator.push([{ path: secondContentPath, type: 'update' }]);
    await coordinator.flush();
    t.is(
      results.filter(
        (result) => result.kind === 'content' && result.status === 'rejected'
      ).length,
      1
    );
    t.deepEqual(calls, ['codegen:content']);
  }
);

test.serial(
  'schedules codegen after committed content and documents without reindex',
  async (t) => {
    const { coordinator, calls } = make();
    coordinator.push([{ path: contentPath, type: 'update' }]);
    await coordinator.flush();
    coordinator.push([{ path: 'src/queries/query.graphql', type: 'update' }]);
    await coordinator.flush();
    t.deepEqual(calls, [
      'reindex:update',
      'codegen:content',
      'codegen:documents',
    ]);
  }
);

test.serial(
  'does not schedule codegen after a rejected config replacement',
  async (t) => {
    const { coordinator, results, calls } = make({
      applyConfig: async () => ({
        status: 'rejected',
        error: new Error('invalid'),
      }),
    });
    coordinator.push([{ path: 'flatbread.config.ts', type: 'update' }]);
    await coordinator.flush();
    t.false(calls.includes('codegen:config'));
    t.is(
      results.find((result) => result.kind === 'config')?.status,
      'rejected'
    );
    coordinator.push([{ path: 'src/queries/query.graphql', type: 'update' }]);
    await coordinator.flush();
    t.true(calls.includes('codegen:documents'));
  }
);

test.serial(
  'reports codegen rejection without stopping the next batch',
  async (t) => {
    let count = 0;
    const { coordinator, results } = make({
      refreshCodegen: async () => {
        count++;
        if (count === 1) throw new Error('codegen');
      },
    });
    coordinator.push([{ path: contentPath, type: 'update' }]);
    await coordinator.flush();
    coordinator.push([{ path: secondContentPath, type: 'update' }]);
    await coordinator.flush();
    t.is(
      results.filter(
        (result) => result.kind === 'codegen' && result.status === 'rejected'
      ).length,
      1
    );
    t.is(
      results.filter(
        (result) => result.kind === 'content' && result.status === 'committed'
      ).length,
      2
    );
  }
);

test.serial(
  'flush and dispose control deterministic scheduler lifecycle',
  async (t) => {
    const scheduler = new ManualScheduler();
    const gate = deferred<void>();
    const { coordinator } = make({
      scheduler,
      reindexContent: async () => {
        await gate.promise;
        return { status: 'committed' };
      },
    });
    coordinator.push([{ path: contentPath, type: 'update' }]);
    t.is(scheduler.callbacks.length, 1);
    const running = coordinator.flush();
    coordinator.push([{ path: secondContentPath, type: 'update' }]);
    const disposed = coordinator.dispose();
    gate.resolve();
    await Promise.all([running, disposed]);
    t.is(scheduler.callbacks.filter((entry) => !entry.cancelled).length, 0);
    t.pass();
  }
);

test.serial(
  'flush while idle does not latch and skip a later debounce window',
  async (t) => {
    const scheduler = new ManualScheduler();
    const gate = deferred<void>();
    const reindexed: string[] = [];
    let blockFirst = true;
    const { coordinator } = make({
      scheduler,
      reindexContent: async (changes) => {
        reindexed.push(changes[0].path);
        if (blockFirst) {
          blockFirst = false;
          await gate.promise;
        }
        return { status: 'committed' };
      },
      refreshCodegen: async () => {},
    });

    // Idle flush: nothing pending, nothing in flight; must be a no-op that
    // does not latch the skip-debounce intent.
    await coordinator.flush();
    t.is(scheduler.callbacks.length, 0);

    // A later unrelated push must still get its debounce timer.
    coordinator.push([{ path: contentPath, type: 'update' }]);
    t.is(scheduler.callbacks.length, 1);
    t.deepEqual(reindexed, [], 'batch must not run before the timer fires');
    scheduler.fire();

    // First build is now in flight and blocked; queue a follow-on event.
    coordinator.push([{ path: secondContentPath, type: 'update' }]);
    gate.resolve();

    // Let the first batch settle (bounded microtask drain; no real timers).
    for (let i = 0; i < 20 && scheduler.callbacks.length === 0; i++) {
      await Promise.resolve();
    }

    // The follow-on batch must receive its own debounce window instead of
    // running immediately off a leaked forceNext.
    t.is(scheduler.callbacks.length, 1);
    t.deepEqual(reindexed, [contentPath]);
    scheduler.fire();
    await coordinator.drain();
    t.deepEqual(reindexed, [contentPath, secondContentPath]);
  }
);

test.serial(
  'routes a brace-expansion document pattern to the documents phase',
  async (t) => {
    const calls: string[] = [];
    const { coordinator } = make({
      documentPatterns: () => ['src/**/*.{graphql,gql}'],
      refreshCodegen: async ({ reason }) => {
        calls.push(reason);
      },
    });
    coordinator.push([{ path: 'src/queries/thing.gql', type: 'update' }]);
    await coordinator.flush();
    t.deepEqual(calls, ['documents']);
  }
);
