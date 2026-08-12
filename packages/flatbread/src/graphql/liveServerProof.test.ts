import test from 'ava';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import { join, relative } from 'node:path';
import filesystem from '@flatbread/source-filesystem';
import markdownTransformer from '@flatbread/transformer-markdown';
import { initializeConfig } from '@flatbread/core';
import { effortGraphContent } from '@flatbread/effort-graph';
import {
  explorerAssetsPresent,
  setExplorerStaticDirOverride,
} from '@flatbread/explorer';
import type { ConfigResult, LoadedFlatbreadConfig } from '@flatbread/core';
import type { EffortGraphMutation } from '@flatbread/effort-graph';
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
  const response = await fetch(`http://localhost:${port}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: source }),
  });
  return (await response.json()) as {
    data?: Record<string, unknown>;
    errors?: Array<{ message: string }>;
  };
}

/** Same SSE reader pattern as liveServerEvents.test.ts. */
interface SseEvent {
  event: string;
  data: string;
}
function createSseReader(
  body: ReadableStream<Uint8Array>,
  timeoutMs = 5_000
): {
  next(predicate: (event: SseEvent) => boolean): Promise<SseEvent>;
  close(): Promise<void>;
} {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const events: SseEvent[] = [];
  const waiters: Array<{
    predicate: (event: SseEvent) => boolean;
    resolve: (event: SseEvent) => void;
    reject: (reason: Error) => void;
    timer: NodeJS.Timeout;
  }> = [];
  let buffer = '';
  let finished = false;

  const dispatch = (event: SseEvent) => {
    for (let i = 0; i < waiters.length; i++) {
      if (waiters[i].predicate(event)) {
        const waiter = waiters.splice(i, 1)[0];
        clearTimeout(waiter.timer);
        waiter.resolve(event);
        return;
      }
    }
    events.push(event);
  };

  const flushBuffer = () => {
    let index: number;
    while ((index = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      if (!block.length || block.startsWith(':')) continue;
      const parsed: SseEvent = { event: 'message', data: '' };
      const dataLines: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) parsed.event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      parsed.data = dataLines.join('\n');
      dispatch(parsed);
    }
  };

  const pump = async () => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        flushBuffer();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      for (const waiter of waiters.splice(0)) {
        clearTimeout(waiter.timer);
        waiter.reject(err);
      }
    } finally {
      finished = true;
      for (const waiter of waiters.splice(0)) {
        clearTimeout(waiter.timer);
        waiter.reject(new Error('SSE stream closed before match'));
      }
    }
  };
  void pump();

  return {
    next(predicate) {
      const buffered = events.findIndex(predicate);
      if (buffered !== -1)
        return Promise.resolve(events.splice(buffered, 1)[0]);
      if (finished)
        return Promise.reject(new Error('SSE stream already closed'));
      return new Promise<SseEvent>((resolve, reject) => {
        const timer = setTimeout(() => {
          const index = waiters.findIndex((w) => w.timer === timer);
          if (index !== -1) waiters.splice(index, 1);
          reject(new Error('Timed out waiting for SSE event'));
        }, timeoutMs);
        if (typeof timer.unref === 'function') timer.unref();
        waiters.push({ predicate, resolve, reject, timer });
      });
    },
    async close() {
      try {
        await reader.cancel();
      } catch {
        // Ignore: server may have already ended the response.
      }
    },
  };
}

test.serial(
  'active preset exposes the bridge and a mutation is strictly readable end-to-end',
  async (t) => {
    setExplorerStaticDirOverride(undefined);
    if (!explorerAssetsPresent()) {
      t.fail(
        'Explorer assets missing. Build @flatbread/explorer first (`pnpm --filter @flatbread/explorer build`).'
      );
      return;
    }

    const fixture = await makeDir();
    t.teardown(() => rm(fixture.dir, { recursive: true, force: true }));
    const server = await startGraphqlServer({
      config: config(fixture.relativeRoot, true),
      port: 0,
    });
    t.teardown(() => server.close());
    t.truthy(server.effortGraph);
    t.true(server.explorer);
    const home = await fetch(`http://localhost:${server.port}/`);
    t.is(home.status, 200);
    t.true((await home.text()).includes('__FLATBREAD_EXPLORER__'));
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
  'explorer mount leaves /events SSE working when assets exist',
  async (t) => {
    setExplorerStaticDirOverride(undefined);
    if (!explorerAssetsPresent()) {
      t.fail(
        'Explorer assets missing. Build @flatbread/explorer first (`pnpm --filter @flatbread/explorer build`).'
      );
      return;
    }

    const fixture = await makeDir();
    t.teardown(() => rm(fixture.dir, { recursive: true, force: true }));
    const server = await startGraphqlServer({
      config: config(fixture.relativeRoot, true),
      port: 0,
    });
    t.teardown(() => server.close());

    t.true(server.explorer);

    const response = await fetch(`http://localhost:${server.port}/events`, {
      headers: { accept: 'text/event-stream' },
    });
    t.is(response.status, 200);
    t.regex(response.headers.get('content-type') ?? '', /text\/event-stream/i);

    const stream = createSseReader(response.body!);
    const ready = await stream.next((event) => event.event === 'ready');
    t.deepEqual(JSON.parse(ready.data), {
      generation: server.reloader.generation,
    });
    await stream.close();
  }
);

