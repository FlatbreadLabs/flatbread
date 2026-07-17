import { subscribe } from '@parcel/watcher';
import {
  deriveFlatbreadWatchPatterns,
  generateTypes,
} from '@flatbread/codegen';
import type {
  ConfigResult,
  LoadedFlatbreadConfig,
  LiveSchemaReloader,
  SchemaSnapshot,
} from '@flatbread/core';
import { createLiveSchemaReloader } from '@flatbread/core';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache';
import cors from 'cors';
import express, { type RequestHandler } from 'express';
import http from 'http';
import picomatch from 'picomatch';
import { relative, resolve } from 'node:path';
import { loadFlatbreadConfig } from '../utils/getSchema';

export interface GraphqlServerOptions {
  port?: number;
  config: ConfigResult<LoadedFlatbreadConfig>;
  watch?: boolean;
  cwd?: string;
}
export interface RunningGraphqlServer {
  readonly port: number;
  readonly reloader: LiveSchemaReloader;
  close(): Promise<void>;
}

export async function startGraphqlServer(
  options: GraphqlServerOptions
): Promise<RunningGraphqlServer> {
  const cwd = options.cwd ?? process.cwd();
  if (!options.config.config) throw new Error('Config is not defined');
  const config = options.config.config;
  if (options.watch && !config.source.fetchPaths) {
    throw new Error(
      'Flatbread watch mode requires the configured source to implement fetchPaths(paths).'
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
    commitSchema: async (candidate) => {
      const next = await startGeneration(candidate.schema);
      const old = current;
      current = next;
      currentMiddleware = next.middleware;
      if (old) old.stopWhenDrained();
    },
  });
  app.use((req, res, next) => currentMiddleware(req, res, next));
  await new Promise<void>((listenResolve) =>
    httpServer.listen({ port: options.port ?? 5050 }, listenResolve)
  );
  const address = httpServer.address();
  const port =
    typeof address === 'object' && address
      ? address.port
      : options.port ?? 5050;
  let subscription: { unsubscribe(): Promise<void> } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pending = new Set<string>();
  const pendingDeleted = new Set<string>();
  let pendingConfig = false;
  let pendingDocuments = false;
  let matchers = compileMatchers(config);
  const refreshCodegen = async (
    snapshot: SchemaSnapshot,
    loadedConfig = snapshot.graph.config
  ) => {
    const cfg = loadedConfig.codegen;
    // No codegen section in the config → nothing to refresh; avoids writing
    // generated artifacts the user never asked for.
    if (!cfg) return;
    const result = await generateTypes(snapshot.schema, loadedConfig, {
      ...cfg,
      enabled: cfg.enabled ?? true,
      documents: cfg.documents ?? [],
    });
    if (!result.success) {
      console.error('Flatbread codegen refresh failed:', result.error);
    }
  };
  if (options.watch) {
    subscription = await subscribe(
      cwd,
      (error, events) => {
        if (error) {
          console.error('Flatbread watcher error:', error);
          return;
        }
        for (const event of events) {
          const path = resolve(event.path);
          const kind = classifyPath(path, matchers, cwd);
          if (kind === 'config') pendingConfig = true;
          else if (kind === 'document') pendingDocuments = true;
          else if (kind === 'content') {
            if (event.type === 'delete') {
              pendingDeleted.add(path);
              pending.add(path);
            } else if (!pendingDeleted.has(path)) {
              pending.add(path);
            }
          }
        }
        if (!timer) {
          timer = setTimeout(async () => {
            timer = undefined;
            const paths = [...pending];
            pending.clear();
            pendingDeleted.clear();
            if (pendingConfig) {
              pendingConfig = false;
              try {
                const loaded = await loadFlatbreadConfig(cwd);
                const result = await reloader.replaceConfig(loaded.config!);
                if (result.status === 'committed') {
                  matchers = compileMatchers(loaded.config!);
                  await refreshCodegen(reloader.getSnapshot(), loaded.config);
                } else console.error(result.error);
              } catch (error) {
                console.error('Flatbread config reload failed:', error);
              }
            }
            if (paths.length > 0) {
              const result = await reloader.notifyChanged({
                paths,
                source: 'watcher',
              });
              if (result.status === 'committed') {
                await refreshCodegen(reloader.getSnapshot());
              } else console.error(result.error);
            }
            if (pendingDocuments) {
              pendingDocuments = false;
              await refreshCodegen(reloader.getSnapshot());
            }
          }, 150);
        }
      },
      { ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'] }
    );
  }
  return {
    port,
    reloader,
    async close() {
      if (closed) return;
      closed = true;
      if (timer) clearTimeout(timer);
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
function compileMatchers(config: LoadedFlatbreadConfig) {
  const patterns = deriveFlatbreadWatchPatterns(config, {
    documents: config.codegen?.documents ?? [],
  });
  return {
    config: patterns.config.map((pattern) => picomatch(pattern)),
    content: patterns.content.map((pattern) => picomatch(pattern)),
    documents: patterns.documents.map((pattern) => picomatch(pattern)),
  };
}
function classifyPath(
  path: string,
  matchers: ReturnType<typeof compileMatchers>,
  cwd: string
): 'config' | 'content' | 'document' | undefined {
  const relativePath = relative(cwd, path).split('\\').join('/');
  if (matchers.config.some((matcher) => matcher(relativePath))) return 'config';
  if (matchers.content.some((matcher) => matcher(relativePath)))
    return 'content';
  if (matchers.documents.some((matcher) => matcher(relativePath)))
    return 'document';
  return undefined;
}
