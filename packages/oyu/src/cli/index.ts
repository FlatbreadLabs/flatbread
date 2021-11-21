#!/usr/bin/env node
import sade from 'sade';
import colors from 'kleur';
import { version } from '../../package.json';
import { networkInterfaces, release } from 'os';

const GRAPHQL_ENDPOINT = '/graphql';
const EXPLORE_ENDPOINT = '/explore';

async function getConfig() {
  const { loadConfig } = await import('@oyu/config');

  try {
    return await loadConfig();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

/**
 * @param {number} port
 * @param {boolean} https
 */
async function launch(port: number, https: boolean) {
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

function welcome({
  port,
  https,
  open,
}: {
  open: boolean;
  https: boolean;
  port: number;
}) {
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
