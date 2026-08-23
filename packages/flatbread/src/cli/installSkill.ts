import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const requireJson = createRequire(import.meta.url);
export const CLI_VERSION = (
  requireJson('../../package.json') as { version: string }
).version;
const WORKSPACE_NAME = '@flatbread/monorepo';
const SKILL_MARK = 'SKILL.md';

export type PackageManagerName = 'npm' | 'pnpm' | 'yarn' | 'bun';

export type CommandRunner = (
  command: string,
  args: readonly string[],
  options: { cwd: string }
) => Promise<{ stdout: string; stderr: string }>;

export interface InstallSkillOptions {
  cwd?: string;
  dryRun?: boolean;
  skipPackage?: boolean;
  version?: string;
  skillRoot?: string;
  run?: CommandRunner;
}

export interface PlannedCommand {
  command: string;
  args: string[];
}

export interface InstallSkillReport {
  status: 'installed' | 'dry_run' | 'skipped_workspace';
  flatbread_version: string;
  git_tag: string;
  package_manager?: PackageManagerName;
  package?: 'added' | 'skipped' | 'planned';
  skill?: 'installed' | 'planned' | 'skipped';
  skill_source?: string;
  commands?: PlannedCommand[];
  message?: string;
}

interface ProjectPackage {
  name?: string;
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Locate the Proof skill directory shipped with `@flatbread/proof`.
 *
 * Walks up from the resolved package entry so the same lookup works in the
 * monorepo and in a published `node_modules` layout.
 */
export function resolveProofSkillRoot(): string {
  const require = createRequire(import.meta.url);
  const starts: string[] = [];
  try {
    starts.push(dirname(require.resolve('@flatbread/proof')));
  } catch {
    // The package entry may be missing when workspace dist is not built.
  }
  starts.push(join(dirname(fileURLToPath(import.meta.url)), '../../../proof'));
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 8; i += 1) {
      const skillMd = join(dir, 'skills', 'proof', SKILL_MARK);
      if (existsSync(skillMd)) return join(dir, 'skills', 'proof');
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  throw jsonError(
    'PROOF_INSTALL_SKILL_MISSING',
    'The packaged Proof skill was not found next to @flatbread/proof.'
  );
}

/**
 * Detect the package manager that owns `cwd`.
 *
 * Prefer `package.json`'s `packageManager` field. If that is absent, use a
 * single lockfile. Conflicting lockfiles without `packageManager` are an
 * error so the installer does not guess.
 */
export async function detectProjectPackageManager(
  cwd: string
): Promise<PackageManagerName> {
  const pkg = await readProjectPackage(cwd);
  const fromField = managerFromField(pkg.packageManager);
  if (fromField) return fromField;

  const found: PackageManagerName[] = [];
  const lockfiles: readonly [string, PackageManagerName][] = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
    ['package-lock.json', 'npm'],
  ];
  for (const [file, name] of lockfiles) {
    try {
      await access(join(cwd, file));
      if (!found.includes(name)) found.push(name);
    } catch {
      // Lockfile absent.
    }
  }
  if (found.length === 1) return found[0];
  if (found.length > 1) {
    throw jsonError(
      'PROOF_INSTALL_SKILL_AMBIGUOUS_PACKAGE_MANAGER',
      'Multiple lockfiles exist. Set package.json "packageManager" to npm, pnpm, yarn, or bun, then rerun.'
    );
  }
  return 'npm';
}

/**
 * Build the argv that install the pinned `flatbread` version and copy the
 * packaged Proof skill into agent skill directories.
 */
