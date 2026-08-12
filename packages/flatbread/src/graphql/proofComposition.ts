import { resolve } from 'node:path';
import type {
  ContentEntry,
  LiveSchemaReloader,
  ReindexBarrier,
} from '@flatbread/core';
import {
  createProofLiveBridge,
  createJournalReindexBarrier,
  findProofContentRoot,
  type ProofLiveBridge,
} from '@flatbread/proof';

export interface ProofComposition {
  readonly rootDir: string;
  readonly barrier: ReindexBarrier;
  attach(reloader: LiveSchemaReloader): Promise<ProofLiveBridge>;
}

export function createProofComposition(
  content: readonly ContentEntry[],
  options: { cwd: string }
): ProofComposition | undefined {
  const presetRoot = findProofContentRoot(content);
  if (!presetRoot) return undefined;
  const rootDir = resolve(options.cwd, presetRoot);
  return {
    rootDir,
    barrier: createJournalReindexBarrier({ rootDir }),
    attach: (reloader) => createProofLiveBridge({ rootDir, reloader }),
  };
}
