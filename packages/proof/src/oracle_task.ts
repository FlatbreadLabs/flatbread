/**
 * Runtime for `kind: 'oracle'` DAG tasks. No LLM, no Cursor SDK agent — the
 * runner spawns `task.command` through a shell, captures stdout + stderr, and
 * decides pass/fail.
 *
 * Pass predicate: `exit code === 0` AND combined stdout/stderr matches
 * `task.expect` (regex, defaults to `'.*'`). Exit-code-zero is REQUIRED by
 * default because an oracle's job is "did this command succeed" — the prior
 * "regex-only" contract silently green-lit `&&`-chained commands that exited
 * non-zero (e.g. `cd && tsc` where `cd` succeeded but `tsc` was missing) just
 * because the default `.*` regex happened to match the error output. If you
 * genuinely want to gate solely on output regardless of exit code (e.g. for
 * an asserting `grep`), set the optional `allowNonZeroExit: true` field on
 * the task.
 *
 * Result text shape (rendered by `formatOracleResult` and consumed by both
 * the canvas template and the `--findings-dir` JSON sidecar):
 *
 *     ## Pass: true|false
 *     ## Command: <command>
 *     ## Exit code: <N|null>
 *     ## Stdout (tail):
 *     <bounded>
 *     ## Stderr (tail):
 *     <bounded>
 *
 * Hung commands are bounded by `--task-timeout-ms`. We send SIGTERM at the
 * deadline, then escalate to SIGKILL after `KILL_GRACE_MS` so a process that
 * traps SIGTERM cannot keep the runner pinned forever.
 */

import { spawn } from 'node:child_process';

import type { RawTask } from './dag.js';
import type { CanvasWriter, RunState, TaskState } from './canvas_writer.js';

export interface OracleTaskOptions {
  /** Working directory the command runs in (typically `--cwd`). */
  cwd: string;
  /** Hard ceiling on command runtime (mirrors `--task-timeout-ms`). */
  taskTimeoutMs: number;
}

export interface OracleTaskDeps {
  state: RunState;
  writer: CanvasWriter;
  /** Defensive deep clone helper (matches the rest of the runner). */
  cloneState: (state: RunState) => RunState;
}

/** Cap on per-stream tail captured into `resultText`; matches `CANVAS_DISPLAY_CAP` in run_dag.ts so canvas payloads stay bounded. */
const ORACLE_TAIL_CAP = 4000;
/** SIGTERM → SIGKILL escalation window for hung oracle commands. */
const KILL_GRACE_MS = 2000;

