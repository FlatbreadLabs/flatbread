#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const result = spawnSync('pnpm', ['--filter', '@flatbread/docs', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, NEXT_PUBLIC_BASE_PATH: '/flatbread' },
});

if (result.error) {
  console.error(
    `Could not start the docs base-path build: ${result.error.message}`
  );
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
