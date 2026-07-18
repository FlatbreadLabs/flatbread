import { generateSchema } from '../generators/schema';
import {
  buildContentGraph,
  patchContentGraph,
} from '../generators/contentGraph';
import type {
  ChangedPaths,
  ContentGraphSnapshot,
  LoadedFlatbreadConfig,
  LiveSchemaReloader,
  ReindexBarrier,
  ReindexResult,
  SchemaSnapshot,
} from '../types';

export interface LiveSchemaReloaderOptions {
  config: LoadedFlatbreadConfig;
  commitSchema: (
    candidate: Omit<SchemaSnapshot, 'generation'>
  ) => Promise<void>;
  barrier?: ReindexBarrier;
}

export async function createLiveSchemaReloader(
  options: LiveSchemaReloaderOptions
): Promise<LiveSchemaReloader> {
  let snapshot: SchemaSnapshot;
  let queue = Promise.resolve();
  let generation = 0;
  const waiters: Array<{
    generation: number;
    resolve: (value: SchemaSnapshot) => void;
  }> = [];
  const barrier = options.barrier ?? { waitUntilReadable: async () => {} };

  const initialGraph = await buildContentGraph(options.config);
  const initialSchema = await generateSchema({
    config: options.config,
    contentGraph: initialGraph,
  });
  await options.commitSchema({ schema: initialSchema, graph: initialGraph });
  snapshot = { schema: initialSchema, graph: initialGraph, generation: 0 };

  const commit = async (
    graph: ContentGraphSnapshot,
    config: LoadedFlatbreadConfig
  ): Promise<ReindexResult> => {
    try {
      const schema = await generateSchema({
        config,
        contentGraph: graph,
      });
      await options.commitSchema({ schema, graph });
      generation += 1;
      snapshot = { schema, graph, generation };
      for (const waiter of waiters.splice(0)) {
        if (waiter.generation <= generation) waiter.resolve(snapshot);
        else waiters.push(waiter);
      }
      return { status: 'committed', generation };
    } catch (error) {
      return {
        status: 'rejected',
        generation,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  };

  const enqueue = (
    operation: () => Promise<ReindexResult>
  ): Promise<ReindexResult> => {
    const result = queue.then(operation);
    queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  };

  return {
    get generation() {
      return generation;
    },
    getSnapshot: () => snapshot,
    notifyChanged: (change: ChangedPaths) =>
      enqueue(async () => {
        await barrier.waitUntilReadable(change.paths);
        try {
          const graph = await patchContentGraph(snapshot.graph, change.paths);
          return await commit(graph, snapshot.graph.config);
        } catch (error) {
          return {
            status: 'rejected',
            generation,
            error: error instanceof Error ? error : new Error(String(error)),
          };
        }
      }),
    replaceConfig: (config: LoadedFlatbreadConfig) =>
      enqueue(async () => {
        try {
          const graph = await buildContentGraph(config);
          return await commit(graph, config);
        } catch (error) {
          return {
            status: 'rejected',
            generation,
            error: error instanceof Error ? error : new Error(String(error)),
          };
        }
      }),
    waitForGeneration: (minimumGeneration: number) =>
      generation >= minimumGeneration
        ? Promise.resolve(snapshot)
        : new Promise((resolve) =>
            waiters.push({ generation: minimumGeneration, resolve })
          ),
  };
}
