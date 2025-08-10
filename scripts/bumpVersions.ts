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
    const cmd = `git log --since="${isoDate}" --pretty=format:%H -- packages/${pkgDirName}`;
    const stdout = execSync(cmd, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf-8',
    }).trim();
    return stdout.length > 0;
  } catch {
    // If git command fails, be conservative and assume there are changes to avoid skipping bumps erroneously
    return true;
  }
}

async function detectChangedPackages(): Promise<PackageChangeInfo[]> {
  const packages = await getMonorepoPublicPackages();

  return packages.map((pkg) => {
    const latestPublishedVersion = getLatestPublishedVersion(pkg.name);
    const times = getPublishedTimes(pkg.name);

    if (!latestPublishedVersion || !times) {
      return { ...pkg, changedSinceLastPublish: true, lastPublishedAt: null };
    }

    const lastPublishedAt = times[latestPublishedVersion];
    if (!lastPublishedAt) {
      return { ...pkg, changedSinceLastPublish: true, lastPublishedAt: null };
    }

    const changed = hasGitChangesSince(lastPublishedAt, pkg.dirName);
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
        name: `${pkg.name}`,
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
