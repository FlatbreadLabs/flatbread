import { execFileSync, execSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'url';
import path from 'path';
import colors from 'kleur';
import {
  formatGithubReleaseNotes,
  githubReleaseTag,
  prepareReleaseChangelog,
} from './utils/changelog';
import { getMonorepoPublicPackages } from './utils/packageManifest';
// import { version } from '../package.json';

export type NpmViewResult = {
  stdout?: string;
  error?: unknown;
};

export type PreflightStatus = 'publish' | 'already-published';

export type GithubReleaseStatus = 'create' | 'already-exists';

export type PublishOptions = {
  readonly dryRun: boolean;
};

export type GhReleaseViewResult = {
  stdout?: string;
  error?: unknown;
};

export type PublishPackage = {
  name: string;
  dirName: string;
  version?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

export function parseNpmViewVersion(stdout: string): string | undefined {
  try {
    const value: unknown = JSON.parse(stdout);
    return typeof value === 'string' ? value : undefined;
  } catch {
    return undefined;
  }
}

export function classifyNpmViewResult(
  result: NpmViewResult,
  expectedVersion: string
): PreflightStatus {
  const version = parseNpmViewVersion(result.stdout ?? '');
  if (version === expectedVersion) return 'already-published';

  const error = result.error;
  const errorRecord =
    error && typeof error === 'object'
      ? (error as Record<string, unknown>)
      : undefined;
  const details = errorRecord
    ? [
        errorRecord.code,
        errorRecord.status,
        errorRecord.stderr,
        errorRecord.stdout,
        errorRecord.message,
      ]
        .filter((value) => value != null && value !== '')
        .map((value) =>
          Buffer.isBuffer(value) ? value.toString('utf8') : String(value)
        )
        .join(' ')
    : String(error ?? '');

  // execFileSync throws with status 1 and E404 in stderr; error.code is not
  // npm's E404 (that lives in the child stderr). Treat either shape as
  // "version not on the registry yet."
  if (
    errorRecord &&
    (errorRecord.code === 'E404' ||
      errorRecord.status === 404 ||
      errorRecord.statusCode === 404 ||
      details.includes('E404') ||
      details.includes('404 Not Found'))
  ) {
    return 'publish';
  }

  if (!error && version === undefined) {
    throw new Error('npm view returned an unexpected response');
  }
  throw new Error(`npm view failed: ${details || 'unknown error'}`);
}

export function sortPackages<T extends PublishPackage>(packages: T[]): T[] {
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  const outgoing = new Map<string, Set<string>>();
  const indegree = new Map(packages.map((pkg) => [pkg.name, 0]));
  const dependencySections = [
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
  ] as const;

  for (const pkg of packages) {
    for (const section of dependencySections) {
      for (const [dependency, range] of Object.entries(pkg[section] ?? {})) {
        if (!byName.has(dependency) || typeof range !== 'string') continue;
        const dependents = outgoing.get(dependency) ?? new Set<string>();
        if (!dependents.has(pkg.name)) {
          dependents.add(pkg.name);
          outgoing.set(dependency, dependents);
          indegree.set(pkg.name, (indegree.get(pkg.name) ?? 0) + 1);
        }
      }
    }
  }

  const ready = packages
    .filter((pkg) => indegree.get(pkg.name) === 0)
    .sort(comparePackageNames)
    .map((pkg) => pkg.name);
  const result: T[] = [];
  while (ready.length > 0) {
    const name = ready.shift()!;
    result.push(byName.get(name)!);
    for (const dependent of [...(outgoing.get(name) ?? [])].sort()) {
      const next = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, next);
      if (next === 0) insertSorted(ready, dependent);
    }
  }

  if (result.length !== packages.length) {
    const remaining = packages
      .filter((pkg) => !result.some((item) => item.name === pkg.name))
      .map((pkg) => pkg.name)
      .sort();
    throw new Error(
      `Cannot determine publish order: local package dependency cycle detected among ${remaining.join(
        ', '
      )}. Remove the cycle before publishing.`
    );
  }
  return result;
}

export function assertLockstepVersions(
  packages: readonly PublishPackage[]
): string {
  const missingVersions = packages
    .filter((pkg) => !pkg.version)
    .map((pkg) => pkg.name)
    .sort();
  if (missingVersions.length > 0) {
    throw new Error(
      `Every public package must declare a version. Missing: ${missingVersions.join(
        ', '
      )}`
    );
  }

  const versions = new Map<string, string[]>();
  for (const pkg of packages) {
    const names = versions.get(pkg.version!) ?? [];
    names.push(pkg.name);
    versions.set(pkg.version!, names);
  }
  if (versions.size !== 1) {
    const groups = [...versions.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([version, names]) =>
          `${version}: ${names
            .sort((left, right) => left.localeCompare(right))
            .join(', ')}`
      );
    throw new Error(
      `Release requires one version across every public package:\n${groups.join(
        '\n'
      )}`
    );
  }

  return versions.keys().next().value!;
}

function comparePackageNames(
  left: PublishPackage,
  right: PublishPackage
): number {
  return (
    left.name.localeCompare(right.name) ||
    left.dirName.localeCompare(right.dirName)
  );
}

function insertSorted(values: string[], value: string): void {
  const index = values.findIndex((entry) => entry.localeCompare(value) > 0);
  values.splice(index === -1 ? values.length : index, 0, value);
}

export function parsePublishArgs(argv: readonly string[]): PublishOptions {
  let dryRun = false;
  for (const arg of argv) {
    if (arg === '--') continue;
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    throw new Error(`Unknown publish flag: ${arg}`);
  }
  return { dryRun };
}

export function classifyGhReleaseView(
  result: GhReleaseViewResult
): GithubReleaseStatus {
  if (!result.error) {
    try {
      const value: unknown = JSON.parse(result.stdout ?? '');
      if (
        value &&
        typeof value === 'object' &&
        typeof (value as { tagName?: unknown }).tagName === 'string'
      ) {
        return 'already-exists';
      }
    } catch {
      // Fall through to the error path when stdout is not the expected JSON.
    }
    throw new Error('gh release view returned an unexpected response');
  }

  const details = collectErrorDetails(result.error);
  if (
    details.includes('release not found') ||
    details.includes('Not Found') ||
    details.includes('HTTP 404')
  ) {
    return 'create';
  }

  throw new Error(`gh release view failed: ${details || 'unknown error'}`);
}

export function inspectGithubRelease(tag: string): GithubReleaseStatus {
  try {
    return classifyGhReleaseView({
      stdout: execFileSync(
        'gh',
        ['release', 'view', tag, '--json', 'tagName'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      ),
    });
  } catch (error) {
    return classifyGhReleaseView({ error });
  }
}

export function assertGithubCli(): void {
  try {
    execFileSync('gh', ['auth', 'status'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new Error(
      `GitHub CLI \`gh\` must be installed and authenticated before publish so the npm publish and GitHub release stay one step. ${collectErrorDetails(
        error
      )}`
    );
  }
}

export function assertCommitOnGithub(sha: string): void {
  try {
    execFileSync(
      'gh',
      ['api', `repos/{owner}/{repo}/commits/${sha}`, '-q', '.sha'],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
  } catch (error) {
    throw new Error(
      `Commit ${sha} is not on GitHub. Push the release commit before publishing. ${collectErrorDetails(
        error
      )}`
    );
  }
}

function collectErrorDetails(error: unknown): string {
  const errorRecord =
    error && typeof error === 'object'
      ? (error as Record<string, unknown>)
      : undefined;
  return errorRecord
    ? [
        errorRecord.code,
        errorRecord.status,
        errorRecord.stderr,
        errorRecord.stdout,
        errorRecord.message,
      ]
        .filter((value) => value != null && value !== '')
        .map((value) =>
          Buffer.isBuffer(value) ? value.toString('utf8') : String(value)
        )
        .join(' ')
    : String(error ?? '');
}

export function ensureAnnotatedReleaseTag(tag: string, sha: string): void {
  try {
    const existing = execFileSync('git', ['rev-parse', `${tag}^{}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    if (existing !== sha) {
      throw new Error(
        `Tag ${tag} points at ${existing}, not the release commit ${sha}`
      );
    }
    return;
  } catch (error) {
    const details = collectErrorDetails(error);
    if (
      !details.includes('unknown revision') &&
      !details.includes('Not a valid object')
    ) {
      throw error instanceof Error ? error : new Error(details);
    }
  }

  execFileSync('git', ['tag', '-a', tag, sha, '-m', `Release ${tag}`], {
    stdio: 'inherit',
  });
}

export function pushReleaseTag(tag: string): void {
  execFileSync('git', ['push', 'origin', `refs/tags/${tag}`], {
    stdio: 'inherit',
  });
}

export function createGithubRelease(options: {
  readonly tag: string;
  readonly notes: string;
  readonly target: string;
}): void {
  const directory = mkdtempSync(path.join(tmpdir(), 'flatbread-release-'));
  const notesPath = path.join(directory, 'notes.md');
  writeFileSync(notesPath, `${options.notes}\n`);
  try {
    execFileSync(
      'gh',
      [
        'release',
        'create',
        options.tag,
        '--title',
        options.tag,
        '--notes-file',
        notesPath,
        '--target',
        options.target,
        '--verify-tag',
      ],
      { stdio: 'inherit' }
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export function assertCleanRelease(): string {
  const status = execSync('git status --porcelain', {
    encoding: 'utf8',
  }).trim();
  if (status) {
    throw new Error(
      'Release requires a clean working tree; commit or otherwise resolve these changes first:\n' +
        status
    );
  }
  const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  if (!sha) throw new Error('Unable to determine the release commit SHA');
  console.log(colors.bold().green(`Release commit: ${sha}`));
  return sha;
}

export function preflightPackage(
  name: string,
  version: string
): PreflightStatus {
  try {
    return classifyNpmViewResult(
      {
        stdout: execFileSync(
          'npm',
          ['view', `${name}@${version}`, 'version', '--json'],
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
        ),
      },
      version
    );
  } catch (error) {
    return classifyNpmViewResult({ error }, version);
  }
}

export async function publishPackages(
  options: PublishOptions = { dryRun: false }
): Promise<void> {
  const dryRun = options.dryRun;
  if (dryRun) {
    console.log(
      colors
        .bold()
        .yellow(
          'Dry run: no npm publish, no GitHub release, no changelog write'
        )
    );
  }

  const releaseSha = dryRun
    ? execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
    : assertCleanRelease();
  if (dryRun) {
    console.log(colors.bold().green(`Release commit: ${releaseSha}`));
    const dirty = execSync('git status --porcelain', {
      encoding: 'utf8',
    }).trim();
    if (dirty) {
      console.log(
        colors
          .bold()
          .yellow(
            'Working tree is dirty. A real publish would stop until you commit or restore these files:\n' +
              dirty
          )
      );
    }
  }

  const packages = sortPackages(
    (await getMonorepoPublicPackages()) as unknown as PublishPackage[]
  );
  const releaseVersion = assertLockstepVersions(packages);
  const releaseTag = githubReleaseTag(releaseVersion);
  console.log(
    colors.bold().green(`Public package release version: ${releaseVersion}`)
  );

  const changelogMarkdown = readFileSync('CHANGELOG.md', 'utf8');
  const preparedChangelog = prepareReleaseChangelog(
    changelogMarkdown,
    releaseVersion
  );
  if (preparedChangelog.didShift) {
    console.log(
      colors
        .bold()
        .yellow(
          `CHANGELOG.md still has Unreleased items that belong under ## ${releaseVersion}`
        )
    );
    if (dryRun) {
      console.log(
        colors.bold('\nGitHub release notes (after the pending shift)\n')
      );
      console.log(
        formatGithubReleaseNotes(preparedChangelog.notes, releaseVersion)
      );
    } else {
      throw new Error(
        `CHANGELOG.md still has Unreleased items that belong under ## ${releaseVersion}. Run \`pnpm changelog:shift\` and commit CHANGELOG.md before publishing.`
      );
    }
  } else {
    console.log(colors.bold('\nGitHub release notes\n'));
    console.log(
      formatGithubReleaseNotes(preparedChangelog.notes, releaseVersion)
    );
  }

  if (dryRun) {
    try {
      assertGithubCli();
      assertCommitOnGithub(releaseSha);
      const githubStatus = inspectGithubRelease(releaseTag);
      console.log(
        colors
          .bold()
          .green(
            githubStatus === 'already-exists'
              ? `GitHub release ${releaseTag} already exists`
              : `Would push ${releaseTag} and create the GitHub release at ${releaseSha}`
          )
      );
    } catch (error) {
      console.log(
        colors
          .bold()
          .yellow(
            error instanceof Error
              ? error.message
              : 'GitHub release preflight failed'
          )
      );
    }
  } else {
    assertGithubCli();
    assertCommitOnGithub(releaseSha);
    inspectGithubRelease(releaseTag);
  }

  if (!dryRun) {
    execSync('pnpm run build', { stdio: 'inherit' });
    execSync('pnpm run skills:check', { stdio: 'inherit' });
    execSync('pnpm run skills:pack-check', { stdio: 'inherit' });
  }

  for (const { dirName, name, version } of packages) {
    try {
      if (!version) throw new Error(`Package ${name} has no version`);
      const preflight = preflightPackage(name, version);
      if (preflight === 'already-published') {
        console.log(
          colors
            .bold()
            .yellow(`Already published ${name} v${version}; skipping`)
        );
        continue;
      }

      if (dryRun) {
        console.log(colors.bold().green(`Would publish ${name} v${version}`));
        continue;
      }

      execSync('pnpm publish --access public --no-git-checks', {
        stdio: 'inherit',
        cwd: path.resolve(path.join('packages', dirName)),
      });
      console.log(colors.bold().green(`Published ${name} v${version}`));
    } catch (error) {
      console.error(colors.red(`${name} ${version} failed to publish`));
      if (error instanceof Error) console.error(error.message);
      process.exitCode = 1;
      break;
    }
  }
  if (process.exitCode !== undefined) return;

  if (dryRun) {
    console.log(
      colors
        .bold()
        .green(
          `Dry run finished for ${releaseTag} at ${releaseSha}. Nothing was published.`
        )
    );
    return;
  }

  const githubStatus = inspectGithubRelease(releaseTag);
  if (githubStatus === 'already-exists') {
    console.log(
      colors
        .bold()
        .yellow(`GitHub release ${releaseTag} already exists; skipping`)
    );
  } else {
    ensureAnnotatedReleaseTag(releaseTag, releaseSha);
    pushReleaseTag(releaseTag);
    createGithubRelease({
      tag: releaseTag,
      notes: formatGithubReleaseNotes(preparedChangelog.notes, releaseVersion),
      target: releaseSha,
    });
    console.log(colors.bold().green(`Created GitHub release ${releaseTag}`));
  }

  console.log(colors.bold().green(`Published release commit: ${releaseSha}`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await publishPackages(parsePublishArgs(process.argv.slice(2)));
}
