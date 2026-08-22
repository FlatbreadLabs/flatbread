import { execFileSync, execSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'url';
import path from 'path';
import colors from 'kleur';
import {
  formatGithubReleaseNotes,
  githubReleaseTag,
  parseChangelog,
  prepareReleaseChangelog,
  splitUnreleasedBody,
} from './utils/changelog';
import type { PreparedChangelog } from './utils/changelog';
import { getMonorepoPublicPackages } from './utils/packageManifest';
// import { version } from '../package.json';

export type NpmViewResult = {
  stdout?: string;
  error?: unknown;
};

export type PreflightStatus = 'publish' | 'already-published';

export type GithubReleaseStatus = 'create' | 'already-exists';

export type RemoteReleaseTagStatus = 'absent' | 'same-commit';

export type PublishOptions = {
  readonly dryRun: boolean;
};

export type GhReleaseViewResult = {
  stdout?: string;
  error?: unknown;
};

export type GithubPreflightChecks = {
  readonly assertGithubCli: () => void;
  readonly assertCommitOnGithub: (sha: string) => void;
  readonly inspectGithubRelease: (
    tag: string,
    expectedNotes: string
  ) => GithubReleaseStatus;
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
  result: GhReleaseViewResult,
  tag: string,
  expectedNotes: string
): GithubReleaseStatus {
  if (!result.error) {
    let value: unknown;
    try {
      value = JSON.parse(result.stdout ?? '');
    } catch {
      throw new Error('gh release view returned an unexpected response');
    }
    if (
      !value ||
      typeof value !== 'object' ||
      typeof (value as { tagName?: unknown }).tagName !== 'string' ||
      typeof (value as { body?: unknown }).body !== 'string'
    ) {
      throw new Error('gh release view returned an unexpected response');
    }

    const release = value as {
      readonly body: string;
      readonly tagName: string;
    };
    if (release.tagName !== tag) {
      throw new Error(
        `gh release view returned ${release.tagName}, not ${tag}`
      );
    }
    if (
      normalizeReleaseNotes(release.body) !==
      normalizeReleaseNotes(expectedNotes)
    ) {
      throw new Error(
        `GitHub release ${tag} does not match its CHANGELOG.md notes. Update or remove the release before publishing.`
      );
    }
    return 'already-exists';
  }

  const details = collectErrorDetails(result.error);
  const errorRecord = getErrorRecord(result.error);
  const hasHttp404 =
    errorRecord?.status === 404 ||
    errorRecord?.statusCode === 404 ||
    /\bHTTP(?:\/\d(?:\.\d)?)?\s+404\b/i.test(details);
  if (/\brelease not found\b/i.test(details) || hasHttp404) {
    return 'create';
  }

  throw new Error(`gh release view failed: ${details || 'unknown error'}`);
}

function normalizeReleaseNotes(notes: string): string {
  return notes.replace(/\r\n/g, '\n').trim();
}

export function inspectGithubRelease(
  tag: string,
  expectedNotes: string
): GithubReleaseStatus {
  let stdout: string;
  try {
    stdout = execFileSync(
      'gh',
      ['release', 'view', tag, '--json', 'tagName,body'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
  } catch (error) {
    return classifyGhReleaseView({ error }, tag, expectedNotes);
  }
  return classifyGhReleaseView({ stdout }, tag, expectedNotes);
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

export function preflightGithubRelease(
  tag: string,
  sha: string,
  expectedNotes: string,
  checks: GithubPreflightChecks = {
    assertGithubCli,
    assertCommitOnGithub,
    inspectGithubRelease,
  }
): GithubReleaseStatus {
  checks.assertGithubCli();
  checks.assertCommitOnGithub(sha);
  return checks.inspectGithubRelease(tag, expectedNotes);
}

function getErrorRecord(error: unknown): Record<string, unknown> | undefined {
  return error && typeof error === 'object'
    ? (error as Record<string, unknown>)
    : undefined;
}

function collectErrorDetails(error: unknown): string {
  const errorRecord = getErrorRecord(error);
  return errorRecord
    ? [
        errorRecord.code,
        errorRecord.status,
        errorRecord.statusCode,
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

export function classifyRemoteReleaseTag(
  stdout: string,
  tag: string,
  releaseSha: string
): RemoteReleaseTagStatus {
  const directRef = `refs/tags/${tag}`;
  const peeledRef = `${directRef}^{}`;
  const refs = new Map<string, string>();

  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length !== 2) {
      throw new Error(`git ls-remote returned an unexpected line: ${line}`);
    }
    const [sha, ref] = parts;
    if (ref !== directRef && ref !== peeledRef) {
      throw new Error(`git ls-remote returned an unexpected ref: ${ref}`);
    }
    const prior = refs.get(ref);
    if (prior && prior !== sha) {
      throw new Error(`git ls-remote returned conflicting values for ${ref}`);
    }
    refs.set(ref, sha);
  }

  const remoteSha = refs.get(peeledRef) ?? refs.get(directRef);
  if (!remoteSha) return 'absent';
  if (remoteSha === releaseSha) return 'same-commit';

  throw new Error(
    `Remote tag ${tag} points at ${remoteSha}, not the release commit ${releaseSha}. Release tags cannot be moved.`
  );
}

export function preflightRemoteReleaseTag(
  tag: string,
  releaseSha: string
): RemoteReleaseTagStatus {
  const stdout = execFileSync(
    'git',
    ['ls-remote', 'origin', `refs/tags/${tag}`, `refs/tags/${tag}^{}`],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  return classifyRemoteReleaseTag(stdout, tag, releaseSha);
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

export function prepareReadyReleaseChangelog(
  markdown: string,
  version: string
): PreparedChangelog {
  const doc = parseChangelog(markdown);
  const existing = doc.versions.find((entry) => entry.version === version);
  if (existing && !existing.body.trim()) {
    throw new Error(
      `CHANGELOG.md section ## ${version} has no release notes. Add the release notes before publishing.`
    );
  }

  const prepared = prepareReleaseChangelog(markdown, version);
  if (!prepared.didShift) return prepared;

  const { releaseNotes } = splitUnreleasedBody(doc.unreleased);
  if (releaseNotes) {
    throw new Error(
      `CHANGELOG.md still has Unreleased list items that belong under ## ${version}. Run \`pnpm changelog:shift\` and commit CHANGELOG.md before publishing.`
    );
  }

  throw new Error(
    `CHANGELOG.md is missing ## ${version}, and Unreleased has no list items to file. Run \`pnpm changelog:shift\` and commit CHANGELOG.md before publishing.`
  );
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

  const releaseSha = assertCleanRelease();

  const packages = sortPackages(
    (await getMonorepoPublicPackages()) as unknown as PublishPackage[]
  );
  const releaseVersion = assertLockstepVersions(packages);
  const releaseTag = githubReleaseTag(releaseVersion);
  console.log(
    colors.bold().green(`Public package release version: ${releaseVersion}`)
  );

  const changelogMarkdown = readFileSync('CHANGELOG.md', 'utf8');
  const preparedChangelog = prepareReadyReleaseChangelog(
    changelogMarkdown,
    releaseVersion
  );
  const formattedReleaseNotes = formatGithubReleaseNotes(
    preparedChangelog.notes,
    releaseVersion
  );
  console.log(colors.bold('\nGitHub release notes\n'));
  console.log(formattedReleaseNotes);

  const githubStatus = preflightGithubRelease(
    releaseTag,
    releaseSha,
    formattedReleaseNotes
  );
  const remoteTagStatus = preflightRemoteReleaseTag(releaseTag, releaseSha);
  console.log(
    colors
      .bold()
      .green(
        remoteTagStatus === 'same-commit'
          ? `Remote tag ${releaseTag} already points at ${releaseSha}`
          : `Remote tag ${releaseTag} is available`
      )
  );
  if (dryRun) {
    console.log(
      colors
        .bold()
        .green(
          githubStatus === 'already-exists'
            ? `GitHub release ${releaseTag} already exists`
            : remoteTagStatus === 'same-commit'
            ? `Would create the GitHub release for ${releaseTag} at ${releaseSha}`
            : `Would push ${releaseTag} and create the GitHub release at ${releaseSha}`
        )
    );
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

  if (githubStatus === 'already-exists') {
    console.log(
      colors
        .bold()
        .yellow(`GitHub release ${releaseTag} already exists; skipping`)
    );
  } else {
    if (remoteTagStatus === 'absent') {
      ensureAnnotatedReleaseTag(releaseTag, releaseSha);
      pushReleaseTag(releaseTag);
    }
    createGithubRelease({
      tag: releaseTag,
      notes: formattedReleaseNotes,
      target: releaseSha,
    });
    console.log(colors.bold().green(`Created GitHub release ${releaseTag}`));
  }

  console.log(colors.bold().green(`Published release commit: ${releaseSha}`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await publishPackages(parsePublishArgs(process.argv.slice(2)));
}
