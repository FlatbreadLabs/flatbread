#!/usr/bin/env node
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const cliPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../dist/cli/index.js'
);

// In CI, skip the import when dist is not built yet so the process
// does not throw before `pnpm build`. Check the file next to this
// bin, not `cwd/node_modules/flatbread`, because spawned tests and
// user projects run with a different working directory.
if (process.env.FLATBREAD_CI) {
  if (existsSync(cliPath)) {
    import('../dist/cli/index.js');
  } else {
    console.log("Flatbread's CLI is not available");
  }
} else {
  import('../dist/cli/index.js');
}
