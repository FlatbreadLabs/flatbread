/**
 * `--findings-dir <path>` JSON sidecar writer + reader.
 *
 * After every task finishes — including `kind: 'oracle'` — the runner parses
 * headings from an optional richer `parseSource` when callers pass one. The
 * `kind: 'task'` runner path passes the execution-authoritative transcript;
 * pause/oracle callers continue to rely on their bounded `TaskState.resultText`.
 * Otherwise this writer falls back to `TaskState.resultText`.
 * `<taskId>.findings.json` (or `<taskId>.iter<n>.findings.json` once the
 * convergence loop has bumped the task's iteration past the original run).
 * The schema is intentionally tiny so downstream tools can lift findings
 * into review surfaces without re-implementing the prose parser:
 *
 *     {
 *       "taskId": "verify-codegen",
 *       "iteration": 0,
 *       "status": "FINISHED",
 *       "durationMs": 1234,
 *       "sections": {
 *         "Blockers": "…",
 *         "High-severity findings": "…",
 *         …
 *       }
 *     }
 *
 * The convergence loop prefers reading these JSON files over re-parsing the
 * live bounded `resultText` when `--findings-dir` is set on the same run,
 * because the sidecar is captured at task completion instead of mid-stream.
 * In-process, the runner still prefers the authoritative transcript map and
 * uses the sidecar primarily as a cross-process fallback.
 *
 * Oracle tasks ride the same code path: their standardized `## Pass: <bool>`
 * / `## Command: <cmd>` / `## Exit code: <N>` / `## Stdout (tail):` /
 * `## Stderr (tail):` headings round-trip through `parseSections` with the
 * inline value preserved as part of the heading key (e.g. `"Pass: true"`)
 * for the value-bearing rows and the bounded tail captured as the section
 * body for the trailing two rows. Consumers that already know they are
 * looking at an oracle sidecar can split on `": "` to recover key/value;
 * generic consumers see the same `Record<string, string>` schema as
 * regular tasks. `TaskState.status` (`FINISHED` vs `ERROR`) remains the
 * authoritative pass/fail signal — sidecar `sections` are diagnostic.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { TaskState, TaskStatus } from './canvas_writer.js';

export interface FindingsSidecar {
  taskId: string;
  iteration: number;
  status: TaskStatus;
  /** Mirrors `TaskState.durationMs`; `null` when the task never finished. */
  durationMs: number | null;
  sections: Record<string, string>;
}

/**
 * `<taskId>.findings.json` for the original run; `<taskId>.iter<n>.findings.json`
 * for any convergence-loop re-run. The original is kept stable so downstream
 * tools can always reference it by task id; iteration suffixes preserve
 * history of every re-run instead of overwriting.
 */
export function findingsFileName(taskId: string, iteration: number): string {
  if (iteration > 0) {
    return `${taskId}.iter${iteration}.findings.json`;
  }
  return `${taskId}.findings.json`;
}

/**
 * Splits text into a flat object keyed by `## ` heading text (trimmed,
 * case-preserved). Sub-headings (`### …`) are kept inside their parent
 * section's body. Mirrors converge_loop's heading regex so both consumers
 * agree on what counts as a section break.
 */
export function parseSections(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const HEADING_RE = /^##(?!#)\s*(.+?)\s*$/;
  const lines = text.split(/\r?\n/);
  let currentHeading: string | null = null;
  let currentLines: string[] = [];
  const flush = (): void => {
    if (currentHeading !== null) {
      out[currentHeading] = currentLines.join('\n').trim();
    }
  };
  for (const line of lines) {
    const m = HEADING_RE.exec(line);
    if (m) {
      flush();
      currentHeading = m[1].trim();
      currentLines = [];
    } else if (currentHeading !== null) {
      currentLines.push(line);
    }
  }
  flush();
  return out;
}

export async function writeFindingsSidecar(
  findingsDir: string,
  ts: TaskState,
  opts?: { parseSource?: string }
): Promise<string> {
  const iteration = ts.iteration ?? 0;
  const source = opts?.parseSource ?? ts.resultText ?? '';
  const sidecar: FindingsSidecar = {
    taskId: ts.id,
    iteration,
    status: ts.status,
    durationMs: ts.durationMs ?? null,
    sections: parseSections(source),
  };
  await mkdir(findingsDir, { recursive: true });
  const path = join(findingsDir, findingsFileName(ts.id, iteration));
  await writeFile(path, JSON.stringify(sidecar, null, 2) + '\n', 'utf8');
  return path;
}

export async function readFindingsSidecar(
  findingsDir: string,
  taskId: string,
  iteration: number
): Promise<FindingsSidecar | null> {
  try {
    const path = join(findingsDir, findingsFileName(taskId, iteration));
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof (parsed as FindingsSidecar).taskId !== 'string'
    ) {
      return null;
    }
    return parsed as FindingsSidecar;
  } catch {
    return null;
  }
}

/**
 * Reconstructs a `## heading\nbody` markdown blob from a previously written
 * sidecar so existing prose-shaped extractors (e.g. `extractConvergenceFindings`)
 * can consume it without a second code path. Returns `null` when the sidecar
 * is missing or malformed so callers can fall back to the live `resultText`.
 */
export async function readFindingsSidecarAsText(
  findingsDir: string,
  taskId: string,
  iteration: number
): Promise<string | null> {
  const sidecar = await readFindingsSidecar(findingsDir, taskId, iteration);
  if (!sidecar) return null;
  const entries = Object.entries(sidecar.sections);
  if (entries.length === 0) return '';
  return entries
    .map(([heading, body]) => `## ${heading}\n${body}`)
    .join('\n\n');
}
