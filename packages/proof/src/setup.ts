import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

import {
  computeSetupGaps,
  createSetupDag,
  discoverExpectedGuidelines,
  prepareOwnedGuidelinesBundle,
  renderSetupSummary,
} from './setup_helpers.js';

const SUPPRESS_AUTO_SETUP_KEY = Symbol.for(
  '@flatbread/proof.setup.suppress_auto_main'
);

interface SetupCliArgs {
  cwd: string;
  outDir: string;
  runAgents: boolean;
  runnerArgs: string[];
  help: boolean;
}

export interface SetupCliDependencies {
  runDagCli?: (argv: string[]) => Promise<void>;
}

function parseSetupArgs(argv: string[]): SetupCliArgs {
  const normalized = argv[0] === 'setup' ? argv.slice(1) : argv.slice();
  const cwd = process.cwd();
  let resolvedCwd = cwd;
  let explicitOutDirRaw: string | undefined;
  let runAgents = false;
  let help = false;
  const runnerArgs: string[] = [];

  for (let i = 0; i < normalized.length; i++) {
    const arg = normalized[i];
    const next = normalized[i + 1];
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }
    if (arg === '--run-agents') {
      runAgents = true;
      continue;
    }
    if (arg === '--cwd') {
      if (!next || next.startsWith('--')) {
        throw new Error('--cwd <path> is required');
      }
      resolvedCwd = resolve(next);
      i++;
      continue;
    }
    if (arg === '--out-dir') {
      if (!next || next.startsWith('--')) {
        throw new Error('--out-dir <path> is required');
      }
      explicitOutDirRaw = next;
      i++;
      continue;
    }

    runnerArgs.push(arg);
    if (arg.startsWith('--') && next && !next.startsWith('--')) {
      runnerArgs.push(next);
      i++;
    }
  }

  if (runnerArgs.includes('--dag')) {
    throw new Error(
      '`proof setup` manages its generated DAG path. Use `--out-dir` instead of passing `--dag`.'
    );
  }

  return {
    cwd: resolvedCwd,
    outDir:
      explicitOutDirRaw !== undefined
        ? resolve(resolvedCwd, explicitOutDirRaw)
        : resolve(resolvedCwd, '.flatbread', 'proof', 'setup'),
    runAgents,
    runnerArgs,
    help,
  };
}

function setupUsage(): string {
  return [
    'Usage: proof setup [--cwd <dir>] [--out-dir <dir>] [--run-agents] [runner args...]',
    '',
    'Default mode refreshes/reuses the owned-guidelines bundle + manifest, computes setup gaps, and writes a setup DAG/summary without launching agents.',
    '',
    'When `--run-agents` is set, the generated DAG is handed to the existing Proof runner.',
  ].join('\n');
}

function hasRunnerCanvasArg(args: readonly string[]): boolean {
  return args.includes('--canvas') || args.includes('--canvas-path');
}

function hasRunnerCwdArg(args: readonly string[]): boolean {
  return args.includes('--cwd');
}

export async function runSetupCli(
  argv: string[] = process.argv.slice(2),
  deps: SetupCliDependencies = {}
): Promise<void> {
  const parsed = parseSetupArgs(argv);
  if (parsed.help) {
    console.log(setupUsage());
    return;
  }

  await mkdir(parsed.outDir, { recursive: true });

  const bundlePath = resolve(parsed.outDir, 'owned-guidelines.bundle.md');
  const manifestPath = resolve(parsed.outDir, 'owned-guidelines.manifest.json');
  const dagPath = resolve(parsed.outDir, 'setup-dag.json');
  const summaryPath = resolve(parsed.outDir, 'setup-summary.md');

  const expectedGuidelines = await discoverExpectedGuidelines(parsed.cwd);
  const bundle = await prepareOwnedGuidelinesBundle({
    cwd: parsed.cwd,
    bundlePath,
    manifestPath,
    expectedGuidelines,
  });
  const gaps = computeSetupGaps(expectedGuidelines, bundle.manifest);
  const dag = createSetupDag({
    cwd: parsed.cwd,
    bundlePath,
    manifestPath,
    summaryPath,
    gaps,
  });
  const summary = renderSetupSummary({
    cwd: parsed.cwd,
    bundle,
    gaps,
    dagPath,
  });

  await writeFile(dagPath, JSON.stringify(dag, null, 2) + '\n', 'utf8');
  await writeFile(summaryPath, summary, 'utf8');

  console.log(`[proof setup] owned guidelines: ${bundle.status}`);
  console.log(`[proof setup] bundle → ${bundlePath}`);
  console.log(`[proof setup] manifest → ${manifestPath}`);
  console.log(`[proof setup] setup DAG → ${dagPath}`);
  console.log(`[proof setup] summary → ${summaryPath}`);
  console.log(`[proof setup] gaps: ${gaps.hasGaps ? 'present' : 'none'}`);

  if (!parsed.runAgents) {
    return;
  }

  const runnerArgs = [...parsed.runnerArgs];
  if (!hasRunnerCwdArg(runnerArgs)) {
    runnerArgs.push('--cwd', parsed.cwd);
  }
  if (!hasRunnerCanvasArg(runnerArgs)) {
    runnerArgs.push('--canvas', 'proof-setup');
  }
  runnerArgs.push('--dag', dagPath);

  if (deps.runDagCli !== undefined) {
    await deps.runDagCli(runnerArgs);
    return;
  }

  const suppressAutoRunKey = Symbol.for(
    '@flatbread/proof.run_dag.suppress_auto_main'
  );
  (globalThis as Record<PropertyKey, unknown>)[suppressAutoRunKey] = true;
  try {
    const { runDagCli } = await import('./run_dag.js');
    await runDagCli(runnerArgs);
  } finally {
    delete (globalThis as Record<PropertyKey, unknown>)[suppressAutoRunKey];
  }
}

if (!(globalThis as Record<PropertyKey, unknown>)[SUPPRESS_AUTO_SETUP_KEY]) {
  runSetupCli().catch((err) => {
    console.error(
      `[proof setup] fatal: ${
        err instanceof Error ? err.stack ?? err.message : err
      }`
    );
    process.exit(1);
  });
}
