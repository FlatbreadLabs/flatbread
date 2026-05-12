/**
 * Entry point. Reads a DAG JSON file, runs each task as a Cursor SDK local
 * subagent in topological order, and writes live status into a `.canvas.tsx`.
 *
 * Modes:
 *
 *   --init-only        Write the initial all-PENDING canvas to disk and exit.
 *                      Use this from the parent agent BEFORE launching the
 *                      runner so the canvas file exists and is clickable in
 *                      chat. Does not require `CURSOR_API_KEY`.
 *
 *   --dry-check-cmds   Walk every `subtask_prompt`, regex-extract shell
 *                      commands, validate them against the workspace, print
 *                      a structured report, exit 0 clean / 1 dirty. Does
 *                      not require `CURSOR_API_KEY` and does not mutate the
 *                      canvas file.
 *
 *   (default)          Run the DAG end-to-end. Reuses an existing canvas
 *                      file at the same path if one exists, otherwise
 *                      creates it.
 *
 * Path selection (in order of precedence):
 *   --canvas-path <abs-path>           Full canvas path (preferred for parent-managed flow).
 *   --canvas <name> [--canvases-dir]   Compose path from a name + dir.
 *
 * Other options:
 *   --cwd <dir>              Working dir each subagent operates in (default: process.cwd()).
 *   --models-file <path>     Optional JSON complexity -> model override map.
 *   --debounce <ms>          Canvas write debounce (default: 200).
 *   --task-timeout-ms <ms>   Per-task timeout guard (default: 20m). Also
 *                            bounds how long a `kind: 'pause'` task waits
 *                            for sentinel removal before it errors out.
 *   --stream-publish-ms <ms> Throttle live stream publishes (default: 500ms).
 *   --full-output-dir <path> Per-task transcripts as `${taskId}.md` plus
 *                             `_index.md` (run summary table) and `_dag.json`
 *                             (the original DAG definition). Defaults to
 *                             `<cwd>/.flatbread/artifacts/dag-<title-slug>-<ts>/`
 *                             when omitted. Override with an explicit path or
 *                             suppress entirely with `--no-artifacts`.
 *   --no-artifacts           Skip writing per-task transcripts, _index.md,
 *                             and _dag.json (does not suppress `--findings-dir`
 *                             JSON sidecars). Useful when only the live canvas
 *                             is needed.
 *   --findings-dir <path>    JSON sidecars per task as
 *                             `${taskId}.findings.json` (or
 *                             `${taskId}.iter<n>.findings.json` for
 *                             convergence re-runs). Schema:
 *                             `{ taskId, iteration, status, durationMs,
 *                                sections }`. When set, `--converge-on`
 *                             reads sidecars as a fallback when only bounded
 *                             `resultText` is available cross-process (the
 *                             live runner prefers the authoritative in-memory
 *                             transcript whenever the same process executes the
 *                             loop). Relative paths resolve against
 *                             --cwd. Oracle tasks are included — their
 *                             standardized `## Pass` / `## Command` /
 *                             `## Exit code` / `## Stdout (tail)` /
 *                             `## Stderr (tail)` headings round-trip
 *                             through the same parser as regular tasks.
 *   --checkpoint-dir <path>  Directory for `kind: 'pause'` sentinel files
 *                             (default `.proof/` under --cwd).
 *   --converge-on <task-id>  After the main DAG run, parse the named task's
 *                             authoritative transcript for `## Blockers` /
 *                             `## High-severity findings` (fallbacks to bounded
 *                             `resultText` / `--findings-dir` after restarts).
 *                             If non-empty,
 *                             re-execute the entire upstream ancestor
 *                             subtree with the convergence task's latest
 *                             result appended as context, then re-execute
 *                             the convergence task. Loop until clean or
 *                             --max-iterations is reached.
 *   --max-iterations <N>     Convergence iteration ceiling (default: 3).
 *   --state-path <path>      Persist resumable runner state after each rank.
 *                             Defaults to `.proof/run-state.json` when
 *                             --restart-on-runner-change is enabled.
 *   --resume-state <path>    Resume from a previously persisted state file.
 *   --restart-on-runner-change
 *                             Detect edits to runner runtime files after rank
 *                             boundaries / convergence re-runs, persist state,
 *                             mark the canvas RESTARTING_RUNNER, and exit 75
 *                             so `run_dag_supervisor.ts` can relaunch under the
 *                             newly edited source.
 */

import { Agent, Cursor } from '@cursor/sdk';
import { existsSync } from 'node:fs';
import { setMaxListeners } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  parseDAG,
  COMPLEXITY_KEYS,
  computeRanks,
  createCatalogBackedModelResolver,
  createModelSelectionResolver,
  formatModelSelection,
  normalizeModelSelection,
  resolveConvergenceLoops,
  validateModelMap,
} from './dag.js';
import type {
  DAG,
  DAGBudget,
  ModelSelection,
  ModelSpec,
  ModelMapOverride,
  RawTask,
  TaskKind,
} from './dag.js';
import {
  CanvasWriter,
  initialRunState,
  type RunState,
  type TaskState,
} from './canvas_writer.js';
import {
  formatDryCheckReport,
  loadWorkspaceFacts,
  runDryCheck,
} from './dry_check_cmds.js';
import { runPauseTask } from './pause_task.js';
import { runOracleTask } from './oracle_task.js';
import {
  readFindingsSidecarAsText,
  writeFindingsSidecar,
} from './findings_sidecar.js';
import {
  buildConvergenceContext,
  extractConvergenceFindings,
  resolveLoopReexecuteIds,
  transitiveAncestors,
} from './converge_loop.js';
import {
  EXIT_RUNNER_RESTART,
  changedRunnerRuntimeFiles,
  readPersistedRunState,
  snapshotRunnerRuntimeFiles,
  writePersistedRunState,
  type RunnerFileSnapshot,
} from './self_hosting.js';
import {
  TaskTranscriptStore,
  taskStreamArtifactRelPath,
} from './task_transcript.js';
import {
  CANVAS_DISPLAY_CAP,
  excerptUpstreamForPrompt,
  type UpstreamPolicyMode,
} from './upstream_policy.js';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
/**
 * Source-of-truth directory for `--restart-on-runner-change` snapshotting.
 *
 * When the runner ships compiled (typical install-time use), `SCRIPTS_DIR`
 * resolves to `<pkg>/dist`. The TS source lives in `<pkg>/src`, so the
 * change detector points there. When running directly from source via
 * `tsx src/run_dag.ts`, both directories coincide.
 */
const RUNNER_SOURCE_DIR = SCRIPTS_DIR.endsWith('/src')
  ? SCRIPTS_DIR
  : resolve(SCRIPTS_DIR, '..', 'src');

interface CliArgs {
  dag: string;
  /** Empty in `--dry-check-cmds` mode (no canvas is written). */
  canvasPath: string;
  cwd: string;
  modelsFile?: string;
  fullOutputDir?: string;
  /**
   * When set, the runner emits per-task JSON sidecars summarizing each
   * task's parsed `## Heading` sections — including `kind: 'oracle'`,
   * which uses the same heading shape (`## Pass`, `## Command`, `## Exit
   * code`, `## Stdout (tail)`, `## Stderr (tail)`) and rides through the
   * same extractor. Convergence loop reads these sidecars instead of
   * re-parsing `resultText` when both flags are on.
   */
  findingsDir?: string;
  debounceMs: number;
  taskTimeoutMs: number;
  streamPublishMs: number;
  streamIdleTimeoutMs: number;
  initOnly: boolean;
  dryCheckCmds: boolean;
  /** Absolute dir for `kind: 'pause'` sentinel files. Defaults to `<cwd>/.proof`. */
  checkpointDir: string;
  /** When set, the runner re-executes ancestors after the named task to converge on a clean review. */
  convergeOn?: string;
  /** Convergence iteration ceiling (default 3). */
  maxIterations: number;
  /** Optional resumable state path. If omitted, no state file is written. */
  statePath?: string;
  /** Load prior `RunState` from this path before executing ranks. */
  resumeState?: string;
  /** Exit 75 after persisting state when runner runtime files change. */
  restartOnRunnerChange: boolean;
  /** When true, skip writing per-task markdown transcripts and the run index. */
  noArtifacts: boolean;
}

