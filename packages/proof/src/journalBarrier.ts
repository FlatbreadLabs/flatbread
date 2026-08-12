import { access, readFile, readdir } from 'node:fs/promises';
import { relative, resolve, join, sep } from 'node:path';
import type { ReindexBarrier } from '@flatbread/core';
import {
  ProofBarrierTimeoutError,
  ProofCorruptJournalError,
  ProofValidationError,
} from './errors.js';

export interface JournalReindexBarrierOptions {
  rootDir: string;
  pollIntervalMs?: number;
  maxWaitMs?: number;
}

async function blockingWrites(rootDir: string): Promise<string[]> {
  const txnsDir = join(rootDir, '.journal', 'txns');
  let transactions: string[];
  try {
    transactions = await readdir(txnsDir);
  } catch {
    return [];
  }
  const paths: string[] = [];
  for (const transaction of transactions) {
    const dir = join(txnsDir, transaction);
    const intentPath = join(dir, 'intent.json');
    let intentText: string;
    try {
      intentText = await readFile(intentPath, 'utf8');
    } catch {
      continue;
    }
    let intent: { writes?: Array<{ relativePath?: string }> };
    try {
      intent = JSON.parse(intentText);
    } catch {
      throw new ProofCorruptJournalError(`Cannot parse ${intentPath}`);
    }
    let committed = false;
    try {
      await access(join(dir, 'committed'));
      committed = true;
    } catch {}
    if (committed) continue;
    if (!Array.isArray(intent.writes)) {
      throw new ProofCorruptJournalError(`Invalid writes in ${intentPath}`);
    }
    for (const write of intent.writes) {
      if (typeof write.relativePath !== 'string') {
        throw new ProofCorruptJournalError(
          `Invalid relativePath in ${intentPath}`
        );
      }
      const absolute = resolve(rootDir, write.relativePath);
      const outside = relative(rootDir, absolute);
      if (outside === '..' || outside.startsWith(`..${sep}`)) {
        throw new ProofValidationError(
          `Journal path escapes root directory: ${write.relativePath}`
        );
      }
      paths.push(absolute);
    }
  }
  return paths;
}

export function createJournalReindexBarrier(
  options: JournalReindexBarrierOptions
): ReindexBarrier {
  const pollIntervalMs = options.pollIntervalMs ?? 25;
  const maxWaitMs = options.maxWaitMs ?? 10_000;
  return {
    async waitUntilReadable(requestedPaths) {
      const requested = requestedPaths.map((path) => resolve(path));
      const started = Date.now();
      for (;;) {
        const blocked = await blockingWrites(options.rootDir);
        if (
          !blocked.some((write) =>
            requested.some(
              (path) =>
                path === write ||
                path.startsWith(`${write}${sep}`) ||
                write.startsWith(`${path}${sep}`)
            )
          )
        )
          return;
        if (Date.now() - started >= maxWaitMs)
          throw new ProofBarrierTimeoutError(requestedPaths, maxWaitMs);
        await new Promise((resolveSleep) =>
          setTimeout(resolveSleep, pollIntervalMs)
        );
      }
    },
  };
}
