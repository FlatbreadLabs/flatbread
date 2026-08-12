import test from 'ava';
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recoverJournal } from '../journal.js';
import { ProofCorruptJournalError } from '../errors.js';

function writeEntry(
  relativePath: string,
  before: string | undefined,
  after: string
) {
  return {
    relativePath,
    before: {
      exists: before !== undefined,
      ...(before !== undefined
        ? { base64: Buffer.from(before).toString('base64') }
        : {}),
    },
    after: {
      sha256: createHash('sha256').update(after).digest('hex'),
      base64: Buffer.from(after).toString('base64'),
    },
  };
}

async function makeRoot() {
  const root = await mkdtemp(join(tmpdir(), 'eg-journal-'));
  await mkdir(join(root, 'efforts'), { recursive: true });
  await mkdir(join(root, '.journal', 'txns'), { recursive: true });
  return root;
}

async function writeIntent(
  root: string,
  txnId: string,
  writes: unknown[],
  markers: Array<'committed' | 'published'> = []
) {
  const td = join(root, '.journal', 'txns', txnId);
  await mkdir(td, { recursive: true });
  await writeFile(
    join(td, 'intent.json'),
    JSON.stringify({
      transactionId: txnId,
      createdAt: new Date().toISOString(),
      targetGeneration: 7,
      lockToken: 'test-token',
      writes,
      touchedIds: ['eff-a--0123456789abcdef'],
    })
  );
  for (const marker of markers) await writeFile(join(td, marker), '');
  return td;
}

test('uncommitted txn rolls back before-images and removes temp remnants', async (t) => {
  const root = await makeRoot();
  const updatedPath = join(root, 'efforts', 'a.md');
  const createdPath = join(root, 'efforts', 'b.md');
  // Simulate a partially applied transaction: a.md overwritten, b.md created.
  await writeFile(updatedPath, 'NEW A');
  await writeFile(createdPath, 'NEW B');
  await writeFile(join(root, 'efforts', 'b.tmp-remnant.md'), 'partial');
  await writeIntent(root, 't-uncommitted', [
    writeEntry('efforts/a.md', 'OLD A', 'NEW A'),
    writeEntry('efforts/b.md', undefined, 'NEW B'),
  ]);
  const result = await recoverJournal(root, async () => {});
  t.is(result.action, 'rolled_back');
  t.is(result.transactionId, 't-uncommitted');
  t.is(await readFile(updatedPath, 'utf8'), 'OLD A');
  t.false(existsSync(createdPath));
  const remnants = (await readdir(join(root, 'efforts'))).filter((n) =>
    n.includes('.tmp-')
  );
  t.deepEqual(remnants, []);
  t.deepEqual(await readdir(join(root, '.journal', 'txns')), []);
});

test('committed txn re-applies after-images, reindexes once, and publishes', async (t) => {
  const root = await makeRoot();
  const path = join(root, 'efforts', 'a.md');
  // Stale content that does not match the after-image sha.
  await writeFile(path, 'STALE');
  await writeIntent(
    root,
    't-committed',
    [writeEntry('efforts/a.md', 'OLD A', 'FINAL A')],
    ['committed']
  );
  let reindexCalls = 0;
  const result = await recoverJournal(root, async (request) => {
    reindexCalls += 1;
    t.is(request.targetGeneration, '7');
    t.deepEqual([...request.changedPaths], ['efforts/a.md']);
  });
  t.is(result.action, 'completed');
  t.is(reindexCalls, 1);
  t.is(await readFile(path, 'utf8'), 'FINAL A');
  const generation = JSON.parse(
    await readFile(join(root, '.journal', 'generation.json'), 'utf8')
  );
  t.is(generation.generation, 7);
  t.deepEqual(await readdir(join(root, '.journal', 'txns')), []);
});

test('recovery is idempotent when run twice', async (t) => {
  const root = await makeRoot();
  await writeFile(join(root, 'efforts', 'a.md'), 'NEW A');
  await writeIntent(root, 't-repeat', [
    writeEntry('efforts/a.md', 'OLD A', 'NEW A'),
  ]);
  const first = await recoverJournal(root, async () => {});
  t.is(first.action, 'rolled_back');
  const second = await recoverJournal(root, async () => {});
  t.is(second.action, 'none');
  t.is(await readFile(join(root, 'efforts', 'a.md'), 'utf8'), 'OLD A');
});

test('corrupt intent.json fails closed', async (t) => {
  const root = await makeRoot();
  const td = join(root, '.journal', 'txns', 't-corrupt');
  await mkdir(td, { recursive: true });
  await writeFile(join(td, 'intent.json'), '{ this is not json');
  await t.throwsAsync(
    recoverJournal(root, async () => {}),
    {
      instanceOf: ProofCorruptJournalError,
    }
  );
  // The corrupt transaction is left untouched — never guess.
  t.true(existsSync(join(td, 'intent.json')));
});
