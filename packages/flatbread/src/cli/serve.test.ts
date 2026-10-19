import test from 'ava';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  lstat,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:http';
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

    // A record changed outside the writer, as a pull or checkout does, also
    // reaches the next served read, though the journal generation stays put.
    const copied = join(cwd, '.flatbread-proof', 'findings', 'pulled.md');
    const [firstFinding] = (
      await readdir(join(cwd, '.flatbread-proof', 'findings'))
    ).sort();
    const text = await readFile(
      join(cwd, '.flatbread-proof', 'findings', firstFinding),
      'utf8'
    );
    const pulledId = 'fnd-pulled-from-a-teammate--0123456789abcdef';
    await writeFile(
      copied,
      text
        .replace(/^id: .*$/m, `id: ${pulledId}`)
        .replace(/^title: .*$/m, 'title: Pulled')
    );
    const pulled = await runCli(cwd, served, 'proof', 'records', effortId);
    t.regex(JSON.parse(pulled.stdout).summary, /^3 records/);

    // Errors keep the CLI's JSON shape and exit code.
    const bad = await runCli(cwd, served, 'proof', 'records');
    t.is(bad.code, 1);
    t.is(JSON.parse(bad.stderr).error.code, 'PROOF_INVALID_ARGUMENT');
    const badLimit = await runCli(cwd, served, 'proof', 'list', '--limit', '0');
    t.is(badLimit.code, 1);
    t.is(JSON.parse(badLimit.stderr).error.code, 'PROOF_INVALID_ARGUMENT');

    // A second server cannot take the socket from a live one.
    await t.throwsAsync(serveProofReads(socket), {
      message: /already answers on/,
    });

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
  'proof find returns the chain head card locally and through proof serve',
  async (t) => {
    // Each local run loads the graph from scratch, and this test makes many.
    t.timeout(180_000);
    const cwd = await createProject(t);
    const write = async (input: Record<string, unknown>) =>
      (await handleEffortWrite(JSON.stringify(input), { cwd })).artifacts[0].id;
    const effortId = await write({
      type: 'CreateEffort',
      title: 'Renderer',
      body: '',
    });
    await write({
      type: 'WriteFinding',
      effort: effortId,
      title: 'Build times',
      body: 'The nightly build takes ten minutes.',
      kind: 'measurement',
    });
    const first = await write({
      type: 'WriteDecision',
      effort: effortId,
      title: 'Clamp the quokka history buffer',
      body: 'Clamp history to the neighborhood to stop ghosting.',
    });
    const head = await write({
      type: 'WriteDecision',
      effort: effortId,
      title: 'Clamp history only outside caustics',
      body: 'Caustic light skips the clamp; everything else keeps it.',
      supersedes: [first],
    });
    const socket = join(cwd, '.flatbread/proof/serve.sock');
    const server = await serveProofReads(socket);
    t.teardown(() => new Promise((done) => server.close(() => done())));
    const served = { FLATBREAD_PROOF_SERVER: socket };

    for (const scope of [['--effort', effortId], ['--all']]) {
      const args = ['proof', 'find', 'quokka history', ...scope];
      const local = await runCli(cwd, {}, ...args);
      t.is(local.code, 0, local.stderr);
      const remote = await runCli(cwd, served, ...args);
      t.is(remote.code, 0, remote.stderr);
      t.deepEqual(JSON.parse(remote.stdout), JSON.parse(local.stdout));
      const envelope = JSON.parse(local.stdout);
      // One hit for the whole chain: the head, which says the old version matched.
      t.deepEqual(
        envelope.find.hits.map((hit: { id: string }) => hit.id),
        [head]
      );
      t.is(envelope.find.hits[0].matched_id, first);
      t.deepEqual(envelope.find.terms, {
        matched: ['quokka', 'history'],
        missing: [],
      });
      t.regex(
        envelope.cards,
        new RegExp(`1\\. ${head} \\| decision \\| proposed \\(head\\)`)
      );
      t.regex(envelope.cards, new RegExp(`matched: v1 ${first}`));
      t.deepEqual(envelope.hints, [`getRecord("${head}")`]);
      t.regex(await readFile(envelope.artifact_path, 'utf8'), /## Find hits\n/);
    }
    for (const env of [{}, served] as Record<string, string>[]) {
      // An unquoted query searches every word, locally and served alike.
      const unquoted = await runCli(
        cwd,
        env,
        'proof',
        'find',
        'quokka',
        'nightly',
        '--effort',
        effortId
      );
      t.is(unquoted.code, 0, unquoted.stderr);
      const envelope = JSON.parse(unquoted.stdout);
      t.is(envelope.find.query, 'quokka nightly');
      t.deepEqual(envelope.find.terms.missing, []);
      t.is(envelope.find.shown, 2);
      t.true(envelope.complete);
      // More matches than shown: the envelope says it is not complete.
      const capped = JSON.parse(
        (
          await runCli(
            cwd,
            env,
            'proof',
            'find',
            'quokka nightly',
            '--limit',
            '1'
          )
        ).stdout
      );
      t.false(capped.complete);
      t.deepEqual(capped.cap_reasons, ['find_limit']);
      t.false(capped.page.has_more);
      // A bare year and a date-time with no offset are refused both ways.
      for (const asOf of ['2026', '2026-03-01T00:00:00']) {
        const bad = await runCli(
          cwd,
          env,
          'proof',
          'find',
          'x',
          '--as-of',
          asOf
        );
        t.is(bad.code, 1, asOf);
        t.is(JSON.parse(bad.stderr).error.code, 'PROOF_INVALID_ARGUMENT');
      }
      const bad = await runCli(cwd, env, 'proof', 'find', 'x', '--limit', '11');
      t.is(bad.code, 1);
      t.is(JSON.parse(bad.stderr).error.code, 'PROOF_INVALID_ARGUMENT');
    }
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

test.serial(
  'a second server does not take the socket from a busy one',
  async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'flatbread-busy-'));
    t.teardown(() => rm(dir, { recursive: true, force: true }));
    const socket = join(dir, 'serve.sock');
    // A server that accepts connections but never replies, like one
    // blocked while it builds a large graph.
    const busy = createServer(() => undefined);
    const held = new Set<import('node:net').Socket>();
    busy.on('connection', (connection) => held.add(connection));
    await new Promise<void>((done) => busy.listen(socket, done));
    t.teardown(() => {
      for (const connection of held) connection.destroy();
      busy.close();
    });
    await t.throwsAsync(serveProofReads(socket), {
      message: /already answers on/,
    });
  }
);
