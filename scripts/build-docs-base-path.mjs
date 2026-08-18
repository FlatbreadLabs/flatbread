#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const DOCS_BASE_PATH = '/flatbread';

function buildDocs({
  basePath,
  spawn = spawnSync,
  platform = process.platform,
  env = process.env,
  reportError = console.error,
} = {}) {
  const childEnv = { ...env };
  if (basePath) {
    childEnv.NEXT_PUBLIC_BASE_PATH = basePath;
  } else {
    delete childEnv.NEXT_PUBLIC_BASE_PATH;
  }

  const result = spawn('pnpm', ['--filter', '@flatbread/docs', 'build'], {
    stdio: 'inherit',
    shell: platform === 'win32',
    env: childEnv,
  });

  if (result.error) {
    reportError(`Could not start the docs build: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

export function buildDocsBasePath(options = {}) {
  return buildDocs({ ...options, basePath: DOCS_BASE_PATH });
}

export function buildDocsRoot(options = {}) {
  return buildDocs({ ...options, basePath: '' });
}

export function runDocsBuild({
  argv = process.argv,
  processState = process,
  ...options
} = {}) {
  const status = argv.includes('--root')
    ? buildDocsRoot(options)
    : buildDocsBasePath(options);
  processState.exitCode = status;
  return status;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runDocsBuild();
}
