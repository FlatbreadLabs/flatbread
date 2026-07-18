import { readFile } from 'node:fs/promises';
import { relative, resolve, sep, join } from 'node:path';
import type { LiveSchemaReloader, SchemaSnapshot } from '@flatbread/core';
import {
  EffortGraphGenerationWaitTimeoutError,
  EffortGraphLiveSchemaRejectedError,
  EffortGraphValidationError,
} from './errors.js';
import { createEffortGraphWriter } from './writer.js';
import type {
  CommittedGenerationPublication,
  CommittedGenerationPublisher,
  EffortGraphWriter,
  EffortGraphWriterOptions,
  GenerationToken,
} from './types.js';

export interface WaitForCommittedGenerationOptions {
  timeoutMs?: number;
}
export interface EffortGraphLiveBridge {
  readonly rootDir: string;
  readonly writer: EffortGraphWriter;
  readonly publisher: CommittedGenerationPublisher;
  waitForCommittedGeneration(
    token: GenerationToken,
    options?: WaitForCommittedGenerationOptions
  ): Promise<SchemaSnapshot>;
}
export interface CreateEffortGraphLiveBridgeOptions
  extends Omit<EffortGraphWriterOptions, 'publisher'> {
  reloader: LiveSchemaReloader;
  pollIntervalMs?: number;
}

async function generationOnDisk(rootDir: string): Promise<number> {
  try {
    const value = JSON.parse(
      await readFile(join(rootDir, '.journal', 'generation.json'), 'utf8')
    ).generation;
    return Number.isInteger(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function tokenNumber(token: string): number {
  if (!/^[1-9]\d*$/.test(token)) {
    throw new EffortGraphValidationError(
      `Generation token must be a positive integer: ${token}`
    );
  }
  return Number(token);
}

export async function createEffortGraphLiveBridge(
  options: CreateEffortGraphLiveBridgeOptions
): Promise<EffortGraphLiveBridge> {
  const pollIntervalMs = options.pollIntervalMs ?? 25;
  const liveGenerations = new Map<number, number>();
  // Tokens at or below this mark were already published when the bridge was
  // created, so the reloader's initial full build has read their files.
  const initialHighWater = await generationOnDisk(options.rootDir);

  const publisher: CommittedGenerationPublisher = {
    async publish(publication: CommittedGenerationPublication) {
      const absolutePaths = publication.changedPaths.map((path) => {
        const absolute = resolve(options.rootDir, path.replaceAll('\\', sep));
        const outside = relative(options.rootDir, absolute);
        if (outside === '..' || outside.startsWith(`..${sep}`)) {
          throw new EffortGraphValidationError(
            `Publication path escapes root directory: ${path}`
          );
        }
        return absolute;
      });
      const result = await options.reloader.notifyChanged({
        paths: absolutePaths,
        source: 'writer',
      });
      if (result.status === 'rejected') {
        throw new EffortGraphLiveSchemaRejectedError(publication, result.error);
      }
      liveGenerations.set(
        Number(publication.targetGeneration),
        result.generation
      );
    },
  };

  const writer = createEffortGraphWriter({
    rootDir: options.rootDir,
    index: options.index,
    clock: options.clock,
    randomBytes: options.randomBytes,
    lockOptions: options.lockOptions,
    publisher,
  });

  async function waitForCommittedGeneration(
    token: GenerationToken,
    waitOptions: WaitForCommittedGenerationOptions = {}
  ): Promise<SchemaSnapshot> {
    const target = tokenNumber(token);
    const deadline =
      waitOptions.timeoutMs === undefined
        ? undefined
        : Date.now() + waitOptions.timeoutMs;
    const sleep = async () => {
      const remaining =
        deadline === undefined ? pollIntervalMs : deadline - Date.now();
      if (remaining <= 0)
        throw new EffortGraphGenerationWaitTimeoutError(
          token,
          waitOptions.timeoutMs!
        );
      await new Promise<void>((resolveSleep) =>
        setTimeout(resolveSleep, Math.min(pollIntervalMs, remaining))
      );
    };
    // Pure poll loop: publication durability is a disk fact, and the
    // co-located fast path (a token returned by mutate()) resolves on the
    // first iteration, so no publish-side wakeup machinery is needed.
    for (;;) {
      const diskGeneration = await generationOnDisk(options.rootDir);
      if (diskGeneration >= target) {
        const mapped = liveGenerations.get(target);
        if (mapped !== undefined) {
          return await options.reloader.waitForGeneration(mapped);
        }
        if (target <= initialHighWater) return options.reloader.getSnapshot();
        const result = await options.reloader.replaceConfig(
          options.reloader.getSnapshot().graph.config
        );
        if (result.status === 'rejected') throw result.error;
        liveGenerations.set(target, result.generation);
        return options.reloader.getSnapshot();
      }
      if (liveGenerations.has(target)) {
        await options.reloader.waitForGeneration(liveGenerations.get(target)!);
      }
      await sleep();
    }
  }

  return {
    rootDir: options.rootDir,
    writer,
    publisher,
    waitForCommittedGeneration,
  };
}
