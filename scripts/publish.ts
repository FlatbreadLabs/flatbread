import { execFileSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import colors from 'kleur';
import { getMonorepoPublicPackages } from './utils/packageManifest';
// import { version } from '../package.json';

export type NpmViewResult = {
  stdout?: string;
  error?: unknown;
};

export type PreflightStatus = 'publish' | 'already-published';

type PublishPackage = {
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

export async function publishPackages(): Promise<void> {
  const releaseSha = assertCleanRelease();
  execSync('pnpm run build', { stdio: 'inherit' });
  execSync('pnpm run skills:check', { stdio: 'inherit' });
  execSync('pnpm run skills:pack-check', { stdio: 'inherit' });

  const packages = sortPackages(
    (await getMonorepoPublicPackages()) as unknown as PublishPackage[]
  );

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
  if (process.exitCode === undefined) {
    console.log(colors.bold().green(`Published release commit: ${releaseSha}`));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await publishPackages();
}
