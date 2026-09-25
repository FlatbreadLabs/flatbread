import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { acquireWriterLock } from './lock.js';
import { ProofValidationError } from './errors.js';
import { commitJournal, recoverJournal } from './journal.js';
import { planMutation } from './planner.js';
import { filesystemProofSnapshotSource } from './snapshot.js';
import { parseDocument } from './frontmatter.js';
import type {
  ProofWriter,
  ProofWriterOptions,
  MutationResult,
  WrittenArtifact,
} from './types.js';
export function createProofWriter(options: ProofWriterOptions): ProofWriter {
  const snapshotSource = options.index ?? filesystemProofSnapshotSource,
    publisher = options.publisher ?? { publish: async () => {} },
    clock = options.clock ?? (() => new Date());
  async function recover() {
    const lock = await acquireWriterLock(options.rootDir, options.lockOptions);
    try {
      return await recoverJournal(options.rootDir, (p) => publisher.publish(p));
    } finally {
      await lock.release();
    }
  }
  async function mutate(input: any): Promise<MutationResult> {
    const lock = await acquireWriterLock(options.rootDir, options.lockOptions);
    try {
      const dryRun = input.type === 'AcceptDecision' && input.dryRun === true;
      if (dryRun) {
        const pending = await readdir(
          join(options.rootDir, '.journal', 'txns')
        ).catch((error: { code?: string }) => {
          if (error.code === 'ENOENT') return [];
          throw error;
        });
        if (pending.length)
          throw new ProofValidationError(
            'Cannot preview while journal recovery is pending; recover first'
          );
      } else {
        await recoverJournal(options.rootDir, (p) => publisher.publish(p));
      }
      let current = 0;
      try {
        current =
          JSON.parse(
            await readFile(
              join(options.rootDir, '.journal', 'generation.json'),
              'utf8'
            )
          ).generation || 0;
      } catch {}
      const snapshot = await snapshotSource.buildSnapshot(options.rootDir);
      const writes = planMutation(
        input,
        snapshot,
        options.rootDir,
        clock(),
        options.randomBytes
      );
      const generation = Number(current) + 1;
      const tx = dryRun
        ? String(current)
        : await commitJournal(
            options.rootDir,
            lock.token,
            writes,
            generation,
            (p) => publisher.publish(p),
            () => lock.verify()
          );
      const artifacts: WrittenArtifact[] = writes.map((w) => {
        const parsed = parseDocument(w.afterBytes, w.kind);
        return {
          id: w.id,
          kind: w.kind,
          path: w.relativePath,
          frontmatter: parsed.frontmatter,
          body: parsed.body,
          operation: w.operation === 'create' ? 'created' : 'updated',
        };
      });
      return {
        generation: tx,
        artifacts,
        touched: writes.map((w) => ({ id: w.id, path: w.relativePath })),
        ...(input.type === 'AcceptDecision'
          ? {
              dryRun,
              changedDecisionIds: writes.map((w) => w.id),
              rejectedIds: artifacts
                .filter((a) => a.frontmatter.state === 'rejected')
                .map((a) => a.id),
            }
          : input.type === 'ReopenDecision'
          ? { changedDecisionIds: writes.map((w) => w.id) }
          : {}),
      };
    } finally {
      await lock.release();
    }
  }
  return { recover, mutate };
}
