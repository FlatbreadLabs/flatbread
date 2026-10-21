import { fail } from '../../util/assert.ts';
import { v1ToV2 } from './v1-v2.ts';
import { v2ToV3 } from './v2-v3.ts';
import { v3ToV4 } from './v3-v4.ts';
import { v4ToV5 } from './v4-v5.ts';

export type RawFile = Record<string, unknown>;

export interface Migration {
  from: number;
  to: number;
  run(file: RawFile): RawFile;
}

export const MIGRATIONS: readonly Migration[] = [
  { from: 1, to: 2, run: v1ToV2 },
  { from: 2, to: 3, run: v2ToV3 },
  { from: 3, to: 4, run: v3ToV4 },
  { from: 4, to: 5, run: v4ToV5 },
];

export const LATEST = MIGRATIONS[MIGRATIONS.length - 1].to;

/** Runs each step from the file's version up to the latest, one at a time. */
export function migrate(file: RawFile): RawFile {
  let current = structuredClone(file);
  let version = current.version as number;
  while (version < LATEST) {
    const step = MIGRATIONS.find((m) => m.from === version);
    if (!step) fail('bad-file', `no migration from version ${version}`);
    current = step.run(current);
    if (current.version !== step.to)
      fail(
        'bad-migration',
        `step ${step.from}→${step.to} wrote version ${String(current.version)}`
      );
    version = step.to;
  }
  return current;
}
