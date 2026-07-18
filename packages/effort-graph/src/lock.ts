import { hostname } from 'node:os';
import { open, readFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { EffortGraphLockedError } from './errors.js';
import type { WriterLockOptions } from './types.js';
export interface WriterLock {
  token: string;
  path: string;
  verify(): Promise<boolean>;
  release(): Promise<void>;
}
export async function acquireWriterLock(
  root: string,
  options: WriterLockOptions = {}
): Promise<WriterLock> {
  const path = join(root, '.journal', 'writer.lock');
  const leaseMs = options.leaseMs ?? 120000;
  const token = randomUUID();
  const now = Date.now();
  await import('node:fs/promises').then((fs) =>
    fs.mkdir(join(root, '.journal'), { recursive: true })
  );
  try {
    const h = await open(path, 'wx');
    await h.writeFile(
      JSON.stringify({
        token,
        pid: process.pid,
        hostname: hostname(),
        startedAt: now,
        heartbeatAt: now,
      })
    );
    await h.close();
  } catch {
    try {
      const old = JSON.parse(await readFile(path, 'utf8'));
      const expired = now - old.heartbeatAt > leaseMs;
      let dead = old.hostname !== hostname();
      if (!dead && expired) {
        try {
          process.kill(old.pid, 0);
        } catch {
          dead = true;
        }
      }
      if (expired && dead) {
        await rename(path, `${path}.stale-${old.token}`);
        return acquireWriterLock(root, options);
      }
    } catch {}
    throw new EffortGraphLockedError(leaseMs);
  }
  const verify = async () => {
    try {
      return JSON.parse(await readFile(path, 'utf8')).token === token;
    } catch {
      return false;
    }
  };
  return {
    token,
    path,
    verify,
    async release() {
      if (await verify()) await unlink(path).catch(() => {});
    },
  };
}
