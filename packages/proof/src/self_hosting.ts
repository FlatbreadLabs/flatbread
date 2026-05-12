import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { RunState } from './canvas_writer.js';

export const EXIT_RUNNER_RESTART = 75;

export interface PersistedRunState {
  version: 1;
  writtenAt: string;
  reason: string;
  state: RunState;
}

export interface RunnerFileSnapshotEntry {
  path: string;
  size: number;
  mtimeMs: number;
}

export type RunnerFileSnapshot = Map<string, RunnerFileSnapshotEntry>;

export const RUNNER_RUNTIME_FILES: readonly string[] = [
  'run_dag.ts',
  'dag.ts',
  'canvas_writer.ts',
  'converge_loop.ts',
  'dry_check_cmds.ts',
  'findings_sidecar.ts',
  'oracle_task.ts',
  'pause_task.ts',
  'self_hosting.ts',
  'task_transcript.ts',
  'upstream_policy.ts',
];

export async function writePersistedRunState(
  path: string,
  state: RunState,
  reason: string
): Promise<void> {
  const payload: PersistedRunState = {
    version: 1,
    writtenAt: new Date().toISOString(),
    reason,
    state,
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export async function readPersistedRunState(
  path: string
): Promise<PersistedRunState> {
  const raw = JSON.parse(await readFile(path, 'utf8')) as unknown;
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Resume state ${path} must be a JSON object.`);
  }
  const obj = raw as Partial<PersistedRunState>;
  if (obj.version !== 1) {
    throw new Error(`Resume state ${path} has unsupported version.`);
  }
  if (!obj.state || typeof obj.state !== 'object') {
    throw new Error(`Resume state ${path} is missing state.`);
  }
  return obj as PersistedRunState;
}

export async function snapshotRunnerRuntimeFiles(
  scriptsDir: string
): Promise<RunnerFileSnapshot> {
  const snapshot: RunnerFileSnapshot = new Map();
  for (const rel of RUNNER_RUNTIME_FILES) {
    const path = join(scriptsDir, rel);
    try {
      const s = await stat(path);
      snapshot.set(path, { path, size: s.size, mtimeMs: s.mtimeMs });
    } catch {
      // Missing source file (e.g. installed package with `dist`-only layout).
      // Skip silently — the change detector simply will not flag this file.
    }
  }
  return snapshot;
}

export async function changedRunnerRuntimeFiles(
  snapshot: RunnerFileSnapshot
): Promise<string[]> {
  const changed: string[] = [];
  for (const [path, before] of snapshot) {
    try {
      const after = await stat(path);
      if (after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
        changed.push(path);
      }
    } catch {
      changed.push(path);
    }
  }
  return changed;
}
