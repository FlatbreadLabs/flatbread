import test from 'ava';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import filesystem from '@flatbread/source-filesystem';
import markdownTransformer from '@flatbread/transformer-markdown';
import { initializeConfig } from '@flatbread/core';
import type { ConfigResult, LoadedFlatbreadConfig } from '@flatbread/core';
import { startGraphqlServer } from './liveServer';

interface Fixture {
  dir: string;
  postsPath: string;
  postOne: string;
  cleanup: () => Promise<void>;
}

const POST_ONE = (title: string) => `---
id: post-1
title: ${title}
---

Post one body.
`;

async function makeFixture(): Promise<Fixture> {
  const dir = await mkdtemp(join(process.cwd(), '.tmp-live-events-test-'));
  const postsDir = join(dir, 'posts');
  await mkdir(postsDir, { recursive: true });
  const postOne = join(postsDir, 'post-1.md');
  await writeFile(postOne, POST_ONE('Original Title'));
  return {
    dir,
    postsPath: join(relative(process.cwd(), dir), 'posts'),
    postOne,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

function makeConfig(fixture: Fixture): ConfigResult<LoadedFlatbreadConfig> {
  return {
    config: initializeConfig({
      source: filesystem(),
      transformer: markdownTransformer(),
      content: [
        {
          path: fixture.postsPath,
          collection: 'LiveEventsPost',
        },
      ],
    }),
  };
}

/**
 * Parse the raw SSE byte stream into a queue of decoded events, exposing a
 * `next(predicate)` helper that awaits the first matching event (or rejects
 * with a timeout). Keeps the test focused on protocol semantics while staying
 * resilient to arbitrary chunk boundaries and interleaved keepalives.
 */
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
  '/events streams a ready frame with the current generation on connect',
  async (t) => {
    const fixture = await makeFixture();
    t.teardown(fixture.cleanup);

    const server = await startGraphqlServer({
      config: makeConfig(fixture),
      port: 0,
      watch: false,
    });
    t.teardown(() => server.close());

    const response = await fetch(`http://localhost:${server.port}/events`, {
      headers: { accept: 'text/event-stream' },
    });
    t.is(response.status, 200);
    t.regex(response.headers.get('content-type') ?? '', /text\/event-stream/i);
    t.regex(response.headers.get('cache-control') ?? '', /no-cache/i);

    const stream = createSseReader(response.body!);
    const ready = await stream.next((event) => event.event === 'ready');
    t.deepEqual(JSON.parse(ready.data), {
      generation: server.reloader.generation,
    });
    await stream.close();
  }
);

test.serial(
  '/events emits a generation frame when notifyChanged commits a new schema',
  async (t) => {
    const fixture = await makeFixture();
    t.teardown(fixture.cleanup);

    const server = await startGraphqlServer({
      config: makeConfig(fixture),
      port: 0,
      watch: false,
    });
    t.teardown(() => server.close());

    const response = await fetch(`http://localhost:${server.port}/events`, {
      headers: { accept: 'text/event-stream' },
    });
    const stream = createSseReader(response.body!);
    const ready = await stream.next((event) => event.event === 'ready');
    t.deepEqual(JSON.parse(ready.data), { generation: 0 });

    await writeFile(fixture.postOne, POST_ONE('SSE Swapped Title'));
    const result = await server.reloader.notifyChanged({
      paths: [fixture.postOne],
      source: 'watcher',
    });
    t.deepEqual(result, { status: 'committed', generation: 1 });

    const event = await stream.next((e) => e.event === 'generation');
    t.deepEqual(JSON.parse(event.data), { generation: 1 });
    await stream.close();
  }
);

test.serial(
  '/events delivers every generation frame across successive commits',
  async (t) => {
    const fixture = await makeFixture();
    t.teardown(fixture.cleanup);

    const server = await startGraphqlServer({
      config: makeConfig(fixture),
      port: 0,
      watch: false,
    });
    t.teardown(() => server.close());

    const response = await fetch(`http://localhost:${server.port}/events`, {
      headers: { accept: 'text/event-stream' },
    });
    const stream = createSseReader(response.body!);
    await stream.next((event) => event.event === 'ready');

    for (let i = 1; i <= 3; i++) {
      await writeFile(fixture.postOne, POST_ONE(`Iteration ${i}`));
      const result = await server.reloader.notifyChanged({
        paths: [fixture.postOne],
        source: 'watcher',
      });
      t.deepEqual(result, { status: 'committed', generation: i });
      const event = await stream.next(
        (e) => e.event === 'generation' && JSON.parse(e.data).generation === i
      );
      t.deepEqual(JSON.parse(event.data), { generation: i });
    }
    await stream.close();
  }
);
