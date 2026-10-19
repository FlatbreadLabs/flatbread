#!/usr/bin/env node
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';
import { request } from 'http';
import { fileURLToPath } from 'url';

const cliPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../dist/cli/index.js'
);

function loadCli() {
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
}

// Reads `flatbread proof serve` answers. Keep in step with SERVED_READS in
// src/cli/serve.ts; anything else, writes included, runs locally.
const SERVED_READS = new Set([
  'list',
  'records',
  'get',
  'relations',
  'blocking-decisions',
  'brief',
  'find',
]);

/**
 * With FLATBREAD_PROOF_SERVER set to a `proof serve` socket, forward a read
 * there before loading the CLI bundle, so the graph is not rebuilt per call.
 * If the server cannot be reached, run the read locally instead.
 */
function forwardRead(socketPath, argv) {
  const body = JSON.stringify({ argv, cwd: process.cwd() });
  const req = request(
    {
      socketPath,
      path: '/read',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
    },
    (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (text += chunk));
      res.on('end', () => {
        let reply;
        try {
          reply = JSON.parse(text);
        } catch {
          return loadCli();
        }
        process.stdout.write(reply.stdout ?? '');
        process.stderr.write(reply.stderr ?? '');
        process.exitCode = reply.code ?? 1;
      });
    }
  );
  req.on('error', () => loadCli());
  req.end(body);
}

const [, , group, command] = process.argv;
const server = process.env.FLATBREAD_PROOF_SERVER;
if (server && group === 'proof' && SERVED_READS.has(command))
  forwardRead(server, process.argv.slice(3));
else loadCli();
