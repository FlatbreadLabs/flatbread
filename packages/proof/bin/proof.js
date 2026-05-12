#!/usr/bin/env node
import { resolve } from 'path';
import { existsSync } from 'fs';

const entryFile = process.argv[2] === 'setup' ? 'setup.js' : 'run_dag.js';

if (process.env.FLATBREAD_CI) {
  const cliPath = resolve(
    process.cwd(),
    'node_modules',
    '@flatbread',
    'proof',
    'dist',
    entryFile
  );

  if (existsSync(cliPath)) {
    import(`../dist/${entryFile}`);
  } else {
    console.log('@flatbread/proof CLI is not available');
  }
} else {
  import(`../dist/${entryFile}`);
}
