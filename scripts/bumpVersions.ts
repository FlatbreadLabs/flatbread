import { execSync } from 'child_process';
import inquirer from 'inquirer';
import colors from 'kleur';
import path from 'node:path';
import {
  getMonorepoPublicPackages,
  PathedFlatbreadPackage,
} from './utils/packageManifest';

type PackageChangeInfo = PathedFlatbreadPackage & {
  changedSinceLastPublish: boolean;
  lastPublishedAt?: string | null;
};

const DEBUG = Boolean(process.env.FLATBREAD_BUMP_DEBUG);

function getPkgName(pkg: PathedFlatbreadPackage): string {
  return (
    (pkg as unknown as { name?: string }).name ??
    (pkg as unknown as { default?: { name?: string } }).default?.name ??
    'unknown'
  );
}

function getPkgVersion(pkg: PathedFlatbreadPackage): string | undefined {
  return (
    (pkg as unknown as { version?: string }).version ??
    (pkg as unknown as { default?: { version?: string } }).default?.version
  );
}

function compareSemver(a: string, b: string): number {
  // Returns 1 if a > b, -1 if a < b, 0 if equal
  const parse = (v: string) => {
    const [core, pre = ''] = v.split('-');
    const [maj, min, pat] = core.split('.').map((x) => parseInt(x, 10));
    const preIds = pre === '' ? [] : pre.split('.');
    return { maj, min, pat, preIds } as const;
  };
  const isNumeric = (s: string) => /^\d+$/.test(s);
  const av = parse(a);
  const bv = parse(b);
  if (av.maj !== bv.maj) return av.maj > bv.maj ? 1 : -1;
  if (av.min !== bv.min) return av.min > bv.min ? 1 : -1;
  if (av.pat !== bv.pat) return av.pat > bv.pat ? 1 : -1;
  const aHasPre = av.preIds.length > 0;
  const bHasPre = bv.preIds.length > 0;
  if (!aHasPre && !bHasPre) return 0;
  if (!aHasPre && bHasPre) return 1; // release > prerelease
  if (aHasPre && !bHasPre) return -1;
  const len = Math.max(av.preIds.length, bv.preIds.length);
  for (let i = 0; i < len; i++) {
    const ai = av.preIds[i];
    const bi = bv.preIds[i];
    if (ai === undefined) return -1; // shorter is lower
    if (bi === undefined) return 1;
    const aiNum = isNumeric(ai) ? parseInt(ai, 10) : NaN;
    const biNum = isNumeric(bi) ? parseInt(bi, 10) : NaN;
    if (!Number.isNaN(aiNum) && !Number.isNaN(biNum)) {
      if (aiNum !== biNum) return aiNum > biNum ? 1 : -1;
    } else if (Number.isNaN(aiNum) && Number.isNaN(biNum)) {
      if (ai !== bi) return ai > bi ? 1 : -1;
    } else {
      // numeric < non-numeric
      return Number.isNaN(aiNum) ? 1 : -1;
    }
  }
  return 0;
}

function isVersionGreater(a: string, b: string): boolean {
  return compareSemver(a, b) > 0;
}

