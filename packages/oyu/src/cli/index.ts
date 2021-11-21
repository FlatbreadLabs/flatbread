#!/usr/bin/env node
import sade from 'sade';
import colors from 'kleur';
import { version } from '../../package.json';
import { networkInterfaces, release } from 'os';

import type { ConfigResult, OyuConfig } from '@oyu/config';

const GRAPHQL_ENDPOINT = '/graphql';
const EXPLORE_ENDPOINT = '/explore';

/**
 * Wrapper around grabbing the user config and killing
 * the process if the config file is invalid.
 *
 * @returns user config promise
 */
async function getConfig(): Promise<ConfigResult<OyuConfig>> {
  const { loadConfig } = await import('@oyu/config');

  try {
    return await loadConfig();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

/**
 * Launch the GraphQL explorer in a browser.
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
    `${cmd} ${https ? 'https' : 'http'}://localhost:${port + EXPLORE_ENDPOINT}`
  );
}

const prog = sade('oyu').version(version);

prog
  .command('start')
  .describe('Start oyu with a GraphQL server')
  // .option('-p, --port [port]', 'Port to listen on', '5555')
  .option('-p, --port', 'Port to run the GraphQL server', 5050)
  .option('-H, --https', 'Use self-signed HTTPS certificate', false)
  .option('-o, --open', 'Open the explorer in a browser tab', false)
  .action(async ({ port, https, open }) => {
    const config = await getConfig();

    welcome({
      port,
      https,
      open,
    });
    console.log(config);
  });

prog.parse(process.argv, { unknown: (arg) => `Unknown option: ${arg}` });

/**
 * The welcome message for the user when starting the server.
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

  console.log(colors.bold().yellow(`\n  おゆ (O yu) [♨️ 🚰] v${version}\n`));

  const protocol = https ? 'https:' : 'http:';

  Object.values(networkInterfaces()).forEach((interfaces) => {
    if (!interfaces) return;
    interfaces.forEach((details) => {
      if (details.family !== 'IPv4') return;

      if (details.internal) {
        console.log(
          `  ${colors.gray('graphql:  ')} ${protocol}//${colors.bold(
            `localhost:${port + GRAPHQL_ENDPOINT}`
          )}`
        );
        console.log(
          `  ${colors.gray('explore:  ')} ${protocol}//${colors.bold(
            `localhost:${port + EXPLORE_ENDPOINT}`
          )}`
        );
      } else {
        if (details.mac === '00:00:00:00:00:00') return;
      }
    });
  });

  console.log('\n');
}
