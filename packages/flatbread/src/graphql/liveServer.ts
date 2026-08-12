import { generateTypes } from '@flatbread/codegen';
import type {
  ConfigResult,
  LoadedFlatbreadConfig,
  LiveSchemaReloader,
  SchemaSnapshot,
} from '@flatbread/core';
import {
  createLiveSchemaReloader,
  createWatchCoordinator,
  type WatchCoordinator,
} from '@flatbread/core';
import type { EffortGraphLiveBridge } from '@flatbread/effort-graph';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache';
import cors from 'cors';
import express, { type RequestHandler } from 'express';
import http from 'http';
import { loadFlatbreadConfig } from '../utils/getSchema';
import { createEffortGraphComposition } from './proofComposition';
import { mountExplorer } from './explorerMount';
import { buildWatchIgnore } from './watchIgnore';

/** Event shape consumed from `@parcel/watcher` (and test stubs). */
export interface WatchSubscribeEvent {
  path: string;
  type: 'create' | 'update' | 'delete';
}

/**
 * Narrow subscribe signature used by watch mode.
 * Matches `@parcel/watcher`'s subscribe for the options we pass.
 */
export type WatchSubscribe = (
  dir: string,
  callback: (error: Error | null, events: WatchSubscribeEvent[]) => unknown,
  opts?: { ignore?: string[] }
) => Promise<{ unsubscribe(): Promise<void> }>;

export interface GraphqlServerOptions {
  port?: number;
  config: ConfigResult<LoadedFlatbreadConfig>;
  watch?: boolean;
  cwd?: string;
  /**
   * Extra glob patterns to drop from the `--watch` subscription, on top of
   * {@link DEFAULT_WATCH_IGNORE}. Tests use this to keep concurrent fixture
   * directories out of the watched tree; production passes nothing.
   */
  watchIgnore?: readonly string[];
  /** Test seam: overrides the `@parcel/watcher` subscribe implementation. */
  watcherSubscribe?: WatchSubscribe;
  /**
   * Backoff delays (ms) between subscribe retries after a transient
   * ENOENT / inotify race. Defaults to 100, 200, 400, 800 (five attempts).
   * Tests pass zeros to keep the suite fast.
   */
  watcherSubscribeRetryDelays?: readonly number[];
}
export interface RunningGraphqlServer {
  readonly port: number;
  readonly reloader: LiveSchemaReloader;
  readonly effortGraph?: EffortGraphLiveBridge;
  /**
   * Whether the explorer SPA currently answers `/`.
   * May change under `--watch` when config reload adds or removes a matching
   * explorer preset (same mutable-gate pattern as Apollo's generation swap).
   */
  readonly explorer: boolean;
  close(): Promise<void>;
}

