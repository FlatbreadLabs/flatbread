import test from 'ava';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { effortGraphContent } from '@flatbread/effort-graph';
import type {
  ContentEntry,
  LiveSchemaReloader,
  SchemaSnapshot,
} from '@flatbread/core';
import { createEffortGraphComposition } from './effortGraphComposition.js';

function fakeReloader(): LiveSchemaReloader {
  let generation = 0;
  return {
    get generation() {
      return generation;
    },
    getSnapshot: () => ({} as SchemaSnapshot),
    notifyChanged: async () => ({
      status: 'committed',
      generation: ++generation,
    }),
    replaceConfig: async () => ({
      status: 'committed',
      generation: ++generation,
    }),
    waitForGeneration: async () => ({} as SchemaSnapshot),
    subscribe: () => () => {},
  };
}

test.serial(
  'activates for the complete effortGraphContent preset',
  async (t) => {
    const cwd = await mkdtemp(join(tmpdir(), 'eg-composition-'));
    t.teardown(() => rm(cwd, { recursive: true, force: true }));
    const content = [
      ...effortGraphContent(),
      { collection: 'Other', path: 'other' },
    ];
    const composition = createEffortGraphComposition(content, { cwd });
    t.truthy(composition);
    t.is(composition!.rootDir, join(cwd, '.flatbread-efforts'));
    t.truthy(composition!.barrier);
    const bridge = await composition!.attach(fakeReloader());
    t.is(bridge.rootDir, composition!.rootDir);
    t.truthy(bridge.writer);
    await bridge.writer.mutate({ type: 'CreateEffort', title: 'E', body: '' });
    t.pass();
  }
);

test.serial('stays inert for ordinary and lookalike content', (t) => {
  t.is(
    createEffortGraphComposition([{ collection: 'Post', path: 'posts' }], {
      cwd: '/tmp',
    }),
    undefined
  );
  const altered = effortGraphContent().map((entry, index) =>
    index === 2 ? { ...entry, path: `${entry.path}-altered` } : entry
  );
  t.is(
    createEffortGraphComposition(altered as ContentEntry[], { cwd: '/tmp' }),
    undefined
  );
});