interface RunnerTaskRun {
  stream: () => AsyncIterable<unknown>;
  wait: () => Promise<{
    status: string;
    durationMs?: number;
    usage?: { inputTokens?: number; outputTokens?: number };
  }>;
  cancel?: () => Promise<void> | void;
  status?: string;
  durationMs?: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i++;
    } else {
      args[key] = 'true';
    }
  }
  if (!args.dag) throw new Error('--dag <path> is required');

  const cwd = args.cwd ?? process.cwd();
  const initOnly = args['init-only'] === 'true';
  const dryCheckCmds = args['dry-check-cmds'] === 'true';

  // --canvas-path / --canvas are not required in --dry-check-cmds mode (we
  // never touch the canvas file). Other modes still require a canvas target.
  let canvasPath = args['canvas-path'] ?? '';
  if (!dryCheckCmds) {
    if (!canvasPath) {
      if (!args.canvas) {
        throw new Error(
          'Provide either --canvas-path <abs-path> or --canvas <name>'
        );
      }
      const canvasesDir = args['canvases-dir'] ?? defaultCanvasesDir(cwd);
      const stem = args.canvas.replace(/\.canvas\.tsx$/, '');
      canvasPath = join(canvasesDir, `${stem}.canvas.tsx`);
    }
    if (!canvasPath.endsWith('.canvas.tsx')) {
      canvasPath = canvasPath.replace(/\.tsx$/, '') + '.canvas.tsx';
    }
  }

  const debounceMs = parsePositiveInt(args.debounce, 200, '--debounce');
  const taskTimeoutMs = parsePositiveInt(
    args['task-timeout-ms'],
    DEFAULT_TASK_TIMEOUT_MS,
    '--task-timeout-ms'
  );
  const streamPublishMs = parsePositiveInt(
    args['stream-publish-ms'],
    DEFAULT_STREAM_PUBLISH_MS,
    '--stream-publish-ms'
  );
  const streamIdleTimeoutMs = parsePositiveInt(
    args['stream-idle-timeout-ms'],
    DEFAULT_STREAM_IDLE_TIMEOUT_MS,
    '--stream-idle-timeout-ms'
  );
  const maxIterations = parsePositiveInt(
    args['max-iterations'],
    DEFAULT_MAX_ITERATIONS,
    '--max-iterations'
  );
  const fullOutputRaw = args['full-output-dir'];
  const findingsRaw = args['findings-dir'];
  const checkpointRaw = args['checkpoint-dir'];
  const checkpointDir = isAbsolute(checkpointRaw ?? '')
    ? (checkpointRaw as string)
    : resolve(cwd, checkpointRaw ?? '.proof');
  const convergeRaw = args['converge-on'];
  const convergeOn =
    convergeRaw !== undefined && convergeRaw !== '' && convergeRaw !== 'true'
      ? convergeRaw
      : undefined;
  const restartOnRunnerChange = args['restart-on-runner-change'] === 'true';
  const resumeStateRaw = args['resume-state'];
  const resumeState =
    resumeStateRaw !== undefined &&
    resumeStateRaw !== '' &&
    resumeStateRaw !== 'true'
      ? resumeStateRaw
      : undefined;
  const statePathRaw = args['state-path'];
  const statePath =
    statePathRaw !== undefined && statePathRaw !== '' && statePathRaw !== 'true'
      ? statePathRaw
      : restartOnRunnerChange
      ? resumeState ?? '.proof/run-state.json'
      : undefined;

  return {
    dag: args.dag,
    canvasPath,
    cwd,
    modelsFile: args['models-file'],
    fullOutputDir:
      fullOutputRaw !== undefined &&
      fullOutputRaw !== '' &&
      fullOutputRaw !== 'true'
        ? fullOutputRaw
        : undefined,
    findingsDir:
      findingsRaw !== undefined && findingsRaw !== '' && findingsRaw !== 'true'
        ? findingsRaw
        : undefined,
    debounceMs,
    taskTimeoutMs,
    streamPublishMs,
    streamIdleTimeoutMs,
    initOnly,
    dryCheckCmds,
    checkpointDir,
    convergeOn,
    maxIterations,
    statePath,
    resumeState,
    restartOnRunnerChange,
    noArtifacts: args['no-artifacts'] === 'true',
  };
}

function parsePositiveInt(
  raw: string | undefined,
  fallback: number,
  flag: string
): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return n;
}

interface ModelOverrideSources {
  dagModels: ModelMapOverride | undefined;
  fileModels: ModelMapOverride | undefined;
}

function mergeModelOverrides({
  dagModels,
  fileModels,
}: ModelOverrideSources): ModelMapOverride {
  return { ...(dagModels ?? {}), ...(fileModels ?? {}) };
}

/** Relative --dag / --models-file paths are resolved against --cwd, not process.cwd() (pnpm --dir … can differ). */
function resolveAgainstCwd(rawPath: string, cwd: string): string {
  return isAbsolute(rawPath) ? rawPath : resolve(cwd, rawPath);
}

/** Optional platform package bundled with `@cursor/sdk` (`prepare:rg`); required for local agent ignore maps. */
function cursorSdkRipgrepBundlePackage(): string | undefined {
  const { platform, arch } = process;
  if (platform === 'darwin') {
    return arch === 'arm64'
      ? '@cursor/sdk-darwin-arm64'
      : arch === 'x64'
      ? '@cursor/sdk-darwin-x64'
      : undefined;
  }
  if (platform === 'linux') {
    return arch === 'arm64'
      ? '@cursor/sdk-linux-arm64'
      : arch === 'x64'
      ? '@cursor/sdk-linux-x64'
      : undefined;
  }
  if (platform === 'win32' && arch === 'x64') {
    return '@cursor/sdk-win32-x64';
  }
  return undefined;
}

/** Local SDK agents call `configureRipgrepPath` from an absolute env var; CLI runs must set this. */
function ensureCursorRipgrepPathEnv(): void {
  const configured = process.env.CURSOR_RIPGREP_PATH;
  if (
    configured &&
    configured.length > 0 &&
    isAbsolute(configured) &&
    existsSync(configured)
  ) {
    return;
  }

  const bundlePkg = cursorSdkRipgrepBundlePackage();
  if (!bundlePkg) {
    console.warn(
      '[proof] No bundled ripgrep target for platform; set CURSOR_RIPGREP_PATH to an absolute `rg` path if local agents fail.'
    );
    return;
  }

  const req = createRequire(import.meta.url);
  try {
    const pkgDir = dirname(req.resolve(`${bundlePkg}/package.json`));
    const rgName = process.platform === 'win32' ? 'rg.exe' : 'rg';
    const rgPath = join(pkgDir, 'bin', rgName);
    if (existsSync(rgPath)) {
      process.env.CURSOR_RIPGREP_PATH = rgPath;
      return;
    }
  } catch {
    // Optional dependency missing for this OS/arch — user can set CURSOR_RIPGREP_PATH.
  }
  console.warn(
    `[proof] Could not resolve bundled ripgrep from ${bundlePkg}. Install optional @cursor deps or export CURSOR_RIPGREP_PATH=/absolute/path/to/rg`
  );
}

/** Mirrors the canvas skill's path scheme. */
function defaultCanvasesDir(cwd: string): string {
  const slug = cwd
    .replace(/^\//, '')
    .replace(/\/+$/, '')
    .split('/')
    .map((seg) => seg.replace(/[^A-Za-z0-9._-]/g, '-'))
    .join('-');
  return join(homedir(), '.cursor', 'projects', slug, 'canvases');
}

function slugifyTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Default artifacts directory under the repo (`--cwd`) tree so transcripts
 * live beside the workspace (Flatbread convention: `.flatbread/`). Timestamped
 * so repeated runs accumulate rather than overwriting each other.
 */
function defaultArtifactsDir(cwd: string, dagTitleSlug: string): string {
  const slug = dagTitleSlug || 'untitled';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return join(
    resolve(cwd),
    '.flatbread',
    'artifacts',
    `dag-${slug}-${timestamp}`
  );
}

async function loadResumedRunState(
  statePath: string,
  dag: DAG,
  modelForComplexity: (c: RawTask['complexity']) => ModelSpec
): Promise<RunState> {
  const persisted = await readPersistedRunState(statePath);
  const state = persisted.state;
  const expectedIds = new Set(dag.tasks.map((t) => t.id));
  const actualIds = new Set(state.tasks.map((t) => t.id));
  const missing = [...expectedIds].filter((id) => !actualIds.has(id));
  const extra = [...actualIds].filter((id) => !expectedIds.has(id));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `Resume state ${statePath} does not match DAG tasks. Missing: ${
        missing.join(', ') || '(none)'
      }; extra: ${extra.join(', ') || '(none)'}`
    );
  }

  const taskById = new Map(dag.tasks.map((task) => [task.id, task]));
  for (const ts of state.tasks) {
    const task = taskById.get(ts.id)!;
    // Refresh static task metadata from the current DAG/source snapshot while
    // preserving execution fields (status, timings, result text, iteration).
    ts.depends_on = task.depends_on;
    ts.complexity = task.complexity;
    ts.subtask_prompt = task.subtask_prompt;
    const modelSelection = normalizeModelSelection(
      modelForComplexity(task.complexity),
      `model for task ${task.id}`
    );
    ts.model = formatModelSelection(modelSelection);
    ts.modelSelection = modelSelection;
    ts.kind = task.kind ?? 'task';
    ts.command = task.kind === 'oracle' ? task.command : undefined;
    ts.expect = task.kind === 'oracle' ? task.expect : undefined;
    if (ts.status === 'RUNNING') {
      // A persisted RUNNING task means the previous process died mid-task.
      // This restart mode only guarantees clean boundary restarts; re-queue
      // the task rather than pretending the in-flight work completed.
      ts.status = 'PENDING';
      ts.startedAt = undefined;
      ts.finishedAt = undefined;
      ts.durationMs = undefined;
      ts.errorMessage =
        'Re-queued after runner restart while task was RUNNING.';
    }
  }

  if (state.runOutcome === 'RESTARTING_RUNNER') {
    state.runOutcome = undefined;
    state.runMessage = `Resumed from ${statePath} after runner restart.`;
    state.finishedAt = undefined;
  }
  return state;
}

