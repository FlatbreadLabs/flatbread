import { isMatch } from 'matcher';
import { relative, resolve } from 'node:path';
import type { LoadedFlatbreadConfig } from '../types';
import { classifyPath } from '../records';
import type { PathClassification } from '../records';

export type WatchEventType = 'create' | 'update' | 'delete';
export interface WatchEvent {
  readonly path: string;
  readonly type: WatchEventType;
}
export interface WatchContentChange extends PathClassification {
  readonly path: string;
  readonly type: WatchEventType;
}
export type WatchGenerationKind =
  | 'config'
  | 'content'
  | 'documents'
  | 'codegen';
export type WatchAdapterGeneration =
  | { readonly status: 'committed'; readonly generation?: number }
  | {
      readonly status: 'rejected';
      readonly generation?: number;
      readonly error: Error;
    };
export type WatchCoordinatorResult =
  | {
      readonly status: 'committed';
      readonly sequence: number;
      readonly kind: WatchGenerationKind;
      readonly config: LoadedFlatbreadConfig;
      readonly content: readonly WatchContentChange[];
      readonly adapterGeneration?: number;
    }
  | {
      readonly status: 'rejected';
      readonly sequence: number;
      readonly kind: WatchGenerationKind;
      readonly config: LoadedFlatbreadConfig;
      readonly content: readonly WatchContentChange[];
      readonly adapterGeneration?: number;
      readonly error: Error;
    };
export interface WatchTimer {
  readonly cancel: () => void;
}
export interface WatchScheduler {
  readonly schedule: (delayMs: number, callback: () => void) => WatchTimer;
}
export interface WatchCoordinatorOptions {
  readonly config: LoadedFlatbreadConfig;
  readonly cwd?: string;
  readonly debounceMs?: number;
  readonly configPatterns?: readonly string[];
  readonly documentPatterns: (
    config: LoadedFlatbreadConfig
  ) => readonly string[];
  readonly loadConfig: () => Promise<LoadedFlatbreadConfig>;
  readonly applyConfig: (
    config: LoadedFlatbreadConfig
  ) => Promise<WatchAdapterGeneration>;
  readonly reindexContent: (
    changes: readonly WatchContentChange[]
  ) => Promise<WatchAdapterGeneration>;
  readonly refreshCodegen: (context: {
    readonly reason: 'config' | 'content' | 'documents';
    readonly config: LoadedFlatbreadConfig;
    readonly content: readonly WatchContentChange[];
  }) => Promise<void>;
  readonly scheduler?: WatchScheduler;
}
export interface WatchCoordinator {
  readonly push: (events: readonly WatchEvent[]) => void;
  readonly flush: () => Promise<void>;
  readonly drain: () => Promise<void>;
  readonly subscribe: (
    listener: (result: WatchCoordinatorResult) => void
  ) => () => void;
  readonly dispose: () => Promise<void>;
}

const defaultScheduler: WatchScheduler = {
  schedule: (delayMs, callback) => {
    const timer = setTimeout(callback, delayMs);
    return { cancel: () => clearTimeout(timer) };
  },
};

function expandBraces(pattern: string): string[] {
  const match = /\{([^{}]*)\}/.exec(pattern);
  if (!match) return [pattern];
  return match[1]
    .split(',')
    .flatMap((part) =>
      expandBraces(
        `${pattern.slice(0, match.index)}${part}${pattern.slice(
          match.index + match[0].length
        )}`
      )
    );
}

