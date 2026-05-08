/**
 * Runtime for `kind: 'pause'` DAG tasks. No LLM, no Cursor SDK agent — the
 * task writes a sentinel file to `<checkpointDir>/pending-checkpoint-<taskId>`,
 * advertises that path via `TaskState.checkpointPath`, transitions to
 * `AWAITING_APPROVAL`, and polls every `pollIntervalMs` for the file's
 * removal. Sentinel removal → status `FINISHED`. Hitting `taskTimeoutMs` →
 * status `ERROR` (and the sentinel is best-effort cleaned up so a stale gate
 * is not left dangling on disk).
 */

import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { RawTask } from './dag.js';
import type { CanvasWriter, RunState, TaskState } from './canvas_writer.js';

export interface PauseTaskOptions {
  /** Absolute directory where the sentinel file lives. */
  checkpointDir: string;
  /** Hard ceiling on how long the runner will wait for human approval. */
  taskTimeoutMs: number;
  /** How often to re-stat the sentinel. Default: 2000ms (2s). */
  pollIntervalMs?: number;
}

export interface PauseTaskDeps {
  state: RunState;
  writer: CanvasWriter;
  /** Defensive deep clone helper (matches the rest of the runner). */
  cloneState: (state: RunState) => RunState;
}

const DEFAULT_PAUSE_POLL_MS = 2000;

export function checkpointPathFor(
  checkpointDir: string,
  taskId: string
): string {
  return join(checkpointDir, `pending-checkpoint-${taskId}`);
}

export async function runPauseTask(
  task: RawTask,
  ts: TaskState,
  options: PauseTaskOptions,
  deps: PauseTaskDeps
): Promise<void> {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_PAUSE_POLL_MS;
  const sentinelPath = checkpointPathFor(options.checkpointDir, task.id);

  ts.status = 'AWAITING_APPROVAL';
  ts.startedAt = Date.now();
  ts.checkpointPath = sentinelPath;
  ts.errorMessage = undefined;

  await mkdir(options.checkpointDir, { recursive: true });
  await writeFile(sentinelPath, renderSentinelBody(task, sentinelPath), 'utf8');

  ts.resultText = renderAwaitingResultText(task, sentinelPath);
  deps.writer.schedule(deps.cloneState(deps.state));

  console.log(
    `[proof] pause ${task.id} → AWAITING_APPROVAL; delete ${sentinelPath} to release the gate`
  );

  const deadline = Date.now() + options.taskTimeoutMs;
  // Poll loop. Process-level signal handlers in the parent runner will
  // process.exit() during interrupt, which terminates this loop cleanly.
  while (true) {
    if (Date.now() >= deadline) {
      ts.status = 'ERROR';
      ts.finishedAt = Date.now();
      ts.durationMs = ts.finishedAt - (ts.startedAt ?? ts.finishedAt);
      ts.errorMessage = `Pause task ${task.id} exceeded --task-timeout-ms (${options.taskTimeoutMs}ms) without sentinel removal.`;
      ts.resultText =
        renderAwaitingResultText(task, sentinelPath) +
        `\n\nTimed out after ${options.taskTimeoutMs}ms — sentinel was never deleted.`;
      // best-effort cleanup so a re-run starts from a clean slate
      try {
        await unlink(sentinelPath);
      } catch {
        // ignore; user may want the sentinel preserved for inspection
      }
      deps.writer.schedule(deps.cloneState(deps.state));
      return;
    }

    if (await sentinelGone(sentinelPath)) {
      ts.status = 'FINISHED';
      ts.finishedAt = Date.now();
      ts.durationMs = ts.finishedAt - (ts.startedAt ?? ts.finishedAt);
      ts.resultText = renderApprovedResultText(sentinelPath, ts.finishedAt);
      deps.writer.schedule(deps.cloneState(deps.state));
      console.log(
        `[proof] pause ${task.id} → FINISHED (sentinel removed, ${ts.durationMs}ms gated)`
      );
      return;
    }

    const remaining = deadline - Date.now();
    const sleepMs = Math.max(0, Math.min(pollIntervalMs, remaining));
    await sleep(sleepMs);
  }
}

async function sentinelGone(path: string): Promise<boolean> {
  try {
    await stat(path);
    return false;
  } catch {
    return true;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderSentinelBody(task: RawTask, sentinelPath: string): string {
  const description = task.subtask_prompt?.trim()
    ? task.subtask_prompt.trim()
    : '(no description provided)';
  return [
    '# Pending DAG checkpoint',
    '',
    `Task ID: ${task.id}`,
    `Created: ${new Date().toISOString()}`,
    '',
    '## What this gate is for',
    '',
    description,
    '',
    '## To release this gate',
    '',
    'Delete this file:',
    '',
    `  rm '${sentinelPath}'`,
    '',
    'The DAG runner polls every 2s and will continue once the file is gone.',
    '',
  ].join('\n');
}

function renderAwaitingResultText(task: RawTask, sentinelPath: string): string {
  const description = task.subtask_prompt?.trim()
    ? task.subtask_prompt.trim()
    : '(no description provided)';
  return [
    'AWAITING HUMAN APPROVAL.',
    '',
    'To release this checkpoint, delete the sentinel file:',
    '',
    `  rm '${sentinelPath}'`,
    '',
    'The runner re-checks every 2s.',
    '',
    'Gate description:',
    description,
  ].join('\n');
}

function renderApprovedResultText(
  sentinelPath: string,
  finishedAt: number
): string {
  return `Approved by human. Sentinel removed at ${new Date(
    finishedAt
  ).toISOString()} (${sentinelPath}).`;
}
