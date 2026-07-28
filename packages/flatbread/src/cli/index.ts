import sade from 'sade';
import colors from 'kleur';
import gradient from 'gradient-string';
import { version } from '../../package.json';
import { networkInterfaces, release } from 'node:os';
import orchestrateProcesses from './runner';
import initConfig from './initConfig';
import { createCodegenCommand } from '@flatbread/codegen';
import { registerEffortCommands } from './effort';
import {
  EXPLORER_ENDPOINT,
  GRAPHQL_ENDPOINT,
  resolveOpenPath,
} from './openPath';
import { loadFlatbreadConfig } from '../utils/getSchema';

/**
 * Open a browser tab at the given path on the Flatbread server.
 *
 * Yoinked from [SvelteKit's CLI](https://github.com/sveltejs/kit/blob/2c133ff5b8798c885161ed57bfb45c88fc77f516/packages/kit/src/cli.js).
 */
async function launch(port: number, openPath: string): Promise<void> {
  const { exec } = await import('child_process');
  let cmd = 'open';
  if (process.platform == 'win32') {
    cmd = 'start';
  } else if (process.platform == 'linux') {
    if (/microsoft/i.test(release())) {
      cmd = 'cmd.exe /c start';
    } else {
      cmd = 'xdg-open';
    }
  }
  const path = openPath.startsWith('/') ? openPath : `/${openPath}`;
  exec(`${cmd} http://localhost:${port}${path}`);
}

const prog = sade('flatbread').version(version);

prog
  .command('start [corunner]', 'Start flatbread with a GraphQL server')
  .option('--, _', 'Pass options to the corunning script')
  .option('-p, --port', 'Port to run the GraphQL server', 5057)
  .option(
    '-H, --https',
    'Reserved. Flatbread serves HTTP only; this flag does nothing',
    false
  )
  .option('-w, --watch', 'Hot-swap content and reload config', false)
  .option(
    '-o, --open',
    'Open the explorer (or GraphQL sandbox) in a browser tab',
    false
  )
  .option(
    '-X, --exec',
    'The runner to execute the corunning script with. Defaults to your package manager (i.e. npm, pnpm, yarn)'
  )
  .action(async (corunner, { _, port, watch, open, exec }) => {
    const args = Array.isArray(_) ? _ : [];
    const secondaryScript =
      typeof corunner === 'string' && corunner.length > 0
        ? `${corunner} ${args.join(' ')}`.trim()
        : '';

    // Fork before reading the config so config load stays off the critical
    // path to `flatbread-gql-ready` (and to the corunner). `--open` waits on
    // this promise instead, so it always opens the resolved path.
    let settleOpenPath!: (path: string) => void;
    const resolvedOpenPath = new Promise<string>((resolve) => {
      settleOpenPath = resolve;
    });

    orchestrateProcesses({
      corunner: secondaryScript,
      flatbreadPort: port,
      watch,
      packageManager: exec,
      onReady: open
        ? () => {
            void resolvedOpenPath.then((path) => launch(port, path));
          }
        : undefined,
    });

    let openPath = GRAPHQL_ENDPOINT;
    let explorer = false;
    try {
      const loaded = await loadFlatbreadConfig(process.cwd());
      openPath = resolveOpenPath(loaded.config?.content);
      explorer = openPath === EXPLORER_ENDPOINT;
    } catch {
      // Config may be missing during init; fall back to GraphQL sandbox.
    }
    settleOpenPath(openPath);

    welcome({ port, explorer });
  });

prog
  .command('init', 'Generate a flatbread.config.js file skeleton')
  .action(initConfig);

prog
  .command('codegen', 'Generate TypeScript types from GraphQL schema')
  .option('-c, --config <path>', 'Path to Flatbread config file')
  .option('-o, --output-dir <dir>', 'Output directory for generated types')
  .option('-f, --output-file <file>', 'Output filename for generated types')
  .option('-w, --watch', 'Watch for changes and regenerate', false)
  .option('--clear-cache', 'Clear cache and force regeneration', false)
  .option(
    '-d, --documents <paths>',
    'Additional document paths (comma-separated)'
  )
  .option('-v, --verbose', 'Enable verbose logging', false)
  .action(async (options) => {
    const codegenCommand = createCodegenCommand();
    await codegenCommand({
      config: options.config,
      outputDir: options.outputDir,
      outputFile: options.outputFile,
      watch: options.watch,
      clearCache: options.clearCache,
      documents: options.documents
        ? options.documents.split(',').map((d: string) => d.trim())
        : undefined,
      verbose: options.verbose,
    });
  });

registerEffortCommands(prog);

prog.parse(process.argv, { unknown: (arg) => `Unknown option: ${arg}` });

/**
 * The welcome message for the user when starting the server.
 *
 * Yoinked from [SvelteKit's CLI](https://github.com/sveltejs/kit/blob/2c133ff5b8798c885161ed57bfb45c88fc77f516/packages/kit/src/cli.js) with some modifications.
 */
function welcome({
  port,
  explorer,
}: {
  port: number;
  explorer: boolean;
}): void {
  console.log(
    colors.bold(
      gradient.fruit('\n Flatbread 🥯') + gradient.vice(` v${version}\n`)
    )
  );

  Object.values(networkInterfaces()).forEach((interfaces) => {
    if (!interfaces) return;
    interfaces.forEach((details) => {
      if (details.family !== 'IPv4') return;

      if (details.internal) {
        if (explorer) {
          console.log(
            `  ${colors.gray('explorer:')} http://${colors.bold(
              `localhost:${port}${EXPLORER_ENDPOINT}`
            )}`
          );
        }
        console.log(
          `  ${colors.gray('graphql:')} http://${colors.bold(
            `localhost:${port}${GRAPHQL_ENDPOINT}`
          )}`
        );
      } else {
        if (details.mac === '00:00:00:00:00:00') return;
      }
    });
  });

  console.log('\n');
}
