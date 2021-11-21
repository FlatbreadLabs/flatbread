/**
 * Delay the start of the target process until the GraphQL server is ready.
 * Learned about this thanks to: https://stackoverflow.com/a/48050020/12368615
 */
import { fork, spawn } from 'child_process';
import { basename, resolve } from 'path';
import { findUpSync } from 'find-up';

export interface OrchestraOptions {
  corunner: string;
  oyuPort: number;
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
  oyuPort,
}: OrchestraOptions) {
  const pkgManager = detectPkgManager(process.cwd());
  let serverModulePath = 'node_modules/oyu/dist/graphql/server.mjs';

  const gql = fork(resolve(process.cwd(), serverModulePath), [], {
    env: { OYU_PORT: String(oyuPort) },
  });
  let runningScripts = [gql];

  gql.on('message', (msg) => {
    if (msg === 'oyu-gql-ready') {
      // Start the target process (e.g. the dev server or the build script)
      const targetProcess = spawn(pkgManager ?? 'npm run', [corunner], {
        shell: true,
        stdio: 'inherit',
      });
      // targetProcess.stdout.pipe(process.stdout);
      runningScripts.push(targetProcess);

      // Exit the parent process when the target process exits
      for (let script of runningScripts) {
        script.on('close', function (code) {
          console.log('child process exited with code ' + code);
          process.exit();
        });
      }
    }
  });

  // End any remaining child processes when the parent process exits
  process.on('exit', function () {
    console.log('killing', runningScripts.length, 'child processes');
    runningScripts.forEach(function (child) {
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
