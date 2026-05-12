import test from 'ava';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { selectProofCliEntrypoint } from './cli_dispatch.js';
import {
  buildProofSetupRefreshCommand,
  computeSetupGaps,
  createSetupDag,
  discoverExpectedGuidelines,
  prepareOwnedGuidelinesBundle,
  proofSetupUpdateDirective,
} from './setup_helpers.js';

const execFileAsync = promisify(execFile);
const suppressSetupAutoMainKey = Symbol.for(
  '@flatbread/proof.setup.suppress_auto_main'
);
(globalThis as Record<PropertyKey, unknown>)[suppressSetupAutoMainKey] = true;
const { runSetupCli } = await import('./setup.js');
delete (globalThis as Record<PropertyKey, unknown>)[suppressSetupAutoMainKey];

async function makeTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'proof-setup-test-'));
  await mkdir(join(root, '.cursor', 'rules'), { recursive: true });
  await mkdir(join(root, '.cursor', 'skills', 'proof'), { recursive: true });
  await mkdir(join(root, '.cursor', 'skills', 'dag-task-runner'), {
    recursive: true,
  });
  await mkdir(join(root, 'packages', 'proof'), { recursive: true });
  await writeFile(join(root, 'AGENTS.md'), '# Agents\n', 'utf8');
  await writeFile(
    join(root, '.cursor', 'rules', 'proof-usage-guardrails.mdc'),
    '# Guardrails\n',
    'utf8'
  );
  await writeFile(
    join(root, '.cursor', 'skills', 'proof', 'SKILL.md'),
    '# Skill\n',
    'utf8'
  );
  await writeFile(
    join(root, '.cursor', 'skills', 'dag-task-runner', 'SKILL.md'),
    '# Legacy skill\n',
    'utf8'
  );
  await writeFile(
    join(root, 'packages', 'proof', 'README.md'),
    '# Proof\n',
    'utf8'
  );
  return root;
}

test('selectProofCliEntrypoint only routes explicit setup subcommand', (t) => {
  t.is(selectProofCliEntrypoint(['setup']), 'setup');
  t.is(selectProofCliEntrypoint(['--dag', '/tmp/example.json']), 'run_dag');
  t.is(selectProofCliEntrypoint([]), 'run_dag');
});

test('discoverExpectedGuidelines includes the legacy compatibility skill handoff', async (t) => {
  const tempRoot = await makeTempRepo();
  t.teardown(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const expected = await discoverExpectedGuidelines(tempRoot);

  t.true(
    expected.some(
      (guideline) =>
        guideline.relativePath === '.cursor/skills/dag-task-runner/SKILL.md'
    )
  );
});

test('prepareOwnedGuidelinesBundle reuses a fresh bundle and regenerates after source changes', async (t) => {
  const tempRoot = await makeTempRepo();
  t.teardown(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });
  const outDir = join(tempRoot, '.flatbread', 'proof', 'setup');
  const bundlePath = join(outDir, 'owned-guidelines.bundle.md');
  const manifestPath = join(outDir, 'owned-guidelines.manifest.json');

  const firstExpected = await discoverExpectedGuidelines(tempRoot);
  const first = await prepareOwnedGuidelinesBundle({
    cwd: tempRoot,
    bundlePath,
    manifestPath,
    expectedGuidelines: firstExpected,
  });
  t.is(first.status, 'regenerated');
  t.false(first.freshness.isFresh);
  t.true(first.bundleText.includes(proofSetupUpdateDirective()));
  t.regex(first.manifest.bundleSha256, /^[a-f0-9]{64}$/);

  const secondExpected = await discoverExpectedGuidelines(tempRoot);
  const second = await prepareOwnedGuidelinesBundle({
    cwd: tempRoot,
    bundlePath,
    manifestPath,
    expectedGuidelines: secondExpected,
  });
  t.is(second.status, 'reused');
  t.true(second.freshness.isFresh);
  t.is(second.bundleText, await readFile(bundlePath, 'utf8'));

  await writeFile(bundlePath, '# corrupted bundle\n', 'utf8');
  await writeFile(
    manifestPath,
    JSON.stringify(second.manifest, null, 2) + '\n',
    'utf8'
  );
  const thirdExpected = await discoverExpectedGuidelines(tempRoot);
  const third = await prepareOwnedGuidelinesBundle({
    cwd: tempRoot,
    bundlePath,
    manifestPath,
    expectedGuidelines: thirdExpected,
  });
  t.is(third.status, 'regenerated');
  t.false(third.freshness.isFresh);
  t.true(
    third.freshness.reasons.some((reason) =>
      reason.includes('bundle content does not match current source files')
    )
  );

  await writeFile(
    join(tempRoot, 'AGENTS.md'),
    '# Agents\n\nUpdated.\n',
    'utf8'
  );
  const fourthExpected = await discoverExpectedGuidelines(tempRoot);
  const fourth = await prepareOwnedGuidelinesBundle({
    cwd: tempRoot,
    bundlePath,
    manifestPath,
    expectedGuidelines: fourthExpected,
  });
  t.is(fourth.status, 'regenerated');
  t.false(fourth.freshness.isFresh);
  t.true(
    fourth.freshness.reasons.some((reason) =>
      reason.includes('AGENTS.md changed since last bundle')
    )
  );

  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        ...fourth.manifest,
        sources: fourth.manifest.sources.map((source) =>
          source.path === 'AGENTS.md'
            ? { ...source, title: 'Tampered title' }
            : source
        ),
      },
      null,
      2
    ) + '\n',
    'utf8'
  );
  const fifthExpected = await discoverExpectedGuidelines(tempRoot);
  const fifth = await prepareOwnedGuidelinesBundle({
    cwd: tempRoot,
    bundlePath,
    manifestPath,
    expectedGuidelines: fifthExpected,
  });
  t.is(fifth.status, 'regenerated');
  t.false(fifth.freshness.isFresh);
  t.true(
    fifth.freshness.reasons.some((reason) =>
      reason.includes('manifest metadata changed for AGENTS.md (title)')
    )
  );
});

