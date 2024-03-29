/**
 * Delay the start of the target process until the GraphQL server is ready.
 * Learned about this thanks to: https://stackoverflow.com/a/48050020/12368615
 */
import { fork, spawn } from 'node:child_process';
import { basename, resolve } from 'node:path';
import { findUpSync } from 'find-up';
import colors from 'kleur';

export interface OrchestraOptions {
  corunner: string;
  flatbreadPort: number;
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
  packageManager = null,
}: OrchestraOptions) {
  const pkgManager = packageManager || detectPkgManager(process.cwd());
  let serverModulePath = 'node_modules/flatbread/dist/graphql/server.js';

  process.cwd();
  const gql = fork(resolve(process.cwd(), serverModulePath), [''], {
    env: {
      ...process.env,
      NODE_OPTIONS: '--experimental-vm-modules',
      FLATBREAD_PORT: String(flatbreadPort),
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