function isResumeTerminalStatus(status: TaskState['status']): boolean {
  return (
    status === 'FINISHED' || status === 'ERROR' || status === 'BUDGET-EXCEEDED'
  );
}

function taskModelSelection(ts: TaskState): ModelSelection {
  return (
    ts.modelSelection ??
    // Fallback path is for legacy persisted run-state (before modelSelection).
    // In that shape ts.model is always a plain model id (not formatted output).
    normalizeModelSelection(ts.model, `task ${ts.id} model`)
  );
}

async function fetchCursorModelCatalog(): Promise<
  Awaited<ReturnType<typeof Cursor.models.list>>
> {
  try {
    return await Cursor.models.list();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not fetch Cursor model catalog. Check CURSOR_API_KEY and network connectivity. Original error: ${message}`
    );
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // --dry-check-cmds: short-circuit before any SDK / canvas / API-key work.
  // The contract here is "given a DAG file and a workspace, would these
  // shell commands actually run?" — pure parse + filesystem inspection.
  if (args.dryCheckCmds) {
    const dagPath = resolveAgainstCwd(args.dag, args.cwd);
    const dryRaw = JSON.parse(await readFile(dagPath, 'utf8'));
    const dryDag = parseDAG(dryRaw);
    const facts = await loadWorkspaceFacts(args.cwd);
    const report = runDryCheck(dryDag, facts);
    console.log(formatDryCheckReport(report));
    process.exitCode = report.isDirty ? 1 : 0;
    return;
  }

  if (!args.initOnly) {
    ensureCursorRipgrepPathEnv();
  }

  if (!args.initOnly && !process.env.CURSOR_API_KEY) {
    throw new Error(
      'CURSOR_API_KEY is not set. Export it or `set -a && source .env && set +a` first.'
    );
  }

  // The SDK may legitimately attach many AbortSignal listeners for concurrent local runs.
  // Raising the process default prevents noisy MaxListenersExceeded warnings.
  setMaxListeners(ABORT_SIGNAL_LISTENER_LIMIT);

  const dagPath = resolveAgainstCwd(args.dag, args.cwd);
  const raw = JSON.parse(await readFile(dagPath, 'utf8'));
  const dag = parseDAG(raw);
  const fileModels =
    args.modelsFile === undefined
      ? undefined
      : validateModelMap(
          JSON.parse(
            await readFile(resolveAgainstCwd(args.modelsFile, args.cwd), 'utf8')
          ),
          `--models-file ${args.modelsFile}`
        );
  const unresolvedModelForComplexity = createModelSelectionResolver(
    mergeModelOverrides({ dagModels: dag.models, fileModels })
  );
  const modelForComplexity = args.initOnly
    ? unresolvedModelForComplexity
    : createCatalogBackedModelResolver(
        unresolvedModelForComplexity,
        await fetchCursorModelCatalog()
      );
  if (!args.initOnly) {
    for (const complexity of COMPLEXITY_KEYS) {
      modelForComplexity(complexity);
    }
    console.log(
      '[proof] validated model selections against Cursor.models.list()'
    );
  }
  const ranks = computeRanks(dag);

  if (args.convergeOn && !dag.tasks.some((t) => t.id === args.convergeOn)) {
    throw new Error(
      `--converge-on "${args.convergeOn}" is not a task id in DAG "${dag.title}"`
    );
  }
  // The CLI flag and the DAG-native `loops` config both produce convergence
  // loops; combining them silently would force a precedence rule and make
  // reproducible runs depend on whether someone remembered to pass the
  // flag. Reject the combination outright.
  if (args.convergeOn && dag.loops && dag.loops.length > 0) {
    throw new Error(
      `--converge-on "${args.convergeOn}" cannot be combined with DAG.loops (DAG "${dag.title}" already declares ${dag.loops.length} loop(s)). Remove the CLI flag to use the DAG's loops, or delete DAG.loops for an ad-hoc CLI-driven run.`
    );
  }
  // Synthesize a single-element loop list from the CLI flag so the runner
  // treats both entry points uniformly. `--max-iterations` (CLI) feeds the
  // synthesized loop's `maxIterations`; `dag.budget.maxIterations`
  // continues to apply on top per-loop via the existing budget check.
  const resolvedLoops =
    dag.loops !== undefined && dag.loops.length > 0
      ? resolveConvergenceLoops(dag.loops)
      : args.convergeOn !== undefined
      ? resolveConvergenceLoops([
          { convergeOn: args.convergeOn, maxIterations: args.maxIterations },
        ])
      : [];

  const fullOutputAbsoluteDir: string | undefined = (() => {
    if (args.noArtifacts || args.initOnly || args.dryCheckCmds)
      return undefined;
    if (args.fullOutputDir !== undefined) {
      return resolveAgainstCwd(args.fullOutputDir, args.cwd);
    }
    return defaultArtifactsDir(args.cwd, slugifyTitle(dag.title));
  })();
  if (fullOutputAbsoluteDir) {
    await mkdir(fullOutputAbsoluteDir, { recursive: true });
    console.log(`[proof] artifacts → ${fullOutputAbsoluteDir}`);
    await writeFile(
      join(fullOutputAbsoluteDir, '_dag.json'),
      JSON.stringify(raw, null, 2),
      'utf8'
    );
  }

  const findingsAbsoluteDir =
    args.findingsDir !== undefined
      ? resolveAgainstCwd(args.findingsDir, args.cwd)
      : undefined;
  if (findingsAbsoluteDir && !args.initOnly) {
    await mkdir(findingsAbsoluteDir, { recursive: true });
    console.log(`[proof] findings-dir → ${findingsAbsoluteDir}`);
  }

  const statePathAbsolute =
    args.statePath !== undefined
      ? resolveAgainstCwd(args.statePath, args.cwd)
      : undefined;
  const resumeStateAbsolute =
    args.resumeState !== undefined
      ? resolveAgainstCwd(args.resumeState, args.cwd)
      : undefined;
  const state =
    resumeStateAbsolute !== undefined
      ? await loadResumedRunState(resumeStateAbsolute, dag, modelForComplexity)
      : initialRunState(dag, modelForComplexity);
  const stateById = new Map<string, TaskState>(
    state.tasks.map((t) => [t.id, t])
  );
  const transcriptStore = new TaskTranscriptStore();
  if (fullOutputAbsoluteDir) {
    for (const taskState of state.tasks) {
      if (taskState.transcriptPath) {
        transcriptStore.registerExistingMirror(
          taskState.id,
          fullOutputAbsoluteDir,
          taskState.transcriptPath
        );
      }
    }
  }
  const upstreamMode: UpstreamPolicyMode =
    dag.outputPolicy?.upstream === 'full' ? 'full' : 'summarize';
  const runnerSnapshot = args.restartOnRunnerChange
    ? await snapshotRunnerRuntimeFiles(RUNNER_SOURCE_DIR)
    : undefined;

  const writer = new CanvasWriter(args.canvasPath, args.debounceMs);
  let finalized = false;
  let interrupting = false;
  let indexWritten = false;

  console.log(
    `[proof] DAG "${dag.title}" — ${dag.tasks.length} tasks across ${ranks.length} rank(s)`
  );
  console.log(`[proof] canvas → ${args.canvasPath}`);
  if (resumeStateAbsolute) {
    console.log(`[proof] resumed state ← ${resumeStateAbsolute}`);
  }
  if (statePathAbsolute) {
    console.log(`[proof] state-path → ${statePathAbsolute}`);
  }

  // Always write the initial all-PENDING canvas first. This is what the parent
  // agent surfaces as a clickable path before any subagent runs.
  writer.schedule(structuredCloneState(state));
  await writer.flush();
  await persistState('initial state');

  if (args.initOnly) {
    console.log('[proof] --init-only: initial canvas written, exiting');
    return;
  }

  // The Cursor SDK fires background unawaited promises during agent init
  // (e.g. team-repo lookup); when one of those rejects (auth, network) it
  // would otherwise crash the runner before per-task error handling fires.
  // Convert them to a log line so the runner can still mark the task as
  // ERROR, finalize the canvas, and exit cleanly.
  const onUnhandledRejection = (reason: unknown) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    console.error(`[proof] (suppressed unhandled SDK rejection) ${msg}`);
  };
  const onUncaughtException = (err: Error): void => {
    const msg = err?.stack ?? err?.message ?? String(err);
    console.error(`[proof] uncaught exception: ${msg}`);
    void failAndExit(1, 'FAILED', `Runner crashed: ${err.message}`);
  };
  const onSignal = (signal: NodeJS.Signals): void => {
    const exitCode = signal === 'SIGINT' ? 130 : 143;
    console.error(`[proof] received ${signal}; finalizing canvas before exit`);
    void failAndExit(
      exitCode,
      'INTERRUPTED',
      `Runner interrupted by ${signal}`
    );
  };

  async function persistState(reason: string): Promise<void> {
    if (statePathAbsolute === undefined) return;
    await writePersistedRunState(statePathAbsolute, state, reason);
  }

  async function maybeRestartAfterRunnerChange(
    boundary: string
  ): Promise<void> {
    if (!args.restartOnRunnerChange || runnerSnapshot === undefined) return;
    const changed = await changedRunnerRuntimeFiles(runnerSnapshot);
    if (changed.length === 0) return;
    state.runOutcome = 'RESTARTING_RUNNER';
    state.runMessage = `Runner runtime files changed after ${boundary}; supervisor should restart from persisted state. Changed: ${changed.join(
      ', '
    )}`;
    writer.schedule(structuredCloneState(state));
    await writer.flush();
    await persistState(`runner source changed after ${boundary}`);
    console.log(
      `[proof] runner source changed after ${boundary}; persisted state and exiting ${EXIT_RUNNER_RESTART}`
    );
    console.log(`[proof] changed runner files: ${changed.join(', ')}`);
    process.exit(EXIT_RUNNER_RESTART);
  }

  async function failAndExit(
    exitCode: number,
    outcome: 'FAILED' | 'INTERRUPTED',
    message: string
  ): Promise<void> {
    if (interrupting) return;
    interrupting = true;
    try {
      await markRunTerminated(state, message, outcome);
      writer.schedule(structuredCloneState(state));
      await writer.flush();
      if (fullOutputAbsoluteDir && !indexWritten) {
        await writeRunIndexMarkdown(
          fullOutputAbsoluteDir,
          dag.title,
          state.tasks,
          {
            startedAt: state.startedAt,
            finishedAt: state.finishedAt,
            runOutcome: state.runOutcome,
            runMessage: state.runMessage,
          }
        ).catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`[proof] _index.md write failed: ${msg}`);
        });
        indexWritten = true;
      }
    } catch (flushErr) {
      const flushMsg =
        flushErr instanceof Error ? flushErr.message : String(flushErr);
      console.error(
        `[proof] failed to flush canvas during shutdown: ${flushMsg}`
      );
    } finally {
      finalized = true;
      process.exit(exitCode);
    }
  }

  process.on('unhandledRejection', onUnhandledRejection);
  process.on('uncaughtException', onUncaughtException);
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  process.on('SIGHUP', onSignal);

  const baseRunOptions: RunTaskOptions = {
    taskTimeoutMs: args.taskTimeoutMs,
    streamPublishMs: args.streamPublishMs,
    streamIdleTimeoutMs: args.streamIdleTimeoutMs,
    fullOutputAbsoluteDir,
    dagTitle: dag.title,
    framing: dag.framing,
    upstreamMode,
    transcriptStore,
  };

  const runOne = async (
    task: RawTask,
    overrides?: Partial<RunTaskOptions>
  ): Promise<void> => {
    const failedDeps = task.depends_on.filter((depId) => {
      const dep = stateById.get(depId);
      return (
        dep !== undefined &&
        (dep.status === 'ERROR' || dep.status === 'BUDGET-EXCEEDED')
      );
    });
    if (failedDeps.length > 0) {
      return skipTask(
        task,
        stateById,
        state,
        writer,
        failedDeps,
        fullOutputAbsoluteDir,
        dag.title
      );
    }
    if (effectiveTaskKind(task) === 'pause') {
      const ts = stateById.get(task.id)!;
      await runPauseTask(
        task,
        ts,
        {
          checkpointDir: args.checkpointDir,
          taskTimeoutMs: overrides?.taskTimeoutMs ?? args.taskTimeoutMs,
        },
        {
          state,
          writer,
          cloneState: structuredCloneState,
        }
      );
      if (fullOutputAbsoluteDir) {
        await persistTaskMarkdownFile(
          fullOutputAbsoluteDir,
          dag.title,
          ts,
          ts.resultText ?? ''
        ).catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`[proof] artifact write failed for ${task.id}: ${msg}`);
        });
      }
      return;
    }
    if (effectiveTaskKind(task) === 'oracle') {
      const ts = stateById.get(task.id)!;
      await runOracleTask(
        task,
        ts,
        {
          cwd: args.cwd,
          taskTimeoutMs: overrides?.taskTimeoutMs ?? args.taskTimeoutMs,
        },
        {
          state,
          writer,
          cloneState: structuredCloneState,
        }
      );
      if (fullOutputAbsoluteDir) {
        await persistTaskMarkdownFile(
          fullOutputAbsoluteDir,
          dag.title,
          ts,
          ts.resultText ?? ''
        ).catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`[proof] artifact write failed for ${task.id}: ${msg}`);
        });
      }
      return;
    }
    return runTask(task, stateById, state, writer, args.cwd, {
      ...baseRunOptions,
      ...(overrides ?? {}),
    });
  };

  /**
   * Wraps `runOne` so a `--findings-dir` JSON sidecar is written after every
   * task completes — including `kind: 'oracle'`, whose `resultText` already
   * follows the same `## Heading` pattern (`## Pass`, `## Command`, `## Exit
   * code`, `## Stdout (tail)`, `## Stderr (tail)`) and so flows through the
   * same `parseSections` extractor without a parallel implementation.
   * Sidecar errors are logged but never escalated — losing a sidecar must
   * not abort the rest of the DAG.
   */
  const dispatchTask = async (
    task: RawTask,
    overrides?: Partial<RunTaskOptions>
  ): Promise<void> => {
    await runOne(task, overrides);
    if (findingsAbsoluteDir !== undefined) {
      const ts = stateById.get(task.id);
      if (ts) {
        try {
          const transcriptBody = transcriptStore.getJoined(task.id);
          const parseSource =
            effectiveTaskKind(task) === 'task' && transcriptBody.length > 0
              ? transcriptBody
              : undefined;
          await writeFindingsSidecar(findingsAbsoluteDir, ts, {
            parseSource,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            `[proof] findings sidecar write failed for ${task.id}: ${msg}`
          );
        }
      }
    }
  };

  try {
    for (let rankIdx = 0; rankIdx < ranks.length; rankIdx++) {
      const rank = ranks[rankIdx];
      const runnableRank = rank.filter((task) => {
        const ts = stateById.get(task.id);
        return ts === undefined || !isResumeTerminalStatus(ts.status);
      });
      if (runnableRank.length === 0) {
        console.log(
          `[proof] rank ${rankIdx + 1}/${ranks.length}: ${rank
            .map((t) => t.id)
            .join(', ')} (already complete; skipping)`
        );
        continue;
      }
      console.log(
        `[proof] rank ${rankIdx + 1}/${ranks.length}: ${runnableRank
          .map((t) => t.id)
          .join(', ')}`
      );
      await Promise.all(runnableRank.map((task) => dispatchTask(task)));
      enforceTokenBudget(state, dag.budget);
      writer.schedule(structuredCloneState(state));
      await writer.flush();
      await persistState(`completed rank ${rankIdx + 1}/${ranks.length}`);
      await maybeRestartAfterRunnerChange(`rank ${rankIdx + 1}`);
    }

    await maybeRestartAfterRunnerChange('main ranks before convergence');
    // Loops execute sequentially in declaration order. `parseDAG()` already
    // rejected overlapping re-execution sets, so one loop cannot silently
    // invalidate another loop's converged task state by re-running shared
    // ancestors afterwards. A loop that hits BUDGET-EXCEEDED still lets later
    // loops run — each loop's terminal state is independent and surfaces
    // through the per-task status tally, the same way the legacy single-loop
    // CLI worked.
    for (const loop of resolvedLoops) {
      const reExecIds = resolveLoopReexecuteIds(loop, dag);
      await runConvergenceLoop({
        loopId: loop.id,
        convergeOn: loop.convergeOn,
        maxIterations: loop.maxIterations,
        reExecIds,
        ranks,
        stateById,
        transcriptStore,
        upstreamMode,
        dispatchTask,
        writer,
        state,
        findingsDir: findingsAbsoluteDir,
        budget: dag.budget,
        afterIteration: async (iteration: number) => {
          writer.schedule(structuredCloneState(state));
          await writer.flush();
          await persistState(`completed ${loop.id} iteration ${iteration}`);
          await maybeRestartAfterRunnerChange(
            `${loop.id} iteration ${iteration}`
          );
        },
      });
    }

    state.finishedAt = Date.now();
    const errors = state.tasks.filter((t) => t.status === 'ERROR');
    const budgetHits = state.tasks.filter(
      (t) => t.status === 'BUDGET-EXCEEDED'
    );
    // Errors win over budget hits because a hard ERROR is a louder signal
    // than a budget overflow — wrappers keying on `runOutcome` should still
    // see `'FAILED'` when any task crashed, even if convergence also burned
    // through `--max-iterations`. When the run only tripped budget ceilings
    // (the `--converge-on` exhaustion path or `dag.budget.maxTokensTotal`
    // via `BudgetExceededError`), surface that distinctly so wrappers can
    // branch on `BUDGET_EXCEEDED` without parsing log output.
    state.runOutcome =
      errors.length > 0
        ? 'FAILED'
        : budgetHits.length > 0
        ? 'BUDGET_EXCEEDED'
        : 'SUCCESS';
    if (errors.length > 0 || budgetHits.length > 0) {
      const parts: string[] = [];
      if (errors.length > 0) {
        parts.push(`failed: ${errors.map((e) => e.id).join(', ')}`);
      }
      if (budgetHits.length > 0) {
        parts.push(
          `budget exceeded: ${budgetHits.map((b) => b.id).join(', ')}`
        );
      }
      state.runMessage = parts.join(' · ');
    }
    writer.schedule(structuredCloneState(state));
    await writer.flush();
    finalized = true;

    if (fullOutputAbsoluteDir) {
      await writeRunIndexMarkdown(
        fullOutputAbsoluteDir,
        dag.title,
        state.tasks,
        {
          startedAt: state.startedAt,
          finishedAt: state.finishedAt,
          runOutcome: state.runOutcome,
          runMessage: state.runMessage,
        }
      ).catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[proof] _index.md write failed: ${msg}`);
      });
      // Skip the defensive `finally` rewrite now that this attempt finished
      // (success or logged failure).
      indexWritten = true;
    }

    const succeeded = state.tasks.length - errors.length - budgetHits.length;
    console.log(
      `[proof] done — ${succeeded}/${
        state.tasks.length
      } succeeded in ${formatMs(state.finishedAt - state.startedAt)}`
    );
    if (errors.length > 0) {
      console.log(`[proof] errors: ${errors.map((e) => e.id).join(', ')}`);
      process.exitCode = 1;
    }
    if (budgetHits.length > 0) {
      console.log(
        `[proof] budget-exceeded: ${budgetHits.map((b) => b.id).join(', ')}`
      );
      // Distinct from the generic ERROR exit (1) so wrapper scripts can
      // branch on budget. We only upgrade `0`; a prior ERROR-driven `1`
      // wins because the user almost certainly wants the louder failure.
      if (!process.exitCode) {
        process.exitCode = EXIT_BUDGET_EXCEEDED;
      }
    }
    if (fullOutputAbsoluteDir) {
      console.log(
        `[proof] full transcripts + index (_index.md) → ${fullOutputAbsoluteDir}`
      );
    }
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      // Halt the entire run: mark unfinished tasks as ERROR with a budget
      // note, set runOutcome BUDGET_EXCEEDED, finalize the canvas, and exit
      // with the dedicated EXIT_BUDGET_EXCEEDED so wrapper scripts can
      // branch on this case without parsing log output. Mirrors the
      // `--converge-on` exhaustion path so both budget-overflow surfaces
      // expose the same `runOutcome` enum value.
      await markRunTerminated(state, err.message, 'BUDGET_EXCEEDED');
      writer.schedule(structuredCloneState(state));
      await writer.flush();
      finalized = true;
      // process.exit() bypasses the finally block, so write _index.md here.
      if (fullOutputAbsoluteDir && !indexWritten) {
        await writeRunIndexMarkdown(
          fullOutputAbsoluteDir,
          dag.title,
          state.tasks,
          {
            startedAt: state.startedAt,
            finishedAt: state.finishedAt,
            runOutcome: state.runOutcome,
            runMessage: state.runMessage,
          }
        ).catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`[proof] _index.md write failed: ${msg}`);
        });
        indexWritten = true;
      }
      console.error(`[proof] ${err.message}`);
      process.exit(EXIT_BUDGET_EXCEEDED);
    }
    const msg = err instanceof Error ? err.message : String(err);
    await markRunTerminated(state, `Runner failed: ${msg}`, 'FAILED');
    writer.schedule(structuredCloneState(state));
    await writer.flush();
    finalized = true;
    throw err;
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
    process.off('uncaughtException', onUncaughtException);
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    process.off('SIGHUP', onSignal);
    if (!finalized && !interrupting) {
      // Defensive fallback: if control flow exits unexpectedly, reflect this in-canvas.
      await markRunTerminated(
        state,
        'Runner exited before finalization',
        'FAILED'
      );
      writer.schedule(structuredCloneState(state));
      await writer.flush();
    }
    // Best-effort _index.md on error / defensive-exit paths. The success path
    // and BudgetExceededError path write it themselves (setting indexWritten);
    // here we catch generic throws and unexpected exits. process.exit() does
    // not reach this block, which is why BudgetExceededError is handled above.
    if (fullOutputAbsoluteDir && state.runOutcome && !indexWritten) {
      await writeRunIndexMarkdown(
        fullOutputAbsoluteDir,
        dag.title,
        state.tasks,
        {
          startedAt: state.startedAt,
          finishedAt: state.finishedAt,
          runOutcome: state.runOutcome,
          runMessage: state.runMessage,
        }
      ).catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[proof] _index.md write failed: ${msg}`);
      });
    }
  }
}

