import test from 'ava';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createJournalReindexBarrier } from '../journalBarrier.js';
import {
  EffortGraphBarrierTimeoutError,
  EffortGraphCorruptJournalError,
} from '../errors.js';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'eg-barrier-'));
  const txn = join(root, '.journal', 'txns', 'txn');
  await mkdir(txn, { recursive: true });
  await writeFile(
    join(txn, 'intent.json'),
    JSON.stringify({
      writes: [{ relativePath: 'efforts/a.md' }],
    })
  );
  return { root, txn, path: join(root, 'efforts', 'a.md') };
}

test.serial(
  'defers watcher paths named by an uncommitted intent and releases on the committed marker',
  async (t) => {
    const { root, txn, path } = await fixture();
    const pending = createJournalReindexBarrier({
      rootDir: root,
      pollIntervalMs: 5,
    }).waitUntilReadable([path]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    let done = false;
    void pending.then(() => (done = true));
    t.false(done);
    await writeFile(join(txn, 'committed'), '');
    await pending;
    t.pass();
  }
);

test.serial(
  'releases after rollback removes the uncommitted transaction',
  async (t) => {
    const { root, txn, path } = await fixture();
    const pending = createJournalReindexBarrier({
      rootDir: root,
      pollIntervalMs: 5,
    }).waitUntilReadable([path]);
    await rm(txn, { recursive: true, force: true });
    await pending;
    t.pass();
  }
);

test.serial(
  'does not defer unrelated paths or committed transactions',
  async (t) => {
    const { root, txn } = await fixture();
    await writeFile(join(txn, 'committed'), '');
    await createJournalReindexBarrier({ rootDir: root }).waitUntilReadable([
      join(root, 'other.md'),
    ]);
    t.pass();
  }
);

test.serial(
  'maps relative intent paths against absolute watcher paths',
  async (t) => {
    const { root, path } = await fixture();
    const pending = createJournalReindexBarrier({
      rootDir: root,
      pollIntervalMs: 5,
    }).waitUntilReadable([path]);
    await writeFile(join(root, '.journal', 'txns', 'txn', 'committed'), '');
    await pending;
    t.pass();
  }
);

test.serial('fails closed on a malformed active intent', async (t) => {
  const { root, txn, path } = await fixture();
  await writeFile(join(txn, 'intent.json'), '{broken');
  await t.throwsAsync(
    createJournalReindexBarrier({ rootDir: root }).waitUntilReadable([path]),
    { instanceOf: EffortGraphCorruptJournalError }
  );
});

test.serial(
  'bounded wait rejects after maxWaitMs for an orphaned transaction',
  async (t) => {
    const { root, path } = await fixture();
    await t.throwsAsync(
      createJournalReindexBarrier({
        rootDir: root,
        pollIntervalMs: 2,
        maxWaitMs: 10,
      }).waitUntilReadable([path]),
      { instanceOf: EffortGraphBarrierTimeoutError }
    );
  }
);
