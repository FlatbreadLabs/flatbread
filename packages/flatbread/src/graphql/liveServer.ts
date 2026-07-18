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
import { createEffortGraphComposition } from './effortGraphComposition';

export interface GraphqlServerOptions {
  port?: number;
  config: ConfigResult<LoadedFlatbreadConfig>;
  watch?: boolean;
  cwd?: string;
}
export interface RunningGraphqlServer {
  readonly port: number;
  readonly reloader: LiveSchemaReloader;
  readonly effortGraph?: EffortGraphLiveBridge;
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
    const { subscribe } = await import('@parcel/watcher');
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
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        subscription = await subscribe(
          cwd,
          (error, events) => {
            if (error) {
              console.error('Flatbread watcher error:', error);
              return;
            }
            coordinator!.push(
              events.map((event) => ({ path: event.path, type: event.type }))
            );
          },
          { ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'] }
        );
        break;
      } catch (error: unknown) {
        const isEnoent =
          error instanceof Error &&
          ((error as NodeJS.ErrnoException).code === 'ENOENT' ||
            error.message.includes('No such file or directory'));
        if (!isEnoent || attempt === 2) throw error;
        await new Promise<void>((resolve) =>
          setTimeout(resolve, 100 * (attempt + 1))
        );
      }
    }
  }
  return {
    port,
    reloader,
    effortGraph,
    async close() {
      if (closed) return;
      closed = true;
      await coordinator?.dispose();
      await subscription?.unsubscribe();
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
