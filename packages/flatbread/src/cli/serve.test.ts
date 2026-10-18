import test from 'ava';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  lstat,
  mkdtemp,
  rm,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { handleEffortWrite } from './proof.js';
import { runRead, serveProofReads } from './serve.js';

const repositoryNodeModules = fileURLToPath(
  new URL('../../../../node_modules/', import.meta.url)
);

async function createProject(t: {
  teardown(callback: () => void | Promise<void>): void;
}): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), 'flatbread-serve-'));
  const nodeModules = join(cwd, 'node_modules');
  await symlink(repositoryNodeModules, nodeModules, 'junction');
  t.teardown(async () => {
    if ((await lstat(nodeModules).catch(() => null))?.isSymbolicLink())
      await unlink(nodeModules);
    await rm(cwd, { recursive: true, force: true });
  });
  await writeFile(
    join(cwd, 'flatbread.config.js'),
    `import { source } from '@flatbread/source-filesystem';
import { transformer } from '@flatbread/transformer-markdown';
import { proofContent } from '@flatbread/proof';
export default {
  source: source(),
  transformer: transformer(),
  content: proofContent('.flatbread-proof'),
};`
  );
  return cwd;
}

function runCli(
  cwd: string,
  env: Record<string, string>,
  ...args: string[]
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--no-deprecation',
        fileURLToPath(new URL('../../bin/flatbread.js', import.meta.url)),
        ...args,
      ],
      { cwd, env: { ...process.env, ...env } }
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

test.serial(
  'proof serve answers reads like the CLI, keeps writes local, and sees new writes',
  async (t) => {
    const cwd = await createProject(t);
    const effort = await handleEffortWrite(
      JSON.stringify({ type: 'CreateEffort', title: 'E', body: '' }),
      { cwd }
    );
    const effortId = effort.artifacts[0].id;
    await handleEffortWrite(
      JSON.stringify({
        type: 'WriteFinding',
        effort: effortId,
        title: 'First',
        body: 'one',
        kind: 'measurement',
      }),
      { cwd }
    );
    const socket = join(cwd, '.flatbread/proof/serve.sock');
    const server = await serveProofReads(socket);
    t.teardown(() => new Promise((done) => server.close(() => done())));
    const served = { FLATBREAD_PROOF_SERVER: socket };

    // A served read prints what a local read prints.
    const local = await runCli(cwd, {}, 'proof', 'records', effortId);
    const remote = await runCli(cwd, served, 'proof', 'records', effortId);
    t.is(remote.code, 0);
    t.deepEqual(JSON.parse(remote.stdout), JSON.parse(local.stdout));
    t.regex(JSON.parse(remote.stdout).summary, /^1 record/);

    // Writes never go to the server, and the next served read sees them.
    const write = await runCli(
      cwd,
      served,
      'proof',
      'write',
      JSON.stringify({
        type: 'WriteFinding',
        effort: effortId,
        title: 'Second',
        body: 'two',
        kind: 'measurement',
      })
    );
    t.is(write.code, 0, write.stderr);
    const after = await runCli(cwd, served, 'proof', 'records', effortId);
    t.regex(JSON.parse(after.stdout).summary, /^2 records/);

    // Errors keep the CLI's JSON shape and exit code.
    const bad = await runCli(cwd, served, 'proof', 'records');
    t.is(bad.code, 1);
    t.is(JSON.parse(bad.stderr).error.code, 'PROOF_INVALID_ARGUMENT');
    const badLimit = await runCli(cwd, served, 'proof', 'list', '--limit', '0');
    t.is(badLimit.code, 1);
    t.is(JSON.parse(badLimit.stderr).error.code, 'PROOF_INVALID_ARGUMENT');

    // The server itself refuses anything but a read.
    const refused = await runRead(['write', '{}'], cwd);
    t.is(refused.code, 1);
    t.is(
      JSON.parse(refused.stderr).error.message,
      'The read server does not serve "proof write"'
    );
  }
);

test.serial(
  'reads fall back to the local CLI when the server is unreachable',
  async (t) => {
    const cwd = await createProject(t);
    const effort = await handleEffortWrite(
      JSON.stringify({ type: 'CreateEffort', title: 'E', body: '' }),
      { cwd }
    );
    const result = await runCli(
      cwd,
      { FLATBREAD_PROOF_SERVER: join(cwd, 'missing.sock') },
      'proof',
      'records',
      effort.artifacts[0].id
    );
    t.is(result.code, 0, result.stderr);
    t.regex(JSON.parse(result.stdout).summary, /^0 records/);
  }
);
