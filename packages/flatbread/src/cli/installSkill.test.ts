import test from 'ava';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CLI_VERSION,
  detectProjectPackageManager,
  handleEffortInstallSkill,
  planProofSkillInstall,
  quoteWindowsCmdArg,
  resolveExecFileInvocation,
  resolveProofSkillRoot,
} from './installSkill.js';

type TeardownContext = {
  teardown(callback: () => void | Promise<void>): void;
};

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

async function tempDir(prefix: string, t: TeardownContext): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), prefix));
  t.teardown(async () => {
    await rm(cwd, { recursive: true, force: true });
  });
  return cwd;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function fakeSkillRoot(
  cwd: string,
  pinnedVersion = CLI_VERSION
): Promise<string> {
  const skillRoot = join(cwd, 'skill');
  await mkdir(skillRoot, { recursive: true });
  await writeFile(join(skillRoot, 'SKILL.md'), '# Proof\n');
  await writeJson(join(skillRoot, 'release.json'), {
    format: 1,
    flatbreadVersion: pinnedVersion,
    proofVersion: pinnedVersion,
    gitTag: `v${pinnedVersion}`,
  });
  return skillRoot;
}

test('resolveProofSkillRoot finds the packaged SKILL.md', (t) => {
  t.true(resolveProofSkillRoot().replace(/\\/g, '/').endsWith('skills/proof'));
});

test('planProofSkillInstall pins an exact npm version and copies the skill', (t) => {
  const plan = planProofSkillInstall('npm', '1.2.3', '/tmp/proof-skill');
  t.deepEqual(plan.addPackage, {
    command: 'npm',
    args: ['install', '--save-dev', '--save-exact', 'flatbread@1.2.3'],
  });
  t.deepEqual(plan.addSkill, {
    command: 'npx',
    args: [
      '--yes',
      'skills',
      'add',
      '/tmp/proof-skill',
      '--skill',
      'proof',
      '--copy',
      '-y',
    ],
  });
});

test('planProofSkillInstall uses pnpm add and pnpm dlx', (t) => {
  const plan = planProofSkillInstall('pnpm', '1.2.3', '/tmp/proof-skill');
  t.deepEqual(plan.addPackage.args, [
    'add',
    '-D',
    '--save-exact',
    'flatbread@1.2.3',
  ]);
  t.is(plan.addSkill.command, 'pnpm');
  t.deepEqual(plan.addSkill.args.slice(0, 2), ['dlx', 'skills']);
});

test('planProofSkillInstall uses yarn add and npx, not yarn dlx', (t) => {
  const plan = planProofSkillInstall('yarn', '1.2.3', '/tmp/proof-skill');
  t.deepEqual(plan.addPackage, {
    command: 'yarn',
    args: ['add', '--dev', '--exact', 'flatbread@1.2.3'],
  });
  t.deepEqual(plan.addSkill, {
    command: 'npx',
    args: [
      '--yes',
      'skills',
      'add',
      '/tmp/proof-skill',
      '--skill',
      'proof',
      '--copy',
      '-y',
    ],
  });
  t.false(plan.addSkill.args.includes('dlx'));
});

test('detectProjectPackageManager prefers packageManager over lockfiles', async (t) => {
  const cwd = await tempDir('flatbread-install-pm-', t);
  await writeJson(join(cwd, 'package.json'), {
    name: 'app',
    packageManager: 'pnpm@10.0.0',
  });
  await writeFile(join(cwd, 'package-lock.json'), '{}\n');
  t.is(await detectProjectPackageManager(cwd), 'pnpm');
});

test('detectProjectPackageManager reads a single lockfile', async (t) => {
  const cwd = await tempDir('flatbread-install-lock-', t);
  await writeJson(join(cwd, 'package.json'), { name: 'app' });
  await writeFile(join(cwd, 'yarn.lock'), '\n');
  t.is(await detectProjectPackageManager(cwd), 'yarn');
});

test('detectProjectPackageManager rejects conflicting lockfiles', async (t) => {
  const cwd = await tempDir('flatbread-install-conflict-', t);
  await writeJson(join(cwd, 'package.json'), { name: 'app' });
  await writeFile(join(cwd, 'yarn.lock'), '\n');
  await writeFile(join(cwd, 'pnpm-lock.yaml'), '\n');
  const error = await t.throwsAsync<Error>(() =>
    detectProjectPackageManager(cwd)
  );
  if (!error) {
    t.fail('expected an error');
    return;
  }
  t.is(
    JSON.parse(error.message).error.code,
    'PROOF_INSTALL_SKILL_AMBIGUOUS_PACKAGE_MANAGER'
  );
});

