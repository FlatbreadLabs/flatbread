import sade from 'sade';
import colors from 'kleur';
import gradient from 'gradient-string';
import { version } from '../../package.json';
import { networkInterfaces, release } from 'os';
import orchestrateProcesses from './runner';
import initConfig from './initConfig';

const GRAPHQL_ENDPOINT = '/graphql';

/**
 * Launch the GraphQL explorer in a browser.
 *
 * Yoinked from [SvelteKit's CLI](https://github.com/sveltejs/kit/blob/2c133ff5b8798c885161ed57bfb45c88fc77f516/packages/kit/src/cli.js).
 *
 * @param {number} port the port the server is running on
 * @param {boolean} https whether the server is running on https
 */
async function launch(port: number, https: boolean): Promise<void> {
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
  exec(
    `${cmd} ${https ? 'https' : 'http'}://localhost:${port + GRAPHQL_ENDPOINT}`
  );
}

const prog = sade('flatbread').version(version);

prog
  .command('start [corunner]', 'Start flatbread with a GraphQL server')
  .option('--, _', 'Pass options to the corunning script')
  .option('-p, --port', 'Port to run the GraphQL server', 5057)
  .option('-H, --https', 'Use self-signed HTTPS certificate', false)
  .option('-o, --open', 'Open the explorer in a browser tab', false)
  .action(async (corunner, { _, port, https, open }) => {
    // Combine the corunning script & the options passed to it
    const secondaryScript = `${corunner} ${_.join(' ')}`;
    // Yeet it into the all seeing eye of the universe
    orchestrateProcesses({
      corunner: secondaryScript,
      flatbreadPort: port,
    });
    // Say hi for good measure
    welcome({ port, https, open });
  });

prog
  .command('init', 'Generate a flatbread.config.js file skeleton')
  .action(initConfig);

prog.parse(process.argv, { unknown: (arg) => `Unknown option: ${arg}` });

/**
 * The welcome message for the user when starting the server.
 *
 * Yoinked from [SvelteKit's CLI](https://github.com/sveltejs/kit/blob/2c133ff5b8798c885161ed57bfb45c88fc77f516/packages/kit/src/cli.js) with some modifications.
 *
 * @param serverConfig server config object
 */
function welcome({
  port,
  https,
  open,
}: {
  open: boolean;
  https: boolean;
  port: number;
}): void {
  if (open) launch(port, https);

  console.log(
    colors.bold(
      gradient.fruit('\n Flatbread 🥯') + gradient.vice(` v${version}\n`)
    )
  );

  const protocol = https ? 'https:' : 'http:';

  Object.values(networkInterfaces()).forEach((interfaces) => {
    if (!interfaces) return;
    interfaces.forEach((details) => {
      if (details.family !== 'IPv4') return;

      if (details.internal) {
        console.log(
          `  ${colors.gray('graphql:')} ${protocol}//${colors.bold(
            `localhost:${port + GRAPHQL_ENDPOINT}`
          )}`
        );
      } else {
        if (details.mac === '00:00:00:00:00:00') return;
      }
    });
  });

  console.log('\n');
}
