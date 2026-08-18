import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import test from 'ava';

import { assertUsingPnpm } from './require-pnpm.mjs';

const script = join(
  dirname(fileURLToPath(import.meta.url)),
  'require-pnpm.mjs'
);

test('accepts a pnpm lifecycle user agent', (t) => {
  t.notThrows(() =>
    assertUsingPnpm('pnpm/10.33.0 npm/? node/v22.18.0 linux x64')
  );
});

test('rejects npm, Yarn, and a blank user agent', (t) => {
  for (const userAgent of [
    'npm/11.5.1 node/v22.18.0 linux x64',
    'yarn/1.22.22 npm/? node/v22.18.0 linux x64',
    '',
  ]) {
    const error = t.throws(() => assertUsingPnpm(userAgent));
    t.regex(error.message, /requires pnpm 10\.33\.0/);
  }
});

test('the CLI guard is shell-independent', (t) => {
  const env = {
    ...process.env,
    npm_config_user_agent: 'npm/11.5.1 node/v22.18.0 win32 x64',
  };
  const result = spawnSync(process.execPath, [script], {
    env,
    encoding: 'utf8',
  });

  t.is(result.status, 1);
  t.regex(result.stderr, /requires pnpm 10\.33\.0/);
});