test('computeSetupGaps reports missing expected guidelines', async (t) => {
  const tempRoot = await makeTempRepo();
  t.teardown(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });
  await rm(join(tempRoot, '.cursor', 'skills', 'proof', 'SKILL.md'));

  const expected = await discoverExpectedGuidelines(tempRoot);
  const outDir = join(tempRoot, '.flatbread', 'proof', 'setup');
  const bundlePath = join(outDir, 'owned-guidelines.bundle.md');
  const manifestPath = join(outDir, 'owned-guidelines.manifest.json');
  const bundle = await prepareOwnedGuidelinesBundle({
    cwd: tempRoot,
    bundlePath,
    manifestPath,
    expectedGuidelines: expected,
  });
  const gaps = computeSetupGaps(expected, bundle.manifest);

  t.true(gaps.hasGaps);
  t.deepEqual(gaps.missingExpectedGuidelines, [
    '.cursor/skills/proof/SKILL.md',
  ]);
  t.deepEqual(gaps.missingFromOwnedBundle, []);
  t.deepEqual(gaps.staleOwnedBundleEntries, []);
});

test('createSetupDag adds a post-edit refresh step and review loop when gaps exist', (t) => {
  const dag = createSetupDag({
    cwd: '/tmp/workspace',
    bundlePath:
      '/tmp/workspace/.flatbread/proof/setup/owned-guidelines.bundle.md',
    manifestPath:
      '/tmp/workspace/.flatbread/proof/setup/owned-guidelines.manifest.json',
    summaryPath: '/tmp/workspace/.flatbread/proof/setup/setup-summary.md',
    gaps: {
      missingExpectedGuidelines: ['.cursor/skills/proof/SKILL.md'],
      missingFromOwnedBundle: [],
      staleOwnedBundleEntries: [],
      unexpectedOwnedBundleEntries: [],
      hasGaps: true,
    },
  });

  t.truthy(dag.framing?.includes(proofSetupUpdateDirective()));
  t.deepEqual(
    dag.tasks.map((task) => task.id),
    [
      'inspect-proof-setup-context',
      'close-proof-setup-gaps',
      'refresh-proof-setup-artifacts',
      'review-proof-setup',
    ]
  );
  const refreshTask = dag.tasks.find(
    (task) => task.id === 'refresh-proof-setup-artifacts'
  );
  t.truthy(refreshTask);
  t.is(refreshTask?.kind, 'oracle');
  t.is(
    refreshTask?.command,
    buildProofSetupRefreshCommand('/tmp/workspace', '.flatbread/proof/setup')
  );
  t.deepEqual(refreshTask?.depends_on, ['close-proof-setup-gaps']);
  const reviewTask = dag.tasks.find((task) => task.id === 'review-proof-setup');
  t.deepEqual(reviewTask?.depends_on, ['refresh-proof-setup-artifacts']);
  t.is(dag.loops?.[0].convergeOn, 'review-proof-setup');
  t.deepEqual(dag.loops?.[0].reexecute, {
    kind: 'tasks',
    tasks: ['close-proof-setup-gaps', 'refresh-proof-setup-artifacts'],
  });
});

