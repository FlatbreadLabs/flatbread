#!/usr/bin/env node
import { resolve } from 'path';
import { existsSync } from 'fs';

if (process.env.FLATBREAD_CI) {
  const cliPath = resolve(
    process.cwd(),
    'node_modules',
    '@flatbread',
    'proof',
    'dist',
    'run_dag_supervisor.js'
  );

  if (existsSync(cliPath)) {
    import('../dist/run_dag_supervisor.js');
  } else {
    console.log('@flatbread/proof supervisor CLI is not available');
  }
} else {
  import('../dist/run_dag_supervisor.js');
}