test.serial(
  'missing explorer assets soft-fails with explorer false but GraphQL still works',
  async (t) => {
    const emptyDir = await mkdtemp(
      join(os.tmpdir(), 'flatbread-explorer-live-')
    );
    setExplorerStaticDirOverride(emptyDir);
    t.teardown(async () => {
      setExplorerStaticDirOverride(undefined);
      await rm(emptyDir, { recursive: true, force: true });
    });

    const fixture = await makeDir();
    t.teardown(() => rm(fixture.dir, { recursive: true, force: true }));
    const server = await startGraphqlServer({
      config: config(fixture.relativeRoot, true),
      port: 0,
    });
    t.teardown(() => server.close());

    t.false(server.explorer);
    t.truthy(server.effortGraph);

    const home = await fetch(`http://localhost:${server.port}/`);
    t.not(home.headers.get('content-type') ?? '', 'text/html');
    t.false((await home.text()).includes('__FLATBREAD_EXPLORER__'));

    const created = await server.effortGraph!.writer.mutate({
      type: 'CreateEffort',
      title: 'GraphQL without explorer assets',
      body: '',
    });
    await server.effortGraph!.waitForCommittedGeneration(created.generation);
    const response = await query(server.port, '{ allEfforts { title } }');
    t.deepEqual(response.errors, undefined);
    t.deepEqual(response.data?.allEfforts, [
      { title: 'GraphQL without explorer assets' },
    ]);
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
    t.false(server.explorer);
    const home = await fetch(`http://localhost:${server.port}/`);
    // Without an explorer preset, Apollo still owns `/` (catch-all mount).
    t.not(home.headers.get('content-type') ?? '', 'text/html');
    t.false((await home.text()).includes('__FLATBREAD_EXPLORER__'));
  }
);

test.serial(
  'Citation and Blob mutations are queryable through the live GraphQL bridge',
  async (t) => {
    const fixture = await makeDir();
    t.teardown(() => rm(fixture.dir, { recursive: true, force: true }));
    const server = await startGraphqlServer({
      config: config(fixture.relativeRoot, true),
      port: 0,
    });
    t.teardown(() => server.close());
    await t.throwsAsync(
      server.effortGraph!.writer.mutate({
        type: 'CreateEffort',
        title: 'Invalid',
        body: '',
        cites: ['cit-paper--0123456789abcdef'],
      } as unknown as EffortGraphMutation),
      { message: /CreateEffort does not accept cites/ }
    );
    const effort = await server.effortGraph!.writer.mutate({
      type: 'CreateEffort',
      title: 'GraphQL cite chain',
      body: '',
    });
    const effortId = effort.artifacts[0].id;
    const otherEffort = await server.effortGraph!.writer.mutate({
      type: 'CreateEffort',
      title: 'Other chain',
      body: '',
    });
    const otherEffortId = otherEffort.artifacts[0].id;
    const blob = await server.effortGraph!.writer.mutate({
      type: 'WriteBlob',
      effort: effortId,
      title: 'Payload',
      body: '# longform research\n',
      kind: 'markdown',
    });
    const blobId = blob.artifacts[0].id;
    const citation = await server.effortGraph!.writer.mutate({
      type: 'WriteCitation',
      effort: effortId,
      title: 'Paper',
      body: 'https://example.com/paper',
      role: 'evidence',
      blob: blobId,
    });
    await server.effortGraph!.waitForCommittedGeneration(citation.generation);
    const response = await query(
      server.port,
      `{ allCitations { title blob { id title } } allBlobs { id title } }`
    );
    t.deepEqual(response.errors, undefined);
    t.deepEqual(response.data?.allCitations, [
      { title: 'Paper', blob: { id: blobId, title: 'Payload' } },
    ]);
    t.deepEqual(response.data?.allBlobs, [{ id: blobId, title: 'Payload' }]);
    const foreignBlob = await server.effortGraph!.writer.mutate({
      type: 'WriteBlob',
      effort: otherEffortId,
      title: 'Foreign payload',
      body: '',
    });
    await t.throwsAsync(
      server.effortGraph!.writer.mutate({
        type: 'WriteCitation',
        effort: effortId,
        title: 'Bad source',
        body: 'https://example.com/bad-source',
        blob: foreignBlob.artifacts[0].id,
      }),
      {
        message: new RegExp(
          `Citation\\.blob ${foreignBlob.artifacts[0].id} belongs to a different effort`
        ),
      }
    );
    const foreignCitation = await server.effortGraph!.writer.mutate({
      type: 'WriteCitation',
      effort: otherEffortId,
      title: 'Foreign paper',
      body: 'https://example.com/foreign-paper',
    });
    await t.throwsAsync(
      server.effortGraph!.writer.mutate({
        type: 'WriteFinding',
        effort: effortId,
        title: 'Bad cite',
        body: '',
        kind: 'measurement',
        cites: [foreignCitation.artifacts[0].id],
      }),
      {
        message: new RegExp(
          `cites target ${foreignCitation.artifacts[0].id} belongs to a different effort`
        ),
      }
    );
    const finding = await server.effortGraph!.writer.mutate({
      type: 'WriteFinding',
      effort: effortId,
      title: 'Measured',
      body: 'short',
      kind: 'measurement',
      cites: [citation.artifacts[0].id],
    });
    await server.effortGraph!.waitForCommittedGeneration(finding.generation);
    const findingResponse = await query(
      server.port,
      `{ allFindings { title cites { id } } }`
    );
    t.deepEqual(findingResponse.errors, undefined);
    t.deepEqual(findingResponse.data?.allFindings, [
      { title: 'Measured', cites: [{ id: citation.artifacts[0].id }] },
    ]);
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