export async function runOracleTask(
  task: RawTask,
  ts: TaskState,
  options: OracleTaskOptions,
  deps: OracleTaskDeps
): Promise<void> {
  const command = task.command;
  if (typeof command !== 'string' || command.trim() === '') {
    // Schema guarantees this is unreachable (parseDAG rejects oracle without
    // command), but the runtime guard keeps the type system honest and makes
    // the failure mode explicit if someone bypasses parseDAG.
    ts.status = 'ERROR';
    ts.startedAt = ts.startedAt ?? Date.now();
    ts.finishedAt = Date.now();
    ts.durationMs = ts.finishedAt - (ts.startedAt ?? ts.finishedAt);
    ts.errorMessage = `Oracle task ${task.id} has no command (parser invariant violated).`;
    ts.resultText = ts.errorMessage;
    deps.writer.schedule(deps.cloneState(deps.state));
    return;
  }
  const expectSrc = task.expect ?? '.*';

  let expectRegex: RegExp;
  try {
    expectRegex = new RegExp(expectSrc);
  } catch (err) {
    // Same defensive note as above: parseDAG already validated this regex.
    ts.status = 'ERROR';
    ts.startedAt = ts.startedAt ?? Date.now();
    ts.finishedAt = Date.now();
    ts.durationMs = ts.finishedAt - (ts.startedAt ?? ts.finishedAt);
    ts.errorMessage = `Oracle ${task.id} has invalid expect regex: ${
      err instanceof Error ? err.message : String(err)
    }`;
    ts.resultText = ts.errorMessage;
    deps.writer.schedule(deps.cloneState(deps.state));
    return;
  }

  ts.status = 'RUNNING';
  ts.startedAt = Date.now();
  ts.errorMessage = undefined;
  deps.writer.schedule(deps.cloneState(deps.state));

  console.log(
    `[proof] oracle ${task.id} → exec \`${command}\` (expect /${expectSrc}/)`
  );

  const outcome = await execShell(command, options);

  const tailStdout = tail(outcome.stdout, ORACLE_TAIL_CAP);
  const tailStderr = tail(outcome.stderr, ORACLE_TAIL_CAP);
  const combined = `${outcome.stdout}\n${outcome.stderr}`;
  const matched = expectRegex.test(combined);
  // Default contract: an oracle passes iff the command exited 0 AND its
  // combined output matches `expect`. The exit-code requirement is the
  // critical safety property — without it, `&&`-chained commands silently
  // green-light their own failures by matching the default `.*` against
  // their error text. Users who genuinely need to assert on output of a
  // failing command set `allowNonZeroExit: true`.
  const exitOk = task.allowNonZeroExit === true || outcome.exitCode === 0;
  const pass = matched && !outcome.timedOut && exitOk;

  ts.finishedAt = Date.now();
  ts.durationMs = ts.finishedAt - (ts.startedAt ?? ts.finishedAt);
  ts.resultText = formatOracleResult({
    pass,
    command,
    exitCode: outcome.exitCode,
    signal: outcome.signal,
    timedOut: outcome.timedOut,
    stdoutTail: tailStdout,
    stderrTail: tailStderr,
  });
  if (pass) {
    ts.status = 'FINISHED';
  } else {
    ts.status = 'ERROR';
    if (outcome.timedOut) {
      ts.errorMessage = `Oracle ${task.id} timed out after ${options.taskTimeoutMs}ms`;
    } else if (!exitOk) {
      ts.errorMessage = `Oracle ${task.id} command exited ${outcome.exitCode} (set allowNonZeroExit: true to permit non-zero exits)`;
    } else {
      ts.errorMessage = `Oracle ${task.id} expectation /${expectSrc}/ did not match command output`;
    }
  }
  deps.writer.schedule(deps.cloneState(deps.state));

  console.log(
    `[proof] oracle ${task.id} → ${pass ? 'PASS' : 'FAIL'} (exit ${
      outcome.exitCode ?? 'null'
    }, ${ts.durationMs}ms${outcome.timedOut ? ', TIMED OUT' : ''})`
  );
}

interface ExecOutcome {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
}

function execShell(
  command: string,
  options: OracleTaskOptions
): Promise<ExecOutcome> {
  return new Promise<ExecOutcome>((resolve) => {
    const child = spawn(command, {
      shell: true,
      cwd: options.cwd,
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let killTimer: NodeJS.Timeout | undefined;

    const deadlineTimer = setTimeout(() => {
      timedOut = true;
      // SIGTERM first; if the process traps it, SIGKILL after KILL_GRACE_MS.
      try {
        child.kill('SIGTERM');
      } catch {
        // ignore
      }
      killTimer = setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch {
          // ignore
        }
      }, KILL_GRACE_MS);
      killTimer.unref();
    }, options.taskTimeoutMs);
    deadlineTimer.unref();

    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    const finish = (
      exitCode: number | null,
      signal: NodeJS.Signals | null
    ): void => {
      clearTimeout(deadlineTimer);
      if (killTimer) clearTimeout(killTimer);
      resolve({ stdout, stderr, exitCode, signal, timedOut });
    };

    child.on('close', (code, signal) => {
      finish(code, signal);
    });
    child.on('error', (err) => {
      stderr += `\n[spawn error] ${err.message}`;
      finish(null, null);
    });
  });
}

function tail(s: string, cap: number): string {
  if (s.length <= cap) return s;
  const dropped = s.length - cap;
  return `[...truncated ${dropped} earlier chars...]\n${s.slice(-cap)}`;
}

interface OracleResultParts {
  pass: boolean;
  command: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  stdoutTail: string;
  stderrTail: string;
}

function formatOracleResult(parts: OracleResultParts): string {
  const exitDisplay = parts.timedOut
    ? `${parts.exitCode ?? 'null'} (TIMED OUT, signal ${
        parts.signal ?? 'SIGTERM'
      })`
    : parts.signal !== null
    ? `${parts.exitCode ?? 'null'} (signal ${parts.signal})`
    : `${parts.exitCode ?? 'null'}`;
  return [
    `## Pass: ${parts.pass}`,
    `## Command: ${parts.command}`,
    `## Exit code: ${exitDisplay}`,
    `## Stdout (tail):`,
    parts.stdoutTail.trim() === '' ? '(empty)' : parts.stdoutTail,
    `## Stderr (tail):`,
    parts.stderrTail.trim() === '' ? '(empty)' : parts.stderrTail,
  ].join('\n');
}
