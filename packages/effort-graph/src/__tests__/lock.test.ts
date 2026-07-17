import test from 'ava';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { hostname } from 'node:os';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireWriterLock } from '../lock.js';
import { createEffortGraphWriter } from '../writer.js';
import {
  EffortGraphLockedError,
  EffortGraphValidationError,
} from '../errors.js';

// A pid above the platform maximum, guaranteed dead.
const DEAD_PID = 2 ** 30;

async function makeRoot() {
  const root = await mkdtemp(join(tmpdir(), 'eg-lock-'));
  await mkdir(join(root, '.journal'), { recursive: true });
  return root;
}

function lockPath(root: string) {
  return join(root, '.journal', 'writer.lock');
}

test('second concurrent acquire throws EffortGraphLockedError', async (t) => {
  const root = await makeRoot();
  const lock = await acquireWriterLock(root);
  const error = (await t.throwsAsync(acquireWriterLock(root), {
    instanceOf: EffortGraphLockedError,
  })) as EffortGraphLockedError;
  t.is(error.code, 'EFFORT_GRAPH_LOCKED');
  t.true(error.retryAfterMs > 0);
  await lock.release();
  // After release a new writer can acquire.
  const next = await acquireWriterLock(root);
  await next.release();
});

test('expired lease with a dead pid is reclaimed', async (t) => {
  const root = await makeRoot();
  await writeFile(
    lockPath(root),
    JSON.stringify({
      token: 'stale-token',
      pid: DEAD_PID,
      hostname: hostname(),
      startedAt: Date.now() - 10_000,
      heartbeatAt: Date.now() - 10_000,
    })
  );
  const lock = await acquireWriterLock(root, { leaseMs: 1000 });
  t.truthy(lock.token);
  // The stale lock is preserved for forensics under a stale- name.
  t.true(existsSync(`${lockPath(root)}.stale-stale-token`));
  await lock.release();
});

test('expired lease with a live pid is NOT reclaimed', async (t) => {
  const root = await makeRoot();
  await writeFile(
    lockPath(root),
    JSON.stringify({
      token: 'live-token',
      pid: process.pid,
      hostname: hostname(),
      startedAt: Date.now() - 10_000,
      heartbeatAt: Date.now() - 10_000,
    })
  );
  await t.throwsAsync(acquireWriterLock(root, { leaseMs: 1000 }), {
    instanceOf: EffortGraphLockedError,
  });
});

test('fresh lease with a dead pid is NOT reclaimed', async (t) => {
  const root = await makeRoot();
  await writeFile(
    lockPath(root),
    JSON.stringify({
      token: 'fresh-token',
      pid: DEAD_PID,
      hostname: hostname(),
      startedAt: Date.now(),
      heartbeatAt: Date.now(),
    })
  );
  await t.throwsAsync(acquireWriterLock(root, { leaseMs: 60_000 }), {
    instanceOf: EffortGraphLockedError,
  });
});

test('release with a mismatched on-disk token leaves the lock file', async (t) => {
  const root = await makeRoot();
  const lock = await acquireWriterLock(root);
  const usurped = JSON.stringify({
    token: 'someone-else',
    pid: process.pid,
    hostname: hostname(),
    startedAt: Date.now(),
    heartbeatAt: Date.now(),
  });
  await writeFile(lockPath(root), usurped);
  await lock.release();
  t.true(existsSync(lockPath(root)));
  t.is(await readFile(lockPath(root), 'utf8'), usurped);
});

test('lock is released after a failed mutate so the next mutate succeeds', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'eg-lock-writer-'));
  const writer = createEffortGraphWriter({ rootDir: root });
  await t.throwsAsync(
    writer.mutate({
      type: 'SetEffortStatus',
      effortId: 'eff-missing--0123456789abcdef',
      status: 'paused',
    }),
    { instanceOf: EffortGraphValidationError }
  );
  t.false(existsSync(lockPath(root)));
  const result = await writer.mutate({
    type: 'CreateEffort',
    title: 'Recovers',
    body: '',
  });
  t.is(result.generation, '1');
});