export function planProofSkillInstall(
  manager: PackageManagerName,
  pinnedVersion: string,
  skillRoot: string
): { addPackage: PlannedCommand; addSkill: PlannedCommand } {
  const spec = `flatbread@${pinnedVersion}`;
  const skillArgs = [
    'add',
    skillRoot,
    '--skill',
    'proof',
    '--copy',
    '-y',
  ] as const;
  switch (manager) {
    case 'npm':
      return {
        addPackage: {
          command: 'npm',
          args: ['install', '--save-dev', '--save-exact', spec],
        },
        addSkill: {
          command: 'npx',
          args: ['--yes', 'skills', ...skillArgs],
        },
      };
    case 'pnpm':
      return {
        addPackage: {
          command: 'pnpm',
          args: ['add', '-D', '--save-exact', spec],
        },
        addSkill: {
          command: 'pnpm',
          args: ['dlx', 'skills', ...skillArgs],
        },
      };
    case 'yarn':
      return {
        addPackage: {
          command: 'yarn',
          args: ['add', '--dev', '--exact', spec],
        },
        addSkill: {
          command: 'yarn',
          args: ['dlx', 'skills', ...skillArgs],
        },
      };
    case 'bun':
      return {
        addPackage: {
          command: 'bun',
          args: ['add', '-d', '--exact', spec],
        },
        addSkill: {
          command: 'bunx',
          args: ['skills', ...skillArgs],
        },
      };
    default: {
      const exhaustive: never = manager;
      throw jsonError(
        'PROOF_INSTALL_SKILL_UNKNOWN_PACKAGE_MANAGER',
        `Unsupported package manager: ${String(exhaustive)}`
      );
    }
  }
}

/**
 * Install the Proof skill that shipped with this CLI and pin the same
 * `flatbread` version as a devDependency.
 *
 * `npx --yes flatbread@latest proof install-skill` uses `@latest` only to
 * download this command. The project then receives the exact version that
 * command is running, not a floating range.
 */
export async function handleEffortInstallSkill(
  options: InstallSkillOptions = {}
): Promise<InstallSkillReport> {
  const cwd = options.cwd ?? process.cwd();
  const pinnedVersion = options.version ?? CLI_VERSION;
  const gitTag = `v${pinnedVersion}`;
  const skillRoot = options.skillRoot ?? resolveProofSkillRoot();
  await assertSkillRoot(skillRoot);
  await assertReleaseIdentity(skillRoot, pinnedVersion);

  const pkg = await readProjectPackage(cwd);
  if (pkg.name === WORKSPACE_NAME) {
    return {
      status: 'skipped_workspace',
      flatbread_version: pinnedVersion,
      git_tag: gitTag,
      package: 'skipped',
      skill: 'skipped',
      skill_source: skillRoot,
      message:
        'This repository already ships the Proof skill. After editing packages/proof/skills/proof, run pnpm skills:sync.',
    };
  }

  const manager = await detectProjectPackageManager(cwd);
  const plan = planProofSkillInstall(manager, pinnedVersion, skillRoot);
  const skipPackage =
    options.skipPackage === true ||
    isWorkspaceSpec(declaredFlatbread(pkg)) ||
    hasExactFlatbread(pkg, pinnedVersion);
  const commands: PlannedCommand[] = [];
  if (!skipPackage) commands.push(plan.addPackage);
  commands.push(plan.addSkill);

  if (options.dryRun) {
    return {
      status: 'dry_run',
      flatbread_version: pinnedVersion,
      git_tag: gitTag,
      package_manager: manager,
      package: skipPackage ? 'skipped' : 'planned',
      skill: 'planned',
      skill_source: skillRoot,
      commands,
    };
  }

  const run = options.run ?? defaultRun;
  for (const step of commands) {
    try {
      await run(executable(step.command), step.args, { cwd });
    } catch (error) {
      throw commandFailed(step, error);
    }
  }

  return {
    status: 'installed',
    flatbread_version: pinnedVersion,
    git_tag: gitTag,
    package_manager: manager,
    package: skipPackage ? 'skipped' : 'added',
    skill: 'installed',
    skill_source: skillRoot,
    commands,
  };
}

