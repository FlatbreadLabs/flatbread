import { basename } from 'node:path';
import { findUpSync } from 'find-up';

/**
 * Package manager configurations mapping lock files to their commands
 */
export interface PackageManagerConfig {
  /** Command to run scripts (e.g., "npm run", "pnpm") */
  runCommand: string;
  /** Command to install packages (e.g., "npm install", "pnpm add") */
  installCommand: string;
  /** Lock file name */
  lockFile: string;
}

/**
 * Map of lock files to package manager configurations
 */
const lockToPackageManager: Record<string, PackageManagerConfig> = {
  'pnpm-lock.yaml': {
    runCommand: 'pnpm',
    installCommand: 'pnpm i',
    lockFile: 'pnpm-lock.yaml',
  },
  'yarn.lock': {
    runCommand: 'yarn',
    installCommand: 'yarn add',
    lockFile: 'yarn.lock',
  },
  'package-lock.json': {
    runCommand: 'npm run',
    installCommand: 'npm install',
    lockFile: 'package-lock.json',
  },
  'bun.lockb': {
    runCommand: 'bun run',
    installCommand: 'bun add',
    lockFile: 'bun.lockb',
  },
};

/**
 * Default package manager configuration (npm)
 */
const defaultPackageManager: PackageManagerConfig = {
  runCommand: 'npm run',
  installCommand: 'npm install',
  lockFile: 'package-lock.json',
};

/**
 * Detect the package manager used within the current working directory.
 *
 * Inspired by [@antfu/ni](https://github.com/antfu/ni)
 *
 * @param cwd The directory to search for a lock file
 * @returns The package manager configuration, or default (npm) if none found
 */
export function detectPackageManager(cwd?: string): PackageManagerConfig {
  const result = findUpSync(Object.keys(lockToPackageManager), { cwd });
  return result
    ? lockToPackageManager[basename(result)]
    : defaultPackageManager;
}

/**
 * Get the run command for the detected package manager.
 *
 * @param cwd The directory to search for a lock file
 * @returns The run command (e.g., "npm run", "pnpm")
 */
export function getRunCommand(cwd?: string): string {
  return detectPackageManager(cwd).runCommand;
}

/**
 * Get the install command for the detected package manager.
 *
 * @param cwd The directory to search for a lock file
 * @returns The install command (e.g., "npm install", "pnpm add")
 */
export function getInstallCommand(cwd?: string): string {
  return detectPackageManager(cwd).installCommand;
}

/**
 * Generate an install command for the given packages using the detected package manager.
 *
 * @param packages Array of package names to install
 * @param cwd The directory to search for a lock file
 * @returns The complete install command (e.g., "npm install package1 package2")
 */
export function generateInstallCommand(
  packages: string[],
  cwd?: string
): string {
  const installCommand = getInstallCommand(cwd);
  return `${installCommand} ${packages.join(' ')}`;
}
