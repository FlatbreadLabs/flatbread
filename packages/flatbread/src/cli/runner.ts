/**
 * Delay the start of the target process until the GraphQL server is ready.
 * Learned about this thanks to: https://stackoverflow.com/a/48050020/12368615
 */
import { fork, spawn } from 'child_process';
import { basename, resolve } from 'path';
import { findUpSync } from 'find-up';
import colors from 'kleur';

export interface OrchestraOptions {
  corunner: string;
  flatbreadPort: number;
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
}: OrchestraOptions) {
  const pkgManager = detectPkgManager(process.cwd());
  let serverModulePath = 'node_modules/flatbread/dist/graphql/server.mjs';

  process.cwd();
  const gql = fork(resolve(process.cwd(), serverModulePath), [], {
    env: {
      OYU_PORT: String(flatbreadPort),
    },
  });
  let runningScripts = [gql];

  gql.on('message', (msg) => {
    if (msg === 'flatbread-gql-ready') {
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
          process.exit();
        });
      }
    }
  });

  // End any remaining child processes when the parent process exits
  process.on('exit', function () {
    console.log(
      colors.bold().green("\nFlatbread is coolin' off now 🍵 bye bye! 🧙")
    );
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