async function defaultRun(
  command: string,
  args: readonly string[],
  options: { cwd: string }
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync(command, [...args], {
    cwd: options.cwd,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return { stdout: result.stdout, stderr: result.stderr };
}

function executable(name: string): string {
  if (process.platform !== 'win32') return name;
  return name.endsWith('.cmd') ? name : `${name}.cmd`;
}

async function readProjectPackage(cwd: string): Promise<ProjectPackage> {
  const path = join(cwd, 'package.json');
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    throw jsonError(
      'PROOF_INSTALL_SKILL_NO_PACKAGE',
      'No package.json in the working directory. Run this command from your project root.'
    );
  }
  try {
    return JSON.parse(text) as ProjectPackage;
  } catch {
    throw jsonError(
      'PROOF_INSTALL_SKILL_INVALID_PACKAGE',
      'package.json is not valid JSON.'
    );
  }
}

function managerFromField(
  value: string | undefined
): PackageManagerName | undefined {
  if (!value) return undefined;
  const name = value.split('@')[0];
  if (name === 'npm' || name === 'pnpm' || name === 'yarn' || name === 'bun') {
    return name;
  }
  throw jsonError(
    'PROOF_INSTALL_SKILL_UNKNOWN_PACKAGE_MANAGER',
    `package.json "packageManager" must start with npm, pnpm, yarn, or bun. Found "${value}".`
  );
}

function declaredFlatbread(pkg: ProjectPackage): string | undefined {
  return pkg.devDependencies?.flatbread ?? pkg.dependencies?.flatbread;
}

function isWorkspaceSpec(spec: string | undefined): boolean {
  if (!spec) return false;
  return (
    spec.startsWith('workspace:') ||
    spec.startsWith('link:') ||
    spec.startsWith('file:')
  );
}

function hasExactFlatbread(
  pkg: ProjectPackage,
  pinnedVersion: string
): boolean {
  const spec = declaredFlatbread(pkg);
  return spec === pinnedVersion || spec === `flatbread@${pinnedVersion}`;
}

async function assertSkillRoot(skillRoot: string): Promise<void> {
  try {
    await access(join(skillRoot, SKILL_MARK));
  } catch {
    throw jsonError(
      'PROOF_INSTALL_SKILL_MISSING',
      `No ${SKILL_MARK} in ${skillRoot}.`
    );
  }
}

async function assertReleaseIdentity(
  skillRoot: string,
  pinnedVersion: string
): Promise<void> {
  const path = join(skillRoot, 'release.json');
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    throw jsonError(
      'PROOF_INSTALL_SKILL_RELEASE_MISSING',
      `The packaged skill at ${skillRoot} has no release.json.`
    );
  }
  let release: {
    format?: unknown;
    flatbreadVersion?: unknown;
    gitTag?: unknown;
  };
  try {
    release = JSON.parse(text) as {
      format?: unknown;
      flatbreadVersion?: unknown;
      gitTag?: unknown;
    };
  } catch {
    throw jsonError(
      'PROOF_INSTALL_SKILL_RELEASE_INVALID',
      'The packaged skill release.json is not valid JSON.'
    );
  }
  const expectedTag = `v${pinnedVersion}`;
  if (
    release.format !== 1 ||
    release.flatbreadVersion !== pinnedVersion ||
    release.gitTag !== expectedTag
  ) {
    throw jsonError(
      'PROOF_INSTALL_SKILL_RELEASE_MISMATCH',
      `The packaged skill release.json must match this CLI (${pinnedVersion}, ${expectedTag}).`
    );
  }
}

function commandFailed(step: PlannedCommand, error: unknown): Error {
  const detail = errorDetail(error);
  return jsonError(
    'PROOF_INSTALL_SKILL_COMMAND_FAILED',
    `Command failed: ${step.command} ${step.args.join(' ')}${
      detail ? `: ${detail}` : ''
    }`
  );
}

function errorDetail(error: unknown): string {
  if (error && typeof error === 'object' && 'stderr' in error) {
    const stderr = (error as { stderr?: unknown }).stderr;
    if (typeof stderr === 'string' && stderr.trim()) return stderr.trim();
  }
  if (error instanceof Error && error.message) return error.message;
  return '';
}

function jsonError(code: string, message: string): Error {
  return new Error(JSON.stringify({ error: { code, message } }));
}