async function runTask(
  task: RawTask,
  stateById: Map<string, TaskState>,
  state: RunState,
  writer: CanvasWriter,
  cwd: string,
  options: RunTaskOptions
): Promise<void> {
  const { taskTimeoutMs, streamPublishMs, streamIdleTimeoutMs } = options;
  const ts = stateById.get(task.id)!;
  ts.status = 'RUNNING';
  ts.startedAt = Date.now();
  writer.schedule(structuredCloneState(state));

  const upstreamContext = buildUpstreamContext(
    task,
    stateById,
    options.transcriptStore,
    options.upstreamMode
  );
  const promptParts: string[] = [];
  if (upstreamContext) promptParts.push(upstreamContext);
  if (options.extraContext && options.extraContext.trim() !== '') {
    promptParts.push(options.extraContext.trim());
  }
  promptParts.push(task.subtask_prompt);
  const stitchedBody = promptParts.join('\n\n---\n\n');
  // DAG-level `framing` is prepended verbatim before the upstream-context /
  // extra-context / subtask-prompt stitch so every task in the DAG inherits
  // the same product framing without authors having to repeat it. Only
  // `kind: 'task'` reaches this code path; pause + oracle tasks dispatch
  // through their own runners and intentionally ignore framing.
  const framing =
    options.framing && options.framing.trim() !== ''
      ? options.framing.trimEnd() + '\n\n'
      : '';
  const stitched = framing + stitchedBody;
  const modelSelection = taskModelSelection(ts);

  const agent = await Agent.create({
    apiKey: process.env.CURSOR_API_KEY!,
    model: modelSelection,
    local: { cwd },
  });

  options.transcriptStore.resetTask(task.id);
  ts.transcriptPath = undefined;
  const artifactDir = options.fullOutputAbsoluteDir;
  if (artifactDir) {
    await options.transcriptStore.beginMirroredAppend(
      task.id,
      artifactDir,
      (_, msg) => {
        console.warn(msg);
      }
    );
    if (options.transcriptStore.mirrorEnabledForTask(task.id)) {
      ts.transcriptPath = taskStreamArtifactRelPath(task.id);
    }
  }

  /** Uncapped execution transcript is accumulated in `options.transcriptStore`. */
  let run: RunnerTaskRun | undefined;
  const buffer = new BoundedTextBuffer(CANVAS_DISPLAY_CAP);
  let lastPublishAt = 0;
  const publishIfDue = (force = false): void => {
    const now = Date.now();
    if (!force && now - lastPublishAt < streamPublishMs) return;
    const text = buffer.render();
    if (text.trim()) ts.resultText = text;
    writer.schedule(structuredCloneState(state));
    lastPublishAt = now;
    void options.transcriptStore.flushStreamMirror(task.id, (_, msg) => {
      console.warn(msg);
    });
  };
  const deadline = Date.now() + taskTimeoutMs;

  try {
    run = (await agent.send(stitched)) as RunnerTaskRun;
    const iterator = run.stream()[Symbol.asyncIterator]();
    while (true) {
      const timeoutForNext = Math.min(
        deadline - Date.now(),
        streamIdleTimeoutMs
      );
      if (timeoutForNext <= 0) {
        throw new TimeoutError(
          `Task ${task.id} exceeded deadline of ${formatMs(taskTimeoutMs)}`
        );
      }
      const next = await withTimeout(
        iterator.next(),
        timeoutForNext,
        streamWaitTimeoutMessage({
          taskId: task.id,
          timeoutMs: timeoutForNext,
          streamIdleTimeoutMs,
        })
      );
      if (next.done) break;
      const event = next.value as {
        type?: string;
        message?: { content?: Array<{ type?: string; text?: string }> };
      };
      if (event.type === 'assistant') {
        let appended = false;
        const blocks = Array.isArray(event.message?.content)
          ? event.message.content
          : [];
        for (const block of blocks) {
          if (block.type === 'text' && typeof block.text === 'string') {
            buffer.append(block.text);
            options.transcriptStore.append(task.id, block.text);
            appended = true;
          }
        }
        if (appended) {
          publishIfDue();
        }
      }
    }
    let result:
      | {
          status: string;
          durationMs?: number;
          usage?: { inputTokens?: number; outputTokens?: number };
        }
      | undefined;
    const waitGraceMs = Math.min(
      deadline - Date.now(),
      WAIT_AFTER_STREAM_GRACE_MS
    );
    if (waitGraceMs <= 0) {
      throw new TimeoutError(
        `Task ${task.id} exceeded deadline of ${formatMs(taskTimeoutMs)}`
      );
    }
    try {
      result = await withTimeout(
        run.wait(),
        waitGraceMs,
        `Task ${task.id} did not finalize within ${formatMs(
          waitGraceMs
        )} after stream completion`
      );
    } catch (waitErr) {
      if (
        isTimeoutError(waitErr) &&
        run.status !== 'running' &&
        run.status !== undefined
      ) {
        // Fallback for cases where run stream is done but wait() is stuck on local executor close.
        result = {
          status: run.status,
          durationMs: run.durationMs,
        };
      } else {
        throw waitErr;
      }
    }
    if (!result) {
      throw new Error(`Task ${task.id} completed without a result`);
    }

    ts.finishedAt = Date.now();
    ts.durationMs =
      result.durationMs ?? ts.finishedAt - (ts.startedAt ?? ts.finishedAt);
    ts.inputTokens = result.usage?.inputTokens;
    ts.outputTokens = result.usage?.outputTokens;
    const rendered = buffer.render().trim();
    if (rendered) ts.resultText = rendered;

    if (result.status === 'finished') {
      ts.status = 'FINISHED';
    } else {
      ts.status = 'ERROR';
      ts.errorMessage = `Run ${result.status}`;
    }
  } catch (err) {
    if (run && isTimeoutError(err)) {
      await bestEffortCancel(run, task.id);
    }
    ts.finishedAt = Date.now();
    ts.durationMs = ts.finishedAt - (ts.startedAt ?? ts.finishedAt);
    ts.status = 'ERROR';
    ts.errorMessage = err instanceof Error ? err.message : String(err);
    const rendered = buffer.render().trim();
    if (rendered) ts.resultText = rendered;
  } finally {
    if (run && run.status === 'running') {
      await bestEffortCancel(run, task.id);
    }
    publishIfDue(true);
    await options.transcriptStore.flushStreamMirror(task.id, (_, msg) => {
      console.warn(msg);
    });
    const fullDir = options.fullOutputAbsoluteDir;
    if (fullDir) {
      await persistTaskMarkdownFile(
        fullDir,
        options.dagTitle ?? state.title,
        ts,
        options.transcriptStore.getJoined(task.id)
      ).catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[proof] artifact write failed for ${task.id}: ${msg}`);
      });
    }
    options.transcriptStore.finalizeTaskMirrorsDone(task.id);
    try {
      await (agent as unknown as AsyncDisposable)[Symbol.asyncDispose]();
    } catch {
      // ignore dispose errors
    }
    writer.schedule(structuredCloneState(state));
  }
}

interface RunTaskOptions {
  taskTimeoutMs: number;
  streamPublishMs: number;
  streamIdleTimeoutMs: number;
  fullOutputAbsoluteDir?: string;
  /**
   * The DAG title from the live-parsed DAG definition, used when writing
   * per-task markdown files. Falls back to `state.title` when absent.
   * Keeping this in sync with `dag.title` (rather than `state.title`) avoids
   * stale-title disagreements in resumed runs.
   */
  dagTitle?: string;
  /**
   * Stitched in BETWEEN the upstream-context block and the task's own
   * `subtask_prompt`. Used by `--converge-on` re-runs to inject the latest
   * adversarial-reviewer findings so re-executed ancestors can address them.
   */
  extraContext?: string;
  /**
   * DAG-level `framing` string. When set, prepended verbatim with `\n\n` to
   * the stitched prompt of every `kind: 'task'` invocation before the agent
   * is called. Pause and oracle tasks ignore framing (they never run an LLM).
   */
  framing?: string;
  /** How parent transcripts are excerpted for this process. */
  upstreamMode: UpstreamPolicyMode;
  /** Full streamed assistant transcripts for `kind: 'task'` invocations. */
  transcriptStore: TaskTranscriptStore;
}

/** Single source of truth for the "undefined kind === task" rule. */
function effectiveTaskKind(task: RawTask): TaskKind {
  return task.kind ?? 'task';
}

/** Hard timeout per task to prevent stale RUNNING tasks. */
const DEFAULT_TASK_TIMEOUT_MS = 20 * 60 * 1000;
/** Throttle live state writes to avoid excessive full-state cloning churn. */
const DEFAULT_STREAM_PUBLISH_MS = 500;
/** Detect stalled stream consumption before full deadline. */
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
/** Avoid hanging indefinitely in wait() when stream is already done. */
const WAIT_AFTER_STREAM_GRACE_MS = 15 * 1000;
/** Raised listener ceiling to avoid false-positive AbortSignal warnings from SDK internals. */
const ABORT_SIGNAL_LISTENER_LIMIT = 100;
/** Default cap on `--converge-on` re-execution attempts after the initial run. */
const DEFAULT_MAX_ITERATIONS = 3;
/**
 * Process exit code reserved for `dag.budget.maxTokensTotal` enforcement.
 * Exit `0` is success, `1` is generic failure (existing behavior),
 * `130` / `143` are signal-driven (existing behavior); `4` is the new
 * "halt because the run blew its token budget" code so wrapper scripts
 * can distinguish budget-driven halts from genuine errors.
 */
const EXIT_BUDGET_EXCEEDED = 4;

/** Sentinel error used to unwind the rank loop when `dag.budget.maxTokensTotal` is exceeded. */
class BudgetExceededError extends Error {
  readonly tokensUsed: number;
  readonly tokensLimit: number;
  constructor(tokensUsed: number, tokensLimit: number) {
    super(
      `Token budget exceeded: ${tokensUsed} tokens used > maxTokensTotal=${tokensLimit}`
    );
    this.name = 'BudgetExceededError';
    this.tokensUsed = tokensUsed;
    this.tokensLimit = tokensLimit;
  }
}

function totalTokensUsed(state: RunState): number {
  let total = 0;
  for (const t of state.tasks) {
    total += (t.inputTokens ?? 0) + (t.outputTokens ?? 0);
  }
  return total;
}

/**
 * Throws `BudgetExceededError` when the cumulative `inputTokens +
 * outputTokens` across every task in `state` has crossed
 * `dag.budget.maxTokensTotal`. Called after each rank's `Promise.all`
 * completes (so all tasks in the rank have finalized usage numbers).
 *
 * Pause + oracle tasks contribute 0 tokens — they have no LLM usage —
 * which is intentional: their cost is wall-clock, not tokens.
 */
function enforceTokenBudget(
  state: RunState,
  budget: DAGBudget | undefined
): void {
  if (budget?.maxTokensTotal === undefined) return;
  const used = totalTokensUsed(state);
  if (used > budget.maxTokensTotal) {
    throw new BudgetExceededError(used, budget.maxTokensTotal);
  }
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

function isTimeoutError(err: unknown): boolean {
  return err instanceof TimeoutError;
}

interface StreamWaitTimeoutMessageOptions {
  taskId: string;
  timeoutMs: number;
  streamIdleTimeoutMs: number;
}

function streamWaitTimeoutMessage({
  taskId,
  timeoutMs,
  streamIdleTimeoutMs,
}: StreamWaitTimeoutMessageOptions): string {
  const effectiveTimeout = formatMs(timeoutMs);
  if (timeoutMs < streamIdleTimeoutMs) {
    return `Task ${taskId} produced no stream events within ${effectiveTimeout} before the task deadline (configured stream idle timeout: ${formatMs(
      streamIdleTimeoutMs
    )})`;
  }
  return `Task ${taskId} produced no stream events within ${effectiveTimeout}`;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new TimeoutError(timeoutMessage)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function bestEffortCancel(
  run: { cancel?: () => Promise<void> | void },
  taskId: string
): Promise<void> {
  if (typeof run.cancel !== 'function') return;
  try {
    await run.cancel();
  } catch (cancelErr) {
    const msg =
      cancelErr instanceof Error ? cancelErr.message : String(cancelErr);
    console.error(`[proof] failed to cancel timed-out task ${taskId}: ${msg}`);
  }
}

class BoundedTextBuffer {
  private data = '';
  private droppedChars = 0;

  constructor(private readonly cap: number) {}

  append(chunk: string): void {
    if (!chunk) return;
    this.data += chunk;
    if (this.data.length <= this.cap) return;
    const overflow = this.data.length - this.cap;
    this.droppedChars += overflow;
    this.data = this.data.slice(overflow);
  }

  render(): string {
    if (this.droppedChars === 0) return this.data;
    return `[...truncated ${this.droppedChars} earlier chars...]\n${this.data}`;
  }
}

async function persistTaskMarkdownFile(
  dir: string,
  dagTitle: string,
  ts: TaskState,
  fullAssistantText: string
): Promise<void> {
  const meta = [
    `- **DAG:** ${dagTitle}`,
    `- **Model:** ${ts.model}`,
    `- **Complexity:** ${ts.complexity}`,
    `- **Status:** ${ts.status}`,
    ...(ts.durationMs !== undefined
      ? [`- **Duration (ms):** ${ts.durationMs}`]
      : []),
    ...(ts.inputTokens !== undefined
      ? [`- **Input tokens:** ${ts.inputTokens}`]
      : []),
    ...(ts.outputTokens !== undefined
      ? [`- **Output tokens:** ${ts.outputTokens}`]
      : []),
  ].join('\n');
  const err =
    ts.errorMessage !== undefined
      ? `\n\n## Error / notes\n\n${ts.errorMessage}\n`
      : '';
  const outSection =
    fullAssistantText.trim() === ''
      ? '\n\n## Agent output\n\n_(empty — downstream may depend on logs / status above.)_\n'
      : `\n\n## Agent output\n\n${fullAssistantText}\n`;
  const md = `# \`${ts.id}\`\n\n${meta}\n\n## Subtask prompt\n\n${ts.subtask_prompt}${err}${outSection}`;
  await writeFile(join(dir, `${ts.id}.md`), md, 'utf8');
}

async function writeRunIndexMarkdown(
  dir: string,
  dagTitle: string,
  tasks: TaskState[],
  runMeta?: {
    startedAt?: number;
    finishedAt?: number;
    runOutcome?: string;
    runMessage?: string;
  }
): Promise<void> {
  const metaLines = [
    '- **DAG definition:** [_dag.json](./_dag.json)',
    ...(runMeta?.startedAt !== undefined
      ? [`- **Started:** ${new Date(runMeta.startedAt).toISOString()}`]
      : []),
    ...(runMeta?.finishedAt !== undefined
      ? [`- **Finished:** ${new Date(runMeta.finishedAt).toISOString()}`]
      : []),
    ...(runMeta?.runOutcome !== undefined
      ? [
          `- **Outcome:** ${runMeta.runOutcome}${
            runMeta.runMessage ? ` — ${runMeta.runMessage}` : ''
          }`,
        ]
      : []),
  ];
  const lines = [
    '# DAG run — transcript index',
    '',
    `**${dagTitle}**`,
    '',
    ...metaLines,
    '',
    '| Task | Kind | Status | Transcript |',
    '|------|------|--------|------------|',
    ...tasks.map((t) => {
      const transcriptFile = `${t.id}.md`;
      const transcriptCell = existsSync(join(dir, transcriptFile))
        ? `[${transcriptFile}](./${transcriptFile})`
        : '_missing transcript_';
      return `| ${t.id} | ${t.kind ?? 'task'} | ${
        t.status
      } | ${transcriptCell} |`;
    }),
    '',
  ];
  await writeFile(join(dir, '_index.md'), lines.join('\n'), 'utf8');
}

interface RunConvergenceLoopOptions {
  /** Stable id used in canvas/log messages. Either the user-provided loop id or `loop-${convergeOn}`. */
  loopId: string;
  convergeOn: string;
  maxIterations: number;
  /**
   * Precomputed re-execution id set. Always contains `convergeOn` itself so
   * the loop body can re-run it after upstream re-execution completes. The
   * caller computes this from the loop's `reexecute` selector via
   * `resolveLoopReexecuteIds`.
   */
  reExecIds: Set<string>;
  ranks: RawTask[][];
  stateById: Map<string, TaskState>;
  /** Authoritative reviewer transcript store for in-process fidelity. */
  transcriptStore: TaskTranscriptStore;
  /** Same excerpt policy enforced on child upstream blocks. */
  upstreamMode: UpstreamPolicyMode;
  dispatchTask: (
    task: RawTask,
    overrides?: Partial<RunTaskOptions>
  ) => Promise<void>;
  writer: CanvasWriter;
  state: RunState;
  /**
   * When set, the loop prefers the findings-dir JSON sidecar ONLY when no
   * in-memory authoritative transcript exists (e.g. resumed runs). Same-process
   * execution always parses the reviewer transcript backing store first.
   */
  findingsDir?: string;
  /**
   * DAG-level budget. `budget.maxIterations` adds a soft cap on top of the
   * `--max-iterations` CLI flag — the loop aborts and marks the convergence
   * task `BUDGET-EXCEEDED` when the next re-run would push the convergence
   * task's iteration past this value. `budget.maxTokensTotal` is enforced
   * after every rank's `Promise.all` (same as the main run loop) and halts
   * the entire run via `BudgetExceededError`.
   */
  budget?: DAGBudget;
  /** Called after each completed re-execution iteration; used by self-hosting restarts. */
  afterIteration?: (iteration: number) => Promise<void>;
}

function resolveConvergenceReviewerSource(opts: {
  transcriptStore: TaskTranscriptStore;
  convergeOn: string;
  sidecarText: string | null;
  resultText: string | undefined;
  includeSidecar: boolean;
}): string {
  const fromStore = opts.transcriptStore.getJoined(opts.convergeOn);
  if (fromStore.trim().length > 0) return fromStore;
  if (
    opts.includeSidecar &&
    opts.sidecarText !== null &&
    opts.sidecarText.trim().length > 0
  ) {
    return opts.sidecarText;
  }
  return opts.resultText ?? '';
}

/**
 * Implements the `--converge-on` re-execution loop. Iteration 0 happened in
 * the main rank loop. Each subsequent iteration:
 *
 *   1. Parses the convergence task's authoritative reviewer transcript
 *      (in-memory store; sidecars/backed `resultText` are fallbacks after
 *      restarts) for `## Blockers` and `## High-severity findings`. If both
 *      sections are empty, exit.
 *   2. Resets the convergence task and every transitive ancestor back to
 *      `PENDING` and bumps their `iteration` counter.
 *   3. Re-executes the affected subset of the DAG in the original
 *      topological order, threading the excerpt-policied reviewer feedback
 *      into ancestor prompts as `extraContext`.
 *   4. Re-executes the convergence task itself.
 */
async function runConvergenceLoop(
  opts: RunConvergenceLoopOptions
): Promise<void> {
  const {
    loopId,
    convergeOn,
    maxIterations,
    reExecIds,
    ranks,
    stateById,
    transcriptStore,
    upstreamMode,
    dispatchTask,
    writer,
    state,
    findingsDir,
    budget,
    afterIteration,
  } = opts;
  const convergeTs = stateById.get(convergeOn);
  if (!convergeTs) {
    // Defensive — main() already validates this, but the loop must not crash.
    console.error(
      `[proof] ${loopId}: convergence task "${convergeOn}" not found in state; skipping`
    );
    return;
  }

  // Filter the original ranks to just the re-executed tasks. Drop empty
  // ranks. Order is preserved → topological correctness is preserved.
  const reExecRanks: RawTask[][] = ranks
    .map((rank) => rank.filter((t) => reExecIds.has(t.id)))
    .filter((rank) => rank.length > 0);

  const startingIteration = (convergeTs.iteration ?? 0) + 1;
  for (let iter = startingIteration; iter <= maxIterations; iter++) {
    const sidecarText =
      findingsDir !== undefined
        ? await readFindingsSidecarAsText(
            findingsDir,
            convergeOn,
            convergeTs.iteration ?? 0
          )
        : null;
    const reviewerSource = resolveConvergenceReviewerSource({
      transcriptStore,
      convergeOn,
      sidecarText,
      resultText: convergeTs.resultText,
      includeSidecar: true,
    });
    const findings = extractConvergenceFindings(reviewerSource);
    if (!findings.hasIssues) {
      console.log(
        `[proof] ${loopId} (converge-on ${convergeOn}): clean — no Blockers / High-severity findings after ${
          iter - 1
        } re-iteration(s)`
      );
      return;
    }

    // No early-exit when `ancestorIds` is empty. `reExecIds` always contains
    // the convergence task itself, so the re-execution rank is non-empty and
    // the convergence task gets re-run with its own previous output stitched
    // in as `extraContext`. This lets a single-task convergence DAG still
    // reach the post-loop `BUDGET-EXCEEDED` branch instead of bailing here
    // and leaving the convergence task in `FINISHED` despite the failing
    // findings.

    // Enforce `budget.maxIterations` BEFORE starting the next re-run. The
    // convergence task's `iteration` counter advances by 1 per re-run; if
    // the next re-run would push it past the budgeted ceiling, we abort
    // here and surface that on the canvas via the new BUDGET-EXCEEDED
    // status. The CLI `--max-iterations` flag is enforced by the loop
    // header above; the budget is an additional, DAG-author-controlled
    // ceiling that can be tighter than the runner default.
    if (budget?.maxIterations !== undefined && iter > budget.maxIterations) {
      const now = Date.now();
      convergeTs.status = 'BUDGET-EXCEEDED';
      convergeTs.finishedAt = now;
      convergeTs.errorMessage = `Convergence iteration ${iter} would exceed budget.maxIterations=${budget.maxIterations}`;
      writer.schedule(structuredCloneState(state));
      console.log(
        `[proof] ${loopId} (converge-on ${convergeOn}): BUDGET-EXCEEDED — iteration ${iter} would exceed budget.maxIterations=${budget.maxIterations}`
      );
      return;
    }

    console.log(
      `[proof] ${loopId} iteration ${iter}/${maxIterations}: ${findings.blockerLines.length} blocker(s), ${findings.highSeverityLines.length} high-severity finding(s) — re-running ${reExecIds.size} task(s)`
    );

    const convergenceContext = buildConvergenceContext(
      convergeOn,
      iter,
      resolveConvergenceReviewerSource({
        transcriptStore,
        convergeOn,
        sidecarText,
        resultText: convergeTs.resultText,
        includeSidecar: false,
      }),
      upstreamMode
    );

    // Reset state on every re-executed task. We deliberately do not clear
    // resultText here — leaving the previous result visible avoids a "blink
    // to empty" UX in the canvas while re-execution is still ramping up.
    for (const id of reExecIds) {
      const ts = stateById.get(id);
      if (!ts) continue;
      ts.iteration = (ts.iteration ?? 0) + 1;
      ts.status = 'PENDING';
      ts.startedAt = undefined;
      ts.finishedAt = undefined;
      ts.durationMs = undefined;
      ts.errorMessage = undefined;
      ts.inputTokens = undefined;
      ts.outputTokens = undefined;
    }
    writer.schedule(structuredCloneState(state));

    for (const rank of reExecRanks) {
      await Promise.all(
        rank.map((task) =>
          dispatchTask(task, { extraContext: convergenceContext })
        )
      );
      // Mirror the main run loop's budget check so re-execution can also
      // halt the entire run via BudgetExceededError → exit code 4.
      enforceTokenBudget(state, budget);
    }
    await afterIteration?.(iter);
  }

  // CLI/DAG maxIterations exhausted. Re-parse the convergence task's latest
  // output (preferring the post-run sidecar over live `resultText`, same as
  // the loop body) and, if blockers / high-severity findings are still
  // present, surface this as a budget-style terminal state on the
  // convergence task. The existing main-run tally then bumps `runOutcome`
  // to `'BUDGET_EXCEEDED'` and the process exits with
  // `EXIT_BUDGET_EXCEEDED` (4), matching token-budget enforcement.
  const finalSidecarText =
    findingsDir !== undefined
      ? await readFindingsSidecarAsText(
          findingsDir,
          convergeOn,
          convergeTs.iteration ?? 0
        )
      : null;
  const finalReviewerSource = resolveConvergenceReviewerSource({
    transcriptStore,
    convergeOn,
    sidecarText: finalSidecarText,
    resultText: convergeTs.resultText,
    includeSidecar: true,
  });
  const finalFindings = extractConvergenceFindings(finalReviewerSource);
  if (finalFindings.hasIssues) {
    const now = Date.now();
    convergeTs.status = 'BUDGET-EXCEEDED';
    convergeTs.finishedAt = now;
    convergeTs.errorMessage = `Convergence loop exhausted --max-iterations=${maxIterations}; ${finalFindings.blockerLines.length} blocker(s), ${finalFindings.highSeverityLines.length} high-severity finding(s) still present`;
    writer.schedule(structuredCloneState(state));
    // Re-emit the convergence task's sidecar so downstream consumers see
    // the terminal `BUDGET-EXCEEDED` status instead of the
    // `FINISHED` snapshot taken by `dispatchTask` mid-loop. Failures here
    // are logged but never escalated — the canvas + exit code remain
    // authoritative.
    if (findingsDir !== undefined) {
      try {
        const reviewerJoined = transcriptStore.getJoined(convergeOn);
        await writeFindingsSidecar(findingsDir, convergeTs, {
          parseSource:
            reviewerJoined.trim().length > 0 ? reviewerJoined : undefined,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[proof] findings sidecar re-write failed for ${convergeOn} after BUDGET-EXCEEDED: ${msg}`
        );
      }
    }
    console.log(
      `[proof] ${loopId} (converge-on ${convergeOn}): BUDGET-EXCEEDED — exhausted maxIterations=${maxIterations} with ${finalFindings.blockerLines.length} blocker(s), ${finalFindings.highSeverityLines.length} high-severity finding(s)`
    );
  } else {
    console.log(
      `[proof] ${loopId} (converge-on ${convergeOn}): clean after ${maxIterations} re-iteration(s)`
    );
  }
}

async function skipTask(
  task: RawTask,
  stateById: Map<string, TaskState>,
  state: RunState,
  writer: CanvasWriter,
  failedDeps: string[],
  fullOutputAbsoluteDir?: string,
  dagTitle?: string
): Promise<void> {
  const ts = stateById.get(task.id)!;
  const now = Date.now();
  ts.status = 'ERROR';
  ts.finishedAt = now;
  ts.durationMs = 0;
  ts.errorMessage = `Skipped: upstream task(s) ${failedDeps.join(
    ', '
  )} blocked this task (upstream ERROR or BUDGET-EXCEEDED)`;
  console.log(
    `[proof] skipping ${task.id} — upstream ${failedDeps.join(
      ', '
    )} in ERROR/BUDGET-EXCEEDED`
  );
  writer.schedule(structuredCloneState(state));
  if (!fullOutputAbsoluteDir) return;
  await persistTaskMarkdownFile(
    fullOutputAbsoluteDir,
    dagTitle ?? state.title,
    ts,
    ''
  ).catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[proof] artifact write failed for ${task.id}: ${msg}`);
  });
}

async function markRunTerminated(
  state: RunState,
  message: string,
  outcome: 'FAILED' | 'INTERRUPTED' | 'BUDGET_EXCEEDED'
): Promise<void> {
  const now = Date.now();
  state.runOutcome = outcome;
  state.runMessage = message;
  state.finishedAt = now;
  for (const task of state.tasks) {
    // BUDGET-EXCEEDED is a terminal status the convergence loop sets
    // explicitly; do not stomp it into a generic ERROR on shutdown.
    if (
      task.status === 'FINISHED' ||
      task.status === 'ERROR' ||
      task.status === 'BUDGET-EXCEEDED'
    )
      continue;
    task.status = 'ERROR';
    task.errorMessage =
      outcome === 'INTERRUPTED'
        ? 'Runner interrupted'
        : outcome === 'BUDGET_EXCEEDED'
        ? 'Run halted: token budget exceeded'
        : 'Runner terminated';
    task.finishedAt = now;
    if (task.startedAt !== undefined) {
      task.durationMs = now - task.startedAt;
    } else {
      task.durationMs = 0;
    }
  }
}

function buildUpstreamContext(
  task: RawTask,
  stateById: Map<string, TaskState>,
  transcripts: TaskTranscriptStore,
  upstreamMode: UpstreamPolicyMode
): string {
  if (task.depends_on.length === 0) return '';
  const lines: string[] = [
    'Upstream task results (for context — do not re-do this work):',
    '',
  ];
  for (const depId of task.depends_on) {
    const dep = stateById.get(depId);
    if (!dep) continue;
    const status = dep.status;
    let snippet: string;
    if (dep.status === 'ERROR' || dep.status === 'BUDGET-EXCEEDED') {
      snippet = dep.errorMessage
        ? `(failed: ${dep.errorMessage})`
        : `(${status.toLowerCase()})`;
    } else {
      const authoritative =
        transcripts.getJoined(depId) || (dep.resultText ?? '').trim();
      snippet =
        authoritative.length > 0
          ? excerptUpstreamForPrompt(authoritative, upstreamMode)
          : '(no output)';
    }
    lines.push(`### ${depId} [${status}]`);
    lines.push(snippet);
    lines.push('');
  }
  return lines.join('\n');
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s - m * 60);
  return `${m}m ${rem}s`;
}

/** Defensive deep clone — defends against mid-write mutation in the writer queue. */
function structuredCloneState(state: RunState): RunState {
  return JSON.parse(JSON.stringify(state)) as RunState;
}

main().catch((err) => {
  console.error(
    `[proof] fatal: ${err instanceof Error ? err.stack ?? err.message : err}`
  );
  process.exit(1);
});