export async function startGraphqlServer(
  options: GraphqlServerOptions
): Promise<RunningGraphqlServer> {
  const cwd = options.cwd ?? process.cwd();
  if (!options.config.config) throw new Error('Config is not defined');
  const config = options.config.config;
  const composition = createEffortGraphComposition(config.content, { cwd });
  if (composition && !config.source.fetchPaths) {
    throw new Error(
      'Flatbread effort-graph mode requires the configured source to implement fetchPaths(paths).'
    );
  }
  if (options.watch && !config.source.fetchPaths) {
    throw new Error(
      'Flatbread watch mode requires the configured source to implement fetchPaths(paths).'
    );
  }
  if (options.watch && cwd !== process.cwd()) {
    throw new Error(
      `Flatbread watch mode requires cwd to equal process.cwd() (${process.cwd()}).`
    );
  }
  const app = express();
  const httpServer = http.createServer(app);
  let current: GenerationServer | undefined;
  let currentMiddleware: RequestHandler = (_req, _res, next) => next();
  let closed = false;
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Private-Network', 'true');
    const origin = req.headers.origin || req.headers.referer || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, apollo-require-preflight'
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.status(204).send();
      return;
    }
    next();
  });
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'apollo-require-preflight',
      ],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    }),
    express.json()
  );
  const reloader = await createLiveSchemaReloader({
    config,
    barrier: composition?.barrier,
    commitSchema: async (candidate) => {
      const next = await startGeneration(candidate.schema);
      const old = current;
      current = next;
      currentMiddleware = next.middleware;
      if (old) old.stopWhenDrained();
    },
  });
  // Explorer SPA first so `/` is the visualizer when a preset matches. Middleware
  // is registered once; the gate toggles when replaceConfig commits (watch
  // applyConfig and any direct reload). Inactive → `next()` for `/events` /
  // `/graphql`.
  const explorerHandle = mountExplorer(app, config.content);
  const replaceConfig = reloader.replaceConfig.bind(reloader);
  reloader.replaceConfig = async (nextConfig) => {
    const result = await replaceConfig(nextConfig);
    if (result.status === 'committed') {
      explorerHandle.update(nextConfig.content);
    }
    return result;
  };

  app.get('/events', (req, res) => {
    res.status(200).set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable proxy buffering (e.g. nginx) so events flush immediately.
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    let disconnected = false;
    let lastSeen = reloader.generation;
    res.write(
      `event: ready\ndata: ${JSON.stringify({ generation: lastSeen })}\n\n`
    );

    const keepalive = setInterval(() => {
      if (disconnected) return;
      try {
        res.write(`: keepalive\n\n`);
      } catch {
        // Peer went away between checks; the close handler will finalize.
      }
    }, 20_000);
    if (typeof keepalive.unref === 'function') keepalive.unref();

    let unsubscribe = () => {};
    const cleanup = () => {
      if (disconnected) return;
      disconnected = true;
      clearInterval(keepalive);
      unsubscribe();
      try {
        res.end();
      } catch {
        // Ignore: connection already torn down.
      }
    };

    unsubscribe = reloader.subscribe((snapshot) => {
      if (disconnected || snapshot.generation <= lastSeen) return;
      lastSeen = snapshot.generation;
      try {
        res.write(
          `event: generation\ndata: ${JSON.stringify({
            generation: lastSeen,
          })}\n\n`
        );
      } catch {
        cleanup();
      }
    });

    req.on('close', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);
  });
  app.use((req, res, next) => currentMiddleware(req, res, next));
  const effortGraph = await composition?.attach(reloader);
  if (effortGraph) {
    try {
      await effortGraph.writer.recover();
    } catch (error) {
      console.error('Flatbread effort-graph recovery failed:', error);
    }
  }
  await new Promise<void>((listenResolve) =>
    httpServer.listen({ port: options.port ?? 5050 }, listenResolve)
  );
  const address = httpServer.address();
  const port =
    typeof address === 'object' && address
      ? address.port
      : options.port ?? 5050;
  let subscription: { unsubscribe(): Promise<void> } | undefined;
  let coordinator: WatchCoordinator | undefined;
  if (options.watch) {
    const subscribe: WatchSubscribe =
      options.watcherSubscribe ?? (await import('@parcel/watcher')).subscribe;
    coordinator = createWatchCoordinator({
      config,
      cwd,
      documentPatterns: (cfg) => cfg.codegen?.documents ?? [],
      loadConfig: async () => (await loadFlatbreadConfig(cwd)).config!,
      applyConfig: async (cfg) => reloader.replaceConfig(cfg),
      reindexContent: async (changes) =>
        reloader.notifyChanged({
          paths: changes.map(({ path }) => path),
          source: 'watcher',
        }),
      refreshCodegen: async ({ config: loadedConfig }) => {
        const cfg = loadedConfig.codegen;
        if (!cfg) return;
        const result = await generateTypes(
          reloader.getSnapshot().schema,
          loadedConfig,
          {
            ...cfg,
            enabled: cfg.enabled ?? true,
            documents: cfg.documents ?? [],
          }
        );
        if (!result.success) {
          throw new Error(result.error ?? 'Codegen refresh failed');
        }
      },
    });
    coordinator.subscribe((result) => {
      if (result.status !== 'rejected') return;
      const label =
        result.kind === 'config'
          ? 'config reload'
          : result.kind === 'content'
          ? 'content reindex'
          : 'codegen refresh';
      console.error(`Flatbread ${label} failed:`, result.error);
    });
    const ignore = buildWatchIgnore(options.watchIgnore);
    const retryDelays = options.watcherSubscribeRetryDelays ?? [
      100, 200, 400, 800,
    ];
    const maxAttempts = retryDelays.length + 1;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        subscription = await subscribe(
          cwd,
          (error, events) => {
            if (error) {
              // Watcher noise must not reject the owning server promise.
              console.error('Flatbread watcher error:', error);
              return;
            }
            try {
              coordinator!.push(
                events.map((event) => ({
                  path: event.path,
                  type: event.type,
                }))
              );
            } catch (pushError) {
              console.error('Flatbread watcher push failed:', pushError);
            }
          },
          { ignore }
        );
        break;
      } catch (error: unknown) {
        const isTransientWatchError =
          error instanceof Error &&
          ((error as NodeJS.ErrnoException).code === 'ENOENT' ||
            error.message.includes('No such file or directory') ||
            error.message.includes('inotify_add_watch'));
        if (!isTransientWatchError || attempt === maxAttempts - 1) {
          throw error;
        }
        await new Promise<void>((resolve) =>
          setTimeout(resolve, retryDelays[attempt]!)
        );
      }
    }
  }
  return {
    port,
    reloader,
    effortGraph,
    get explorer() {
      return explorerHandle.isActive();
    },
    async close() {
      if (closed) return;
      closed = true;
      await coordinator?.dispose();
      // @parcel/watcher can throw EINVAL ("Unable to remove watcher") on Node
      // 22 when the native handle is already gone during teardown.
      try {
        await subscription?.unsubscribe();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('Unable to remove watcher')) throw error;
      }
      await current?.stop();
      await new Promise<void>((closeResolve) => {
        if (httpServer.listening) httpServer.close(() => closeResolve());
        else closeResolve();
      });
    },
  };
}

interface GenerationServer {
  middleware: RequestHandler;
  stopWhenDrained(): void;
  stop(): Promise<void>;
}
async function startGeneration(
  schema: SchemaSnapshot['schema']
): Promise<GenerationServer> {
  const server = new ApolloServer({
    schema,
    cache: new InMemoryLRUCache({ maxSize: Math.pow(2, 20) * 100 }),
  });
  await server.start();
  let inFlight = 0;
  let stopping = false;
  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    await server.stop();
  };
  const stopWhenDrained = () => {
    stopping = true;
    if (inFlight === 0) void stop();
  };
  const middleware = expressMiddleware(server);
  const wrapped: RequestHandler = (req, res, next) => {
    inFlight++;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      inFlight--;
      if (stopping && inFlight === 0) void stop();
    };
    res.once('finish', finish);
    res.once('close', finish);
    return middleware(req, res, next);
  };
  return { middleware: wrapped, stopWhenDrained, stop };
}