test('install-skill dry-run plans npm install without running commands', async (t) => {
  const cwd = await tempDir('flatbread-install-dry-', t);
  await writeJson(join(cwd, 'package.json'), { name: 'app', version: '0.0.0' });
  await writeFile(join(cwd, 'package-lock.json'), '{}\n');
  const skillRoot = await fakeSkillRoot(cwd);
  const ran: string[] = [];
  const report = await handleEffortInstallSkill({
    cwd,
    dryRun: true,
    skillRoot,
    run: async (command) => {
      ran.push(command);
      return { stdout: '', stderr: '' };
    },
  });
  t.is(report.status, 'dry_run');
  t.is(report.package_manager, 'npm');
  t.is(report.package, 'planned');
  t.is(report.skill, 'planned');
  t.is(report.flatbread_version, CLI_VERSION);
  t.is(report.git_tag, `v${CLI_VERSION}`);
  t.deepEqual(
    report.commands?.map((step) => step.command),
    ['npm', 'npx']
  );
  t.deepEqual(ran, []);
});

test('install-skill runs the planned commands in order', async (t) => {
  const cwd = await tempDir('flatbread-install-run-', t);
  await writeJson(join(cwd, 'package.json'), { name: 'app', version: '0.0.0' });
  const skillRoot = await fakeSkillRoot(cwd);
  const ran: { command: string; args: readonly string[] }[] = [];
  const report = await handleEffortInstallSkill({
    cwd,
    skillRoot,
    run: async (command, args) => {
      ran.push({ command, args });
      return { stdout: '', stderr: '' };
    },
  });
  t.is(report.status, 'installed');
  t.is(report.package, 'added');
  t.is(report.skill, 'installed');
  t.is(ran.length, 2);
  t.true(ran[0].args.includes(`flatbread@${CLI_VERSION}`));
  t.true(ran[1].args.includes(skillRoot));
  t.true(ran[1].args.includes('--copy'));
});

test('install-skill skips adding the package when it is already exact', async (t) => {
  const cwd = await tempDir('flatbread-install-skip-', t);
  await writeJson(join(cwd, 'package.json'), {
    name: 'app',
    devDependencies: { flatbread: CLI_VERSION },
  });
  const skillRoot = await fakeSkillRoot(cwd);
  const ran: string[] = [];
  const report = await handleEffortInstallSkill({
    cwd,
    skillRoot,
    run: async (command) => {
      ran.push(command);
      return { stdout: '', stderr: '' };
    },
  });
  t.is(report.package, 'skipped');
  t.is(ran.length, 1);
  t.is(ran[0], 'npx');
});

test('install-skill skips the Flatbread workspace', async (t) => {
  const cwd = await tempDir('flatbread-install-workspace-', t);
  await writeJson(join(cwd, 'package.json'), { name: '@flatbread/monorepo' });
  const skillRoot = await fakeSkillRoot(cwd);
  const ran: string[] = [];
  const report = await handleEffortInstallSkill({
    cwd,
    skillRoot,
    run: async (command) => {
      ran.push(command);
      return { stdout: '', stderr: '' };
    },
  });
  t.is(report.status, 'skipped_workspace');
  t.deepEqual(ran, []);
});

test('install-skill rejects a missing package.json', async (t) => {
  const cwd = await tempDir('flatbread-install-missing-', t);
  const skillRoot = await fakeSkillRoot(cwd);
  const error = await t.throwsAsync<Error>(() =>
    handleEffortInstallSkill({ cwd, skillRoot, dryRun: true })
  );
  if (!error) {
    t.fail('expected an error');
    return;
  }
  t.is(JSON.parse(error.message).error.code, 'PROOF_INSTALL_SKILL_NO_PACKAGE');
});

test('install-skill rejects a mismatched packaged release.json', async (t) => {
  const cwd = await tempDir('flatbread-install-mismatch-', t);
  await writeJson(join(cwd, 'package.json'), { name: 'app' });
  const skillRoot = await fakeSkillRoot(cwd, '0.0.1');
  const error = await t.throwsAsync<Error>(() =>
    handleEffortInstallSkill({ cwd, skillRoot, dryRun: true })
  );
  if (!error) {
    t.fail('expected an error');
    return;
  }
  t.is(
    JSON.parse(error.message).error.code,
    'PROOF_INSTALL_SKILL_RELEASE_MISMATCH'
  );
});

