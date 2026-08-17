import test from 'ava';

import {
  buildDocsBasePath,
  buildDocsRoot,
  DOCS_BASE_PATH,
  runDocsBuild,
} from './build-docs-base-path.mjs';

test('builds docs with the Pages base path', (t) => {
  let call;
  const status = buildDocsBasePath({
    env: { KEEP_ME: 'yes', NEXT_PUBLIC_BASE_PATH: '/wrong' },
    platform: 'linux',
    spawn(command, args, options) {
      call = { command, args, options };
      return { status: 0 };
    },
  });

  t.is(status, 0);
  t.is(call.command, 'pnpm');
  t.deepEqual(call.args, ['--filter', '@flatbread/docs', 'build']);
  t.is(call.options.env.NEXT_PUBLIC_BASE_PATH, DOCS_BASE_PATH);
  t.is(call.options.env.KEEP_ME, 'yes');
  t.false(call.options.shell);
  t.is(call.options.stdio, 'inherit');
});

test('clears an ambient base path for the root export', (t) => {
  let childEnv;
  const status = buildDocsRoot({
    env: { KEEP_ME: 'yes', NEXT_PUBLIC_BASE_PATH: '/wrong' },
    spawn: (_command, _args, options) => {
      childEnv = options.env;
      return { status: 0 };
    },
  });

  t.is(status, 0);
  t.false(Object.hasOwn(childEnv, 'NEXT_PUBLIC_BASE_PATH'));
  t.is(childEnv.KEEP_ME, 'yes');
});

test('uses the command shell only for Windows package scripts', (t) => {
  let shell;
  const status = buildDocsBasePath({
    platform: 'win32',
    spawn: (_command, _args, options) => {
      shell = options.shell;
      return { status: 0 };
    },
  });

  t.is(status, 0);
  t.true(shell);
});

test('dispatches --root through the CLI runner', (t) => {
  let childEnv;
  const processState = {};
  const status = runDocsBuild({
    argv: ['node', 'build-docs-base-path.mjs', '--root'],
    processState,
    env: { NEXT_PUBLIC_BASE_PATH: '/wrong' },
    spawn: (_command, _args, options) => {
      childEnv = options.env;
      return { status: 0 };
    },
  });

  t.is(status, 0);
  t.is(processState.exitCode, 0);
  t.false(Object.hasOwn(childEnv, 'NEXT_PUBLIC_BASE_PATH'));
});

test('propagates a nonzero docs build status', (t) => {
  const processState = {};
  const status = runDocsBuild({
    argv: [],
    processState,
    spawn: () => ({ status: 23 }),
  });

  t.is(status, 23);
  t.is(processState.exitCode, 23);
});

test('reports a spawn error and returns failure', (t) => {
  const messages = [];
  const processState = {};
  const status = runDocsBuild({
    argv: [],
    processState,
    spawn: () => ({ error: new Error('pnpm is unavailable'), status: null }),
    reportError: (message) => messages.push(message),
  });

  t.is(status, 1);
  t.is(processState.exitCode, 1);
  t.deepEqual(messages, [
    'Could not start the docs build: pnpm is unavailable',
  ]);
});
