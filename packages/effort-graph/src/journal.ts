import {
  mkdir,
  open,
  readFile,
  readdir,
  rm,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import {
  EffortGraphCorruptJournalError,
  EffortGraphLockedError,
  EffortGraphReindexFailedError,
} from './errors.js';
import type { PlannedWrite, RecoveryResult, ReindexRequest } from './types.js';

async function fsyncFile(path: string): Promise<void> {
  const handle = await open(path, 'r+');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function fsyncDir(path: string): Promise<void> {
  // Directory fsync is not supported on all platforms; best-effort only.
  try {
    const handle = await open(path, 'r');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch {}
}

async function writeFileDurable(path: string, data: Buffer | string) {
  await writeFile(path, data);
  await fsyncFile(path);
}

async function publishGeneration(root: string, generation: number) {
  const journalDir = join(root, '.journal');
  const tmp = join(journalDir, `generation.json.tmp-${randomUUID()}`);
  await writeFileDurable(tmp, JSON.stringify({ generation }));
  await rename(tmp, join(journalDir, 'generation.json'));
  await fsyncDir(journalDir);
}

async function readGeneration(root: string): Promise<number> {
  try {
    return (
      JSON.parse(
        await readFile(join(root, '.journal', 'generation.json'), 'utf8')
      ).generation || 0
    );
  } catch {
    return 0;
  }
}

async function removeTempRemnants(root: string, relativePaths: string[]) {
  const dirs = [...new Set(relativePaths.map((p) => dirname(join(root, p))))];
  for (const dir of dirs) {
    let names: string[] = [];
    try {
      names = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of names.filter((n) => n.includes('.tmp-'))) {
      await unlink(join(dir, name)).catch(() => {});
    }
    await fsyncDir(dir);
  }
}

export async function recoverJournal(
  root: string,
  reindex: (r: ReindexRequest) => Promise<void>
): Promise<RecoveryResult> {
  const dir = join(root, '.journal', 'txns');
  await mkdir(dir, { recursive: true });
  const txns = await readdir(dir);
  if (!txns.length) return { action: 'none' };
  let action: RecoveryResult['action'] = 'none',
    transactionId: string | undefined;
  for (const txn of txns) {
    const td = join(dir, txn);
    const intentPath = join(td, 'intent.json');
    let intent: any;
    try {
      intent = JSON.parse(await readFile(intentPath, 'utf8'));
    } catch {
      throw new EffortGraphCorruptJournalError(`Cannot parse ${intentPath}`);
    }
    transactionId = intent.transactionId;
    const committed = await readFile(join(td, 'committed'))
        .then(() => true)
        .catch(() => false),
      published = await readFile(join(td, 'published'))
        .then(() => true)
        .catch(() => false);
    const relativePaths: string[] = intent.writes.map(
      (x: any) => x.relativePath
    );
    if (!committed) {
      // Restore before-images in reverse lexicographic relative-path order.
      const restores = [...intent.writes].sort((a: any, b: any) =>
        b.relativePath.localeCompare(a.relativePath)
      );
      for (const w of restores) {
        const p = join(root, w.relativePath);
        if (w.before.exists)
          await writeFileDurable(p, Buffer.from(w.before.base64, 'base64'));
        else await rm(p, { force: true });
        await fsyncDir(dirname(p));
      }
      await removeTempRemnants(root, relativePaths);
      action = 'rolled_back';
    } else if (!published) {
      for (const w of intent.writes) {
        const p = join(root, w.relativePath);
        const actual = await readFile(p).catch(() => undefined);
        const hash =
          actual && createHash('sha256').update(actual).digest('hex');
        if (hash !== w.after.sha256) {
          await writeFileDurable(p, Buffer.from(w.after.base64, 'base64'));
          await fsyncDir(dirname(p));
        }
      }
      try {
        await reindex({
          rootDir: root,
          transactionId: intent.transactionId,
          targetGeneration: String(intent.targetGeneration),
          changedPaths: relativePaths,
          touchedIds: intent.touchedIds,
        });
      } catch (e) {
        throw new EffortGraphReindexFailedError('Recovery reindex failed', e);
      }
      await publishGeneration(root, intent.targetGeneration);
      await writeFileDurable(join(td, 'published'), '');
      action = 'completed';
    }
    if (published) {
      if ((await readGeneration(root)) < intent.targetGeneration)
        await publishGeneration(root, intent.targetGeneration);
      action = 'completed';
    }
    await rm(td, { recursive: true, force: true });
    await fsyncDir(dir);
  }
  return { action, transactionId };
}

export async function commitJournal(
  root: string,
  token: string,
  writes: PlannedWrite[],
  generation: number,
  reindex: (r: ReindexRequest) => Promise<void>,
  verifyLock: () => Promise<boolean> = async () => true
): Promise<string> {
  const transactionId = `${Date.now()}-${token.slice(0, 8)}`,
    td = join(root, '.journal', 'txns', transactionId);
  await mkdir(td, { recursive: true });
  const intent = {
    transactionId,
    createdAt: new Date().toISOString(),
    targetGeneration: generation,
    lockToken: token,
    writes: writes.map((w) => ({
      relativePath: w.relativePath,
      before: {
        exists: !!w.beforeBytes,
        ...(w.beforeBytes ? { base64: w.beforeBytes.toString('base64') } : {}),
      },
      after: {
        sha256: createHash('sha256').update(w.afterBytes).digest('hex'),
        base64: w.afterBytes.toString('base64'),
      },
    })),
    touchedIds: writes.map((w) => w.id),
  };
  await writeFileDurable(join(td, 'intent.json'), JSON.stringify(intent));
  await fsyncDir(td);
  for (const w of [...writes].sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath)
  )) {
    if (!(await verifyLock()))
      throw new EffortGraphLockedError(0, 'Writer lock lost mid-transaction');
    const target = join(root, w.relativePath);
    await mkdir(dirname(target), { recursive: true });
    const tmp = join(root, w.relativePath.replace(/\.md$/, `.tmp-${token}.md`));
    await writeFileDurable(tmp, w.afterBytes);
    await rename(tmp, target);
    await fsyncDir(dirname(target));
  }
  await writeFileDurable(join(td, 'committed'), '');
  await fsyncDir(td);
  try {
    await reindex({
      rootDir: root,
      transactionId,
      targetGeneration: String(generation),
      changedPaths: writes.map((w) => w.relativePath),
      touchedIds: writes.map((w) => w.id),
    });
  } catch (e) {
    throw new EffortGraphReindexFailedError('Reindex failed', e);
  }
  await publishGeneration(root, generation);
  await writeFileDurable(join(td, 'published'), '');
  await rm(td, { recursive: true, force: true });
  return String(generation);
}