test('install-skill wraps a failed child command as JSON', async (t) => {
  const cwd = await tempDir('flatbread-install-fail-', t);
  await writeJson(join(cwd, 'package.json'), { name: 'app' });
  const skillRoot = await fakeSkillRoot(cwd);
  const error = await t.throwsAsync<Error>(() =>
    handleEffortInstallSkill({
      cwd,
      skillRoot,
      run: async () => {
        const failure = new Error('boom') as Error & { stderr: string };
        failure.stderr = 'skills: not found\n';
        throw failure;
      },
    })
  );
  const payload = JSON.parse(error?.message ?? '{}');
  t.is(payload.error.code, 'PROOF_INSTALL_SKILL_COMMAND_FAILED');
  t.true(payload.error.message.includes('skills: not found'));
});

test('end-user install docs are copy-pasteable without version placeholders', async (t) => {
  const files = [
    'README.md',
    'packages/flatbread/README.md',
    'packages/proof/README.md',
    'packages/proof/skills/proof/setup.md',
  ];
  const command = 'npx --yes flatbread@latest proof install-skill';
  for (const file of files) {
    const text = await readFile(join(repoRoot, file), 'utf8');
    t.true(text.includes(command), `${file} must include ${command}`);
    t.false(text.includes('<gitTag>'), `${file} still has <gitTag>`);
    t.false(
      text.includes('<flatbreadVersion>'),
      `${file} still has <flatbreadVersion>`
    );
    t.false(
      /tree\/v\d+\.\d+\.\d+/.test(text),
      `${file} still pins a GitHub tree version`
    );
  }
});

test('Windows cmd quoting wraps spaces and doubles inner quotes', (t) => {
  t.is(quoteWindowsCmdArg('npm'), 'npm');
  t.is(quoteWindowsCmdArg(''), '""');
  t.is(
    quoteWindowsCmdArg('C:\\Users\\Jane Doe\\skill'),
    '"C:\\Users\\Jane Doe\\skill"'
  );
  t.is(quoteWindowsCmdArg('foo"bar'), '"foo""bar"');
});

test('Windows invocations run through cmd.exe so .cmd shims can spawn', (t) => {
  const unix = resolveExecFileInvocation('linux', 'npm', [
    'install',
    '--save-dev',
    'flatbread@1.1.0',
  ]);
  t.deepEqual(unix, {
    file: 'npm',
    args: ['install', '--save-dev', 'flatbread@1.1.0'],
    options: {},
  });

  const windows = resolveExecFileInvocation('win32', 'npx', [
    '--yes',
    'skills',
    'add',
    'C:\\Users\\Jane Doe\\proof',
  ]);
  t.is(windows.file, process.env.ComSpec || 'cmd.exe');
  t.deepEqual(windows.args.slice(0, 3), ['/d', '/s', '/c']);
  t.is(windows.args[3], 'npx --yes skills add "C:\\Users\\Jane Doe\\proof"');
  t.deepEqual(windows.options, {
    windowsHide: true,
    windowsVerbatimArguments: true,
  });
});

test.serial('spawned CLI dry-run prints JSON without traces', async (t) => {
  const cwd = await tempDir('flatbread-install-cli-', t);
  await writeJson(join(cwd, 'package.json'), {
    name: 'app',
    version: '0.0.0',
  });
  await writeFile(join(cwd, 'package-lock.json'), '{}\n');
  const result = await new Promise<{
    code: number | null;
    stdout: string;
    stderr: string;
  }>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--no-deprecation',
        fileURLToPath(new URL('../../bin/flatbread.js', import.meta.url)),
        'proof',
        'install-skill',
        '--dry-run',
      ],
      {
        cwd,
        // Pipeline CI sets this. The bin must still load dist relative to
        // itself, not `cwd/node_modules/flatbread`.
        env: { ...process.env, FLATBREAD_CI: 'true' },
      }
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
  t.is(result.code, 0, result.stderr || result.stdout);
  t.true(
    result.stdout.trim().startsWith('{'),
    `expected JSON on stdout, got ${JSON.stringify(result.stdout)}`
  );
  const payload = JSON.parse(result.stdout);
  t.is(payload.status, 'dry_run');
  t.is(payload.package_manager, 'npm');
  t.is(result.stderr, '');
});
