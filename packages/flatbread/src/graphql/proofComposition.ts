import { resolve } from 'node:path';
import type {
  ContentEntry,
  LiveSchemaReloader,
  ReindexBarrier,
} from '@flatbread/core';
import {
  createEffortGraphLiveBridge,
  createJournalReindexBarrier,
  findEffortGraphContentRoot,
  type EffortGraphLiveBridge,
} from '@flatbread/effort-graph';

export interface EffortGraphComposition {
  readonly rootDir: string;
  readonly barrier: ReindexBarrier;
  attach(reloader: LiveSchemaReloader): Promise<EffortGraphLiveBridge>;
}

export function createEffortGraphComposition(
  content: readonly ContentEntry[],
  options: { cwd: string }
): EffortGraphComposition | undefined {
  const presetRoot = findEffortGraphContentRoot(content);
  if (!presetRoot) return undefined;
  const rootDir = resolve(options.cwd, presetRoot);
  return {
    rootDir,
    barrier: createJournalReindexBarrier({ rootDir }),
    attach: (reloader) => createEffortGraphLiveBridge({ rootDir, reloader }),
  };
}