function getNpmJson(command: string): unknown | null {
  try {
    const stdout = execSync(command, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf-8',
    });
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function getLatestPublishedVersion(pkgName: string): string | null {
  // npm view <name> version --json returns the "latest" dist-tag version
  const data = getNpmJson(`npm view ${pkgName} version --json`);
  if (typeof data === 'string') return data;
  return null;
}

function getPublishedTimes(pkgName: string): Record<string, string> | null {
  // npm view <name> time --json returns map of version -> ISO date plus created/modified
  const data = getNpmJson(`npm view ${pkgName} time --json`);
  if (data && typeof data === 'object') return data as Record<string, string>;
  return null;
}

function hasGitChangesSince(isoDate: string, pkgDirName: string): boolean {
  try {
    // Get list of commits affecting this package since the last publish date
    const listCommitsCmd = `git log --since="${isoDate}" --pretty=format:%H -- packages/${pkgDirName}`;
    const commitsStdout = execSync(listCommitsCmd, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf-8',
    }).trim();

    if (!commitsStdout) return false;

    const commitHashes = commitsStdout.split(/\r?\n/).filter(Boolean);

    const commitHasMeaningfulChanges = (hash: string): boolean => {
      // List changed files in this commit scoped to the package path
      const filesStdout = execSync(
        `git diff-tree --no-commit-id --name-only -r ${hash} -- packages/${pkgDirName}`,
        { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf-8' }
      ).trim();

      if (!filesStdout) return false;
      const changedFiles = filesStdout.split(/\r?\n/).filter(Boolean);

      // If any file other than the package.json changed, it's meaningful
      const nonPkgJsonChanged = changedFiles.some(
        (f) => !f.endsWith(`${pkgDirName}/package.json`)
      );
      if (nonPkgJsonChanged) return true;

      // Only package.json changed. Check if only the version field changed.
      const onlyPackageJsonChanged =
        changedFiles.length === 1 &&
        changedFiles[0].endsWith(`${pkgDirName}/package.json`);
      if (!onlyPackageJsonChanged) return true;

      const diffStdout = execSync(
        `git show --unified=0 ${hash} -- packages/${pkgDirName}/package.json`,
        { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf-8' }
      );

      const diffLines = diffStdout
        .split(/\r?\n/)
        .filter(
          (line) =>
            (line.startsWith('+') || line.startsWith('-')) &&
            !line.startsWith('+++') &&
            !line.startsWith('---')
        );

      const versionLineRegex = /\"version\"\s*:/;
      const hasNonVersionChange = diffLines.some(
        (line) => !versionLineRegex.test(line)
      );
      return hasNonVersionChange;
    };

    for (const hash of commitHashes) {
      if (commitHasMeaningfulChanges(hash)) return true;
    }

    return false;
  } catch {
    // If git commands fail, be conservative and assume changes to avoid skipping bumps erroneously
    return true;
  }
}

async function detectChangedPackages(): Promise<PackageChangeInfo[]> {
  const packages = await getMonorepoPublicPackages();

  return packages.map((pkg) => {
    const name = getPkgName(pkg);
    const localVersion = getPkgVersion(pkg);
    const latestPublishedVersion = getLatestPublishedVersion(name);
    const times = getPublishedTimes(name);

    if (!latestPublishedVersion && !times) {
      if (DEBUG) {
        console.log(
          `[bump] ${name}: appears unpublished on npm; skipping bump suggestion`
        );
      }
      return { ...pkg, changedSinceLastPublish: false, lastPublishedAt: null };
    }

    if (!latestPublishedVersion || !times) {
      if (DEBUG) {
        console.log(
          `[bump] ${name}: unable to fetch full npm info; marking as changed`
        );
      }
      return { ...pkg, changedSinceLastPublish: true, lastPublishedAt: null };
    }

    // If local version is already greater than the latest published version,
    // we consider it already bumped and do not prompt for bumping again.
    if (
      localVersion &&
      isVersionGreater(localVersion as string, latestPublishedVersion)
    ) {
      if (DEBUG) {
        console.log(
          `[bump] ${name}: local version ${localVersion} > published ${latestPublishedVersion}; not changed`
        );
      }
      return { ...pkg, changedSinceLastPublish: false, lastPublishedAt: null };
    }

    const lastPublishedAt = times[latestPublishedVersion];
    if (!lastPublishedAt) {
      if (DEBUG) {
        console.log(
          `[bump] ${name}: cannot determine lastPublishedAt; marking as changed`
        );
      }
      return { ...pkg, changedSinceLastPublish: true, lastPublishedAt: null };
    }

    const changed = hasGitChangesSince(lastPublishedAt, pkg.dirName);
    if (DEBUG) {
      console.log(
        `[bump] ${name}: changedSince ${lastPublishedAt}? ${changed}`
      );
    }
    return { ...pkg, changedSinceLastPublish: changed, lastPublishedAt };
  });
}

// Discover changed packages since last publish and prompt to bump only those
const allPackages = await detectChangedPackages();
const changedPackages = allPackages.filter((p) => p.changedSinceLastPublish);

if (changedPackages.length === 0) {
  console.log(
    colors.bold().green('No package changes since last publish detected.')
  );
  process.exit(0);
}

const { selectedPackages }: Record<string, PathedFlatbreadPackage[]> =
  await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedPackages',
      message: 'Packages changed since last publish. Select which to bump:',
      choices: changedPackages.map((pkg) => ({
        name: `${getPkgName(pkg)}`,
        value: pkg,
        checked: true,
      })),
    },
  ]);

selectedPackages.forEach((selectedPackage) => {
  console.log(colors.bold(colors.yellow(`Bumping ${selectedPackage.name}`)));
  execSync('pnpm bumpp --no-commit --no-push --no-tag', {
    stdio: 'inherit',
    cwd: path.resolve(path.join('packages', selectedPackage.dirName)),
  });
});
