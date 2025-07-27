/**
 * Delay the start of the target process until the GraphQL server is ready.
 * Learned about this thanks to: https://stackoverflow.com/a/48050020/12368615
 */
import { fork, spawn } from 'node:child_process';
import { basename, resolve } from 'node:path';
import { findUpSync } from 'find-up';
import { existsSync } from 'node:fs';
import colors from 'kleur';

export interface OrchestraOptions {
  corunner: string;
  flatbreadPort: number;
  https?: boolean;
  packageManager: string | null;
}

/**
 * Block the target process until the GraphQL server is ready.
 *
 * Auto-detects your package manager and uses the appropriate command to invoke the target process.
 *
 * @param secondary Script to run after the GraphQL server is ready
 */
export default function orchestrateProcesses({
  corunner,
  flatbreadPort,
  https = false,
  packageManager = null,
}: OrchestraOptions) {
  const pkgManager = packageManager || detectPkgManager(process.cwd());

  // Try to resolve the server module path
  let serverModulePath = resolveServerModulePath(pkgManager);

  process.cwd();
  const gql = fork(serverModulePath, [''], {
    env: {
      ...process.env,
      NODE_OPTIONS: '--experimental-vm-modules',
      FLATBREAD_PORT: String(flatbreadPort),
      FLATBREAD_HTTPS: String(https),
    },
  });
  let runningScripts = [gql];

  gql.on('message', (msg) => {
    if (msg !== 'flatbread-gql-ready') return;

    // Start the target process (e.g. the dev server or the build script)
    const targetProcess = spawn(pkgManager ?? 'npm run', [corunner], {
      shell: true,
      stdio: 'inherit',
    });

    runningScripts.push(targetProcess);

    // Exit the parent process when the target process exits
    for (let script of runningScripts) {
      script.on('close', (code) => {
        //
        // If the target process exited with a non-zero `code`, exit the parent process with the same `code`
        //
        // If the target process closes with a null `code`, exit the parent process with an exit code of 1
        // (this usually indicates an error originating outside of the target process, where it is killed before it can exit)
        //
        // See https://nodejs.org/api/child_process.html#event-exit
        //
        process.exit(code ?? 1);
      });
    }
  });

  // End any remaining child processes when the parent process exits
  process.on('exit', (code) => {
    if (code === 0) {
      // Successfully exit
      console.log(
        colors.bold().green('\nFlatbread is done for now. Bye bye! 🥪')
      );
    } else {
      // Exit with an error code
      console.log(colors.bold().red("\nFlatbread is feelin' moldy 🦠"));
    }

    runningScripts.forEach((child) => {
      child.kill();
    });
  });
}

/**
 * Resolve the GraphQL server module path using Node.js module resolution with fallbacks
 */
function resolveServerModulePath(pkgManager: string | null): string {
  try {
    // First, try to use Node.js's require.resolve for proper module resolution
    // This handles the vast majority of normal installations
    const flatbreadPackageJson = require.resolve('flatbread/package.json');
    const flatbreadDir = resolve(flatbreadPackageJson, '..');
    const serverPath = resolve(flatbreadDir, 'dist/graphql/server.js');

    if (existsSync(serverPath)) {
      return serverPath;
    }
  } catch (error) {
    // require.resolve failed, try fallback approaches
  }

  // Fallback: Search up the directory tree for node_modules/flatbread
  // This handles hoisted node_modules and monorepo scenarios
  const nodeModulesPath = findNodeModulesFlatbread(process.cwd());
  if (nodeModulesPath !== null) {
    return nodeModulesPath;
  }

  // If we still can't find it, provide a helpful error
  throw new Error(
    'Could not locate flatbread GraphQL server module. ' +
      `Please ensure flatbread is properly installed by running \`${
        pkgManager ?? 'npm'
      } install flatbread\`.`
  );
}

/**
 * Search up the directory tree for node_modules/flatbread/dist/graphql/server.js
 */
function findNodeModulesFlatbread(startDir: string): string | null {
  let currentDir = startDir;

  while (currentDir !== resolve(currentDir, '..')) {
    const serverPath = resolve(
      currentDir,
      'node_modules/flatbread/dist/graphql/server.js'
    );
    if (existsSync(serverPath)) {
      return serverPath;
    }

    // Move up one directory
    currentDir = resolve(currentDir, '..');
  }

  // Check the root directory as well
  const rootServerPath = resolve(
    currentDir,
    'node_modules/flatbread/dist/graphql/server.js'
  );
  if (existsSync(rootServerPath)) {
    return rootServerPath;
  }

  return null;
}

/**
 * Map of lock files to the command for running a script
 * with that respective package manager.
 */
const lockToRunner: Record<string, string> = {
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
  'package-lock.json': 'npm run',
  'bun.lockb': 'bun run',
};

/**
 * Detect the package manager used within the current working directory.
 *
 * Inspired by [@antfu/ni](https://github.com/antfu/ni)
 *
 * @param cwd The directory to search for a lock file
 * @returns The package manager command to run the script
 */
function detectPkgManager(cwd?: string) {
  const result = findUpSync(Object.keys(lockToRunner), { cwd });
  return result ? lockToRunner[basename(result)] : null;
}
