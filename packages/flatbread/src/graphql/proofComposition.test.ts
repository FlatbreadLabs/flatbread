import test from 'ava';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { proofContent } from '@flatbread/proof';
import type {
  ContentEntry,
  LiveSchemaReloader,
  SchemaSnapshot,
} from '@flatbread/core';
import { createProofComposition } from './proofComposition.js';

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

test.serial('activates for the complete proofContent preset', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'eg-composition-'));
  t.teardown(() => rm(cwd, { recursive: true, force: true }));
  const content = [...proofContent(), { collection: 'Other', path: 'other' }];
  const composition = createProofComposition(content, { cwd });
  t.truthy(composition);
  t.is(composition!.rootDir, join(cwd, '.flatbread-proof'));
  t.truthy(composition!.barrier);
  const bridge = await composition!.attach(fakeReloader());
  t.is(bridge.rootDir, composition!.rootDir);
  t.truthy(bridge.writer);
  await bridge.writer.mutate({ type: 'CreateEffort', title: 'E', body: '' });
  t.pass();
});

test.serial('stays inert for ordinary and lookalike content', (t) => {
  t.is(
    createProofComposition([{ collection: 'Post', path: 'posts' }], {
      cwd: '/tmp',
    }),
    undefined
  );
  const altered = proofContent().map((entry, index) =>
    index === 2 ? { ...entry, path: `${entry.path}-altered` } : entry
  );
  t.is(
    createProofComposition(altered as ContentEntry[], { cwd: '/tmp' }),
    undefined
  );
});