function matches(patterns: readonly string[], path: string): boolean {
  return patterns
    .flatMap(expandBraces)
    .some((pattern) => isMatch(path, pattern, { caseSensitive: true }));
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function createWatchCoordinator(
  options: WatchCoordinatorOptions
): WatchCoordinator {
  const cwd = options.cwd ?? process.cwd();
  if (cwd !== process.cwd()) {
    throw new Error(
      `Watch coordinator cwd must equal process.cwd(): ${process.cwd()}`
    );
  }
  const scheduler = options.scheduler ?? defaultScheduler;
  const debounceMs = options.debounceMs ?? 150;
  const configPatterns = options.configPatterns ?? ['flatbread.config.*'];
  let activeConfig = options.config;
  let pending = new Map<string, WatchEvent>();
  let timer: WatchTimer | undefined;
  let processing = false;
  let disposed = false;
  let sequence = 0;
  const listeners = new Set<(result: WatchCoordinatorResult) => void>();
  const idleWaiters: Array<() => void> = [];
  let forceNext = false;

  const emit = (
    status: 'committed' | 'rejected',
    kind: WatchGenerationKind,
    config: LoadedFlatbreadConfig,
    content: readonly WatchContentChange[],
    generation?: number,
    error?: Error
  ) => {
    const result = {
      status,
      sequence: ++sequence,
      kind,
      config,
      content,
      ...(generation === undefined ? {} : { adapterGeneration: generation }),
      ...(error === undefined ? {} : { error }),
    } as WatchCoordinatorResult;
    for (const listener of listeners) listener(result);
  };

  const isIdle = () => !timer && !processing && pending.size === 0;
  const resolveIdle = () => {
    if (!isIdle()) return;
    while (idleWaiters.length) idleWaiters.shift()!();
  };
  const waitForIdle = () =>
    isIdle()
      ? Promise.resolve()
      : new Promise<void>((resolve) => idleWaiters.push(resolve));

  const start = async (): Promise<void> => {
    if (processing || disposed || pending.size === 0) return;
    if (timer) {
      timer.cancel();
      timer = undefined;
    }
    processing = true;
    const batch = pending;
    pending = new Map();
    const raw = [...batch.values()];
    let configChanged = false;
    const relativePath = (path: string) =>
      relative(cwd, resolve(path)).split('\\').join('/');
    try {
      configChanged = raw.some((event) =>
        matches(configPatterns, relativePath(event.path))
      );
      if (configChanged) {
        let loaded: LoadedFlatbreadConfig | undefined;
        try {
          loaded = await options.loadConfig();
          const result = await options.applyConfig(loaded);
          if (result.status === 'committed') {
            activeConfig = loaded;
            emit('committed', 'config', activeConfig, [], result.generation);
            try {
              await options.refreshCodegen({
                reason: 'config',
                config: activeConfig,
                content: [],
              });
              emit('committed', 'codegen', activeConfig, []);
            } catch (error) {
              emit(
                'rejected',
                'codegen',
                activeConfig,
                [],
                undefined,
                asError(error)
              );
            }
          } else {
            emit(
              'rejected',
              'config',
              activeConfig,
              [],
              result.generation,
              result.error
            );
          }
        } catch (error) {
          emit(
            'rejected',
            'config',
            activeConfig,
            [],
            undefined,
            asError(error)
          );
        }
      }
      const content: WatchContentChange[] = [];
      let documents = false;
      for (const event of raw) {
        const path = resolve(event.path);
        if (matches(configPatterns, relativePath(path))) continue;
        const classification = classifyPath(path, activeConfig);
        if (classification) {
          const prior = content.findIndex((change) => change.path === path);
          const change = { ...classification, path, type: event.type };
          if (prior < 0) content.push(change);
          else if (content[prior].type !== 'delete') content[prior] = change;
          continue;
        }
        if (
          matches(options.documentPatterns(activeConfig), relativePath(path))
        ) {
          documents = true;
        }
      }
      if (content.length) {
        try {
          const result = await options.reindexContent(content);
          if (result.status === 'committed') {
            emit(
              'committed',
              'content',
              activeConfig,
              content,
              result.generation
            );
            try {
              await options.refreshCodegen({
                reason: 'content',
                config: activeConfig,
                content,
              });
              emit('committed', 'codegen', activeConfig, content);
            } catch (error) {
              emit(
                'rejected',
                'codegen',
                activeConfig,
                content,
                undefined,
                asError(error)
              );
            }
          } else {
            emit(
              'rejected',
              'content',
              activeConfig,
              content,
              result.generation,
              result.error
            );
          }
        } catch (error) {
          emit(
            'rejected',
            'content',
            activeConfig,
            content,
            undefined,
            asError(error)
          );
        }
      }
      if (documents) {
        try {
          await options.refreshCodegen({
            reason: 'documents',
            config: activeConfig,
            content: [],
          });
          emit('committed', 'documents', activeConfig, []);
        } catch (error) {
          emit(
            'rejected',
            'documents',
            activeConfig,
            [],
            undefined,
            asError(error)
          );
        }
      }
    } finally {
      processing = false;
      if (!disposed && pending.size) {
        if (forceNext) {
          forceNext = false;
          void start();
        } else {
          timer = scheduler.schedule(debounceMs, () => {
            timer = undefined;
            void start();
          });
        }
      } else {
        // Nothing follows this batch; a latched flush intent must not leak
        // into a later unrelated push and skip its debounce window.
        forceNext = false;
      }
      resolveIdle();
    }
  };

  const push = (events: readonly WatchEvent[]) => {
    if (disposed) return;
    for (const event of events) {
      const path = resolve(event.path);
      const previous = pending.get(path);
      if (!previous || previous.type !== 'delete') {
        pending.set(path, { path, type: event.type });
      }
    }
    if (!processing && !timer) {
      timer = scheduler.schedule(debounceMs, () => {
        timer = undefined;
        void start();
      });
    }
  };

  return {
    push,
    flush: async () => {
      if (disposed) return;
      if (isIdle()) return;
      if (timer) {
        timer.cancel();
        timer = undefined;
      }
      forceNext = true;
      if (!processing) void start();
      await waitForIdle();
    },
    drain: waitForIdle,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose: async () => {
      if (disposed) return;
      disposed = true;
      if (timer) {
        timer.cancel();
        timer = undefined;
      }
      pending.clear();
      await (processing ? waitForIdle() : Promise.resolve());
    },
  };
}
