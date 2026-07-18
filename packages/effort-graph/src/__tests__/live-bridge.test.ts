import test from 'ava';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEffortGraphLiveBridge } from '../live.js';
import {
  EffortGraphGenerationWaitTimeoutError,
  EffortGraphReindexFailedError,
} from '../errors.js';
import type { LiveSchemaReloader, SchemaSnapshot } from '@flatbread/core';

function fakeReloader(): {
  reloader: LiveSchemaReloader;
  release: () => void;
  calls: Array<{ paths: readonly string[]; source?: string }>;
  reject: { value: boolean };
} {
  let generation = 0;
  let snapshot = {} as SchemaSnapshot;
  let releaseGate: (() => void) | undefined;
  const calls: Array<{ paths: readonly string[]; source?: string }> = [];
  const reject = { value: false };
  const reloader = {
    get generation() {
      return generation;
    },
    getSnapshot: () => snapshot,
    notifyChanged: async (change: {
      paths: readonly string[];
      source?: 'writer';
    }) => {
      calls.push(change);
      if (releaseGate)
        await new Promise<void>(
          (resolve) =>
            (releaseGate = () => {
              releaseGate = undefined;
              resolve();
            })
        );
      if (reject.value)
        return {
          status: 'rejected' as const,
          generation,
          error: new Error('candidate rejected'),
        };
      generation += 1;
      snapshot = { ...snapshot, generation };
      return { status: 'committed' as const, generation };
    },
    replaceConfig: async () => {
      generation += 1;
      snapshot = { ...snapshot, generation };
      return { status: 'committed' as const, generation };
    },
    waitForGeneration: async () => snapshot,
  } as LiveSchemaReloader;
  return {
    reloader,
    release: () => releaseGate?.(),
    calls,
    reject,
  };
}

async function makeBridge() {
  const root = await mkdtemp(join(tmpdir(), 'eg-live-'));
  const fake = fakeReloader();
  const bridge = await createEffortGraphLiveBridge({
    rootDir: root,
    reloader: fake.reloader,
  });
  return { root, bridge, fake };
}

test.serial('no journal publish before the live reindex commits', async (t) => {
  const { root, bridge, fake } = await makeBridge();
  let release!: () => void;
  const pendingGate = new Promise<void>((resolve) => (release = resolve));
  fake.reloader.notifyChanged = async (change) => {
    fake.calls.push(change);
    await pendingGate;
    return { status: 'committed', generation: 1 };
  };
  const pending = bridge.writer.mutate({
    type: 'CreateEffort',
    title: 'E',
    body: '',
  });
  let txns: string[] = [];
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    txns = await readdir(join(root, '.journal', 'txns')).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return [];
        throw error;
      }
    );
    if (
      txns[0] &&
      (await readFile(join(root, '.journal', 'txns', txns[0], 'committed'))
        .then(() => true)
        .catch(() => false))
    )
      break;
  }
  t.true(txns.length === 1);
  t.true(
    await readFile(join(root, '.journal', 'txns', txns[0], 'committed')).then(
      () => true
    )
  );
  t.false(
    await readFile(join(root, '.journal', 'generation.json'))
      .then(() => true)
      .catch(() => false)
  );
  release();
  await pending;
  t.deepEqual(fake.calls[0].source, 'writer');
  t.true(fake.calls[0].paths[0].startsWith(root));
  t.is(
    JSON.parse(
      await readFile(join(root, '.journal', 'generation.json'), 'utf8')
    ).generation,
    1
  );
});

test.serial(
  'rejected live schema leaves the generation unpublished and recover() publishes after a later commit',
  async (t) => {
    const { root, bridge, fake } = await makeBridge();
    fake.reject.value = true;
    await t.throwsAsync(
      bridge.writer.mutate({ type: 'CreateEffort', title: 'E', body: '' }),
      { instanceOf: EffortGraphReindexFailedError }
    );
    const txns = await readdir(join(root, '.journal', 'txns'));
    t.is(txns.length, 1);
    t.false(
      await readFile(join(root, '.journal', 'generation.json'))
        .then(() => true)
        .catch(() => false)
    );
    fake.reject.value = false;
    t.deepEqual(await bridge.writer.recover(), {
      action: 'completed',
      transactionId: txns[0],
    });
    t.is(
      JSON.parse(
        await readFile(join(root, '.journal', 'generation.json'), 'utf8')
      ).generation,
      1
    );
  }
);

test.serial(
  'a strict reader holding the returned token sees the mutation',
  async (t) => {
    const { bridge, fake } = await makeBridge();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    fake.reloader.notifyChanged = async () => {
      await gate;
      return { status: 'committed', generation: 41 };
    };
    fake.reloader.waitForGeneration = async () => ({
      ...fake.reloader.getSnapshot(),
      generation: 41,
    });
    const waiting = bridge.waitForCommittedGeneration('1', { timeoutMs: 1000 });
    const mutation = bridge.writer.mutate({
      type: 'CreateEffort',
      title: 'E',
      body: '',
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    release();
    const result = await mutation;
    t.is(result.generation, '1');
    t.is(
      (await bridge.waitForCommittedGeneration(result.generation)).generation,
      41
    );
    t.is((await waiting).generation, 41);
  }
);

test.serial(
  'strict wait times out for a token that never publishes',
  async (t) => {
    const { bridge } = await makeBridge();
    await t.throwsAsync(
      bridge.waitForCommittedGeneration('1', { timeoutMs: 10 }),
      {
        instanceOf: EffortGraphGenerationWaitTimeoutError,
      }
    );
  }
);

test.serial(
  'published tokens remain strictly readable after bridge recreation',
  async (t) => {
    const { root, bridge, fake } = await makeBridge();
    const result = await bridge.writer.mutate({
      type: 'CreateEffort',
      title: 'E',
      body: '',
    });
    const recreated = await createEffortGraphLiveBridge({
      rootDir: root,
      reloader: fake.reloader,
    });
    t.is(
      await (
        await recreated.waitForCommittedGeneration(result.generation)
      ).generation,
      1
    );
  }
);

test.serial(
  'recovery replays the publisher idempotently after an unpublished schema success',
  async (t) => {
    const { root, bridge, fake } = await makeBridge();
    const body = Buffer.from('---\nid: x\n---\n');
    const td = join(root, '.journal', 'txns', 'seed');
    await mkdir(td, { recursive: true });
    await writeFile(join(root, 'efforts.md'), body);
    await writeFile(
      join(td, 'intent.json'),
      JSON.stringify({
        transactionId: 'seed',
        targetGeneration: 9,
        writes: [
          {
            relativePath: 'efforts.md',
            before: { exists: false },
            after: {
              sha256: createHash('sha256').update(body).digest('hex'),
              base64: body.toString('base64'),
            },
          },
        ],
        touchedIds: [],
      })
    );
    await writeFile(join(td, 'committed'), '');
    t.deepEqual(await bridge.writer.recover(), {
      action: 'completed',
      transactionId: 'seed',
    });
    t.is(fake.calls.length, 1);
    t.is(
      JSON.parse(
        await readFile(join(root, '.journal', 'generation.json'), 'utf8')
      ).generation,
      9
    );
  }
);