test('buildProofSetupRefreshCommand rebuilds before packaged setup rerun', (t) => {
  const command = buildProofSetupRefreshCommand(
    '/tmp/workspace',
    '.flatbread/proof/setup'
  );

  t.true(command.startsWith('pnpm -F @flatbread/proof build &&'));
  t.true(command.includes('pnpm exec proof setup'));
  t.true(command.includes("--cwd '/tmp/workspace'"));
  t.true(command.includes("--out-dir '.flatbread/proof/setup'"));
});

test('runSetupCli writes setup artifacts without launching agents by default', async (t) => {
  const tempRoot = await makeTempRepo();
  t.teardown(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });
  const outDir = join(tempRoot, '.flatbread', 'proof', 'setup');

  await runSetupCli(['--cwd', tempRoot, '--out-dir', outDir]);
  const summary = await readFile(join(outDir, 'setup-summary.md'), 'utf8');
  const bundle = await readFile(
    join(outDir, 'owned-guidelines.bundle.md'),
    'utf8'
  );

  t.true(summary.includes('Generated setup DAG'));
  t.true(bundle.includes('.cursor/skills/dag-task-runner/SKILL.md'));
});

test('runSetupCli resolves explicit out-dir relative to --cwd', async (t) => {
  const tempRoot = await makeTempRepo();
  t.teardown(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  await runSetupCli(['--cwd', tempRoot, '--out-dir', 'custom-setup']);

  t.true(existsSync(join(tempRoot, 'custom-setup', 'setup-summary.md')));
  t.true(
    existsSync(join(tempRoot, 'custom-setup', 'owned-guidelines.bundle.md'))
  );
});

test('runSetupCli can hand the generated DAG to the existing runner', async (t) => {
  const tempRoot = await makeTempRepo();
  t.teardown(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });
  const outDir = join(tempRoot, '.flatbread', 'proof', 'setup');
  const canvasPath = join(tempRoot, 'proof-setup.canvas.tsx');
  let handedOffArgs: string[] | undefined;

  await runSetupCli(
    [
      '--cwd',
      tempRoot,
      '--out-dir',
      outDir,
      '--run-agents',
      '--init-only',
      '--canvas-path',
      canvasPath,
    ],
    {
      runDagCli: async (argv) => {
        handedOffArgs = argv;
        await writeFile(canvasPath, '// mock canvas\n', 'utf8');
      },
    }
  );

  t.true(existsSync(join(outDir, 'setup-dag.json')));
  t.true(existsSync(canvasPath));
  t.deepEqual(handedOffArgs, [
    '--init-only',
    '--canvas-path',
    canvasPath,
    '--cwd',
    tempRoot,
    '--dag',
    join(outDir, 'setup-dag.json'),
  ]);
});

test('bin/proof.js dispatches to setup and run_dag dist entries', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'proof-bin-test-'));
  t.teardown(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });
  const pkgRoot = join(tempRoot, 'proof-pkg');
  const binDir = join(pkgRoot, 'bin');
  const distDir = join(pkgRoot, 'dist');
  await mkdir(binDir, { recursive: true });
  await mkdir(distDir, { recursive: true });
  await writeFile(
    join(pkgRoot, 'package.json'),
    '{\n  "type": "module"\n}\n',
    'utf8'
  );
  await copyFile(
    fileURLToPath(new URL('../bin/proof.js', import.meta.url)),
    join(binDir, 'proof.js')
  );
  await writeFile(
    join(distDir, 'setup.js'),
    'console.log("setup-entry");\n',
    'utf8'
  );
  await writeFile(
    join(distDir, 'run_dag.js'),
    'console.log("run-dag-entry");\n',
    'utf8'
  );

  const setupResult = await execFileAsync('node', [
    join(binDir, 'proof.js'),
    'setup',
  ]);
  const dagResult = await execFileAsync('node', [
    join(binDir, 'proof.js'),
    '--dag',
    '/tmp/example.json',
  ]);

  t.true(setupResult.stdout.includes('setup-entry'));
  t.true(dagResult.stdout.includes('run-dag-entry'));
});
