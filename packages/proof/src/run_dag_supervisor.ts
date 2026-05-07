/**
 * Tiny self-hosting supervisor for `run_dag.ts`.
 *
 * The runner is intentionally allowed to edit its own source files. A live
 * Node/tsx process cannot pick up those edits mid-flight, so `run_dag.ts`
 * exits with EXIT_RUNNER_RESTART (75) after persisting state whenever runner
 * runtime files change. This supervisor relaunches the runner with
 * `--resume-state` so the next process executes the newly edited source.
 *
 * The supervisor automatically picks the right launcher based on its own
 * file extension:
 *
 *   - `.js` (compiled / packaged) — spawn `process.execPath` against the
 *     sibling `run_dag.js` so consumers do not need `tsx` on PATH.
 *   - `.ts` (dev / `tsx src/run_dag_supervisor.ts`) — spawn the locally
 *     installed `tsx` binary against the sibling `run_dag.ts`.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { EXIT_RUNNER_RESTART } from './self_hosting.js';

const SUPERVISOR_PATH = fileURLToPath(import.meta.url);
const SCRIPTS_DIR = dirname(SUPERVISOR_PATH);
const IS_TS_SOURCE = SUPERVISOR_PATH.endsWith('.ts');
const RUNNER = join(SCRIPTS_DIR, IS_TS_SOURCE ? 'run_dag.ts' : 'run_dag.js');

/**
 * Resolve `tsx` lazily — only required when running the supervisor directly
 * from `src/*.ts` (dev mode). The compiled `.js` build path uses
 * `process.execPath` instead and does not need `tsx` on disk.
 */
function resolveTsxBin(): string {
  const candidates = [
    join(SCRIPTS_DIR, '..', 'node_modules', '.bin', 'tsx'),
    join(SCRIPTS_DIR, '..', '..', '..', 'node_modules', '.bin', 'tsx'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return 'tsx';
}

const DEFAULT_STATE_PATH = '.proof/run-state.json';
const DEFAULT_MAX_RESTARTS = 20;

interface SupervisorArgs {
  passthrough: string[];
  statePath: string;
  maxRestarts: number;
}

function parseSupervisorArgs(argv: string[]): SupervisorArgs {
  const passthrough = [...argv];
  const statePath = valueForFlag(argv, '--state-path') ?? DEFAULT_STATE_PATH;
  const maxRestartsRaw = valueForFlag(argv, '--max-runner-restarts');
  const maxRestarts =
    maxRestartsRaw === undefined
      ? DEFAULT_MAX_RESTARTS
      : parsePositiveInt(maxRestartsRaw, '--max-runner-restarts');
  return { passthrough, statePath, maxRestarts };
}

function valueForFlag(
  argv: readonly string[],
  flag: string
): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx === -1) return undefined;
  const next = argv[idx + 1];
  if (next === undefined || next.startsWith('--')) return undefined;
  return next;
}

function parsePositiveInt(raw: string, flag: string): number {
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return n;
}

function setFlag(argv: string[], flag: string, value?: string): string[] {
  const next = [...argv];
  const idx = next.indexOf(flag);
  if (idx !== -1) {
    if (value === undefined) return next;
    const hasValue =
      next[idx + 1] !== undefined && !next[idx + 1].startsWith('--');
    if (hasValue) {
      next[idx + 1] = value;
    } else {
      next.splice(idx + 1, 0, value);
    }
    return next;
  }
  next.push(flag);
  if (value !== undefined) next.push(value);
  return next;
}

function stripSupervisorOnlyFlags(argv: readonly string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--max-runner-restarts') {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) i++;
      continue;
    }
    out.push(arg);
  }
  return out;
}

function resolveAgainstCwd(path: string, cwd: string): string {
  return isAbsolute(path) ? path : resolve(cwd, path);
}

async function runOnce(argv: readonly string[]): Promise<number> {
  return new Promise<number>((resolveCode) => {
    const command = IS_TS_SOURCE ? resolveTsxBin() : process.execPath;
    const child = spawn(command, [RUNNER, ...argv], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });
    child.on('close', (code, signal) => {
      if (signal) {
        resolveCode(signal === 'SIGINT' ? 130 : 143);
      } else {
        resolveCode(code ?? 1);
      }
    });
    child.on('error', (err) => {
      console.error(
        `[proof-supervisor] failed to launch runner: ${err.message}`
      );
      resolveCode(1);
    });
  });
}

async function main(): Promise<void> {
  const parsed = parseSupervisorArgs(process.argv.slice(2));
  const absoluteStatePath = resolveAgainstCwd(parsed.statePath, process.cwd());
  await mkdir(dirname(absoluteStatePath), { recursive: true });

  let argv = stripSupervisorOnlyFlags(parsed.passthrough);
  argv = setFlag(argv, '--restart-on-runner-change');
  argv = setFlag(argv, '--state-path', absoluteStatePath);

  for (let restart = 0; restart <= parsed.maxRestarts; restart++) {
    if (restart > 0) {
      argv = setFlag(argv, '--resume-state', absoluteStatePath);
      console.log(
        `[proof-supervisor] restart ${restart}/${parsed.maxRestarts} from ${absoluteStatePath}`
      );
    }

    const code = await runOnce(argv);
    if (code !== EXIT_RUNNER_RESTART) {
      process.exit(code);
    }
  }

  console.error(
    `[proof-supervisor] exceeded --max-runner-restarts=${parsed.maxRestarts}`
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(
    `[proof-supervisor] fatal: ${
      err instanceof Error ? err.stack ?? err.message : err
    }`
  );
  process.exit(1);
});
