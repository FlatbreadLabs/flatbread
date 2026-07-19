import test from 'ava';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import filesystem from '@flatbread/source-filesystem';
import markdownTransformer from '@flatbread/transformer-markdown';
import { initializeConfig } from '@flatbread/core';
import { effortGraphContent } from '@flatbread/effort-graph';
import type { ConfigResult, LoadedFlatbreadConfig } from '@flatbread/core';
import { startGraphqlServer } from './liveServer.js';

async function makeDir() {
  const dir = await mkdtemp(join(process.cwd(), '.tmp-effort-live-'));
  const root = join(dir, 'graph');
  for (const path of [
    'efforts',
    'issues',
    'findings',
    'decisions',
    'constraints',
    'risks',
    'citations',
    'blobs',
  ])
    await mkdir(join(root, path), { recursive: true });
  await mkdir(join(root, 'plain'), { recursive: true });
  return { dir, root, relativeRoot: relative(process.cwd(), root) };
}

function config(
  root: string,
  active: boolean
): ConfigResult<LoadedFlatbreadConfig> {
  return {
    config: initializeConfig({
      source: filesystem(),
      transformer: markdownTransformer(),
      content: active
        ? effortGraphContent(root)
        : [{ collection: 'Plain', path: `${root}/plain` }],
    }),
  };
}

async function query(port: number, source: string) {
  const response = await fetch(`http://localhost:${port}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: source }),
  });
  return (await response.json()) as {
    data?: Record<string, unknown>;
    errors?: Array<{ message: string }>;
  };
}

test.serial(
  'active preset exposes the bridge and a mutation is strictly readable end-to-end',
  async (t) => {
    const fixture = await makeDir();
    t.teardown(() => rm(fixture.dir, { recursive: true, force: true }));
    const server = await startGraphqlServer({
      config: config(fixture.relativeRoot, true),
      port: 0,
    });
    t.teardown(() => server.close());
    t.truthy(server.effortGraph);
    const result = await server.effortGraph!.writer.mutate({
      type: 'CreateEffort',
      title: 'Committed effort',
      body: '',
    });
    await server.effortGraph!.waitForCommittedGeneration(result.generation);
    const response = await query(server.port, '{ allEfforts { title } }');
    t.deepEqual(response.errors, undefined);
    t.deepEqual(response.data?.allEfforts, [{ title: 'Committed effort' }]);
  }
);

test.serial(
  'inactive config exposes no effortGraph and behaves as before',
  async (t) => {
    const fixture = await makeDir();
    t.teardown(() => rm(fixture.dir, { recursive: true, force: true }));
    const server = await startGraphqlServer({
      config: config(fixture.relativeRoot, false),
      port: 0,
    });
    t.teardown(() => server.close());
    t.is(server.effortGraph, undefined);
  }
);

test.serial(
  'boot recovery completes a committed-unpublished transaction before listen',
  async (t) => {
    const fixture = await makeDir();
    t.teardown(() => rm(fixture.dir, { recursive: true, force: true }));
    const body = Buffer.from(
      '---\nid: boot-effort\nstatus: active\n---\n\nBoot\n'
    );
    const path = join(fixture.root, 'efforts', 'boot-effort.md');
    await writeFile(path, body);
    const txn = join(fixture.root, '.journal', 'txns', 'boot');
    await mkdir(txn, { recursive: true });
    await writeFile(
      join(txn, 'intent.json'),
      JSON.stringify({
        transactionId: 'boot',
        targetGeneration: 7,
        writes: [
          {
            relativePath: 'efforts/boot-effort.md',
            before: { exists: false },
            after: {
              sha256: createHash('sha256').update(body).digest('hex'),
              base64: body.toString('base64'),
            },
          },
        ],
        touchedIds: ['boot-effort'],
      })
    );
    await writeFile(join(txn, 'committed'), '');
    const server = await startGraphqlServer({
      config: config(fixture.relativeRoot, true),
      port: 0,
    });
    t.teardown(() => server.close());
    t.is(
      JSON.parse(
        await readFile(
          join(fixture.root, '.journal', 'generation.json'),
          'utf8'
        )
      ).generation,
      7
    );
    const snapshot = await server.effortGraph!.waitForCommittedGeneration('7');
    t.is(snapshot.generation, 1);
  }
);
