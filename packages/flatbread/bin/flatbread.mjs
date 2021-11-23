#!/usr/bin/env node
import { resolve } from 'path';
import { existsSync } from 'fs';

// In CI/CD, check if the file exists before importing it. This is to prevent some environments from throwing an error before the library is built.
if (process.env.FLATBREAD_CI) {
  const cliPath = resolve(
    process.cwd(),
    'node_modules',
    'flatbread',
    'dist',
    'cli',
    'index.mjs'
  );

  if (existsSync(cliPath)) {
    import('../dist/cli/index.mjs');
  } else {
    console.log("Flatbread's CLI is not available");
  }
} else {
  import('../dist/cli/index.mjs');
}
