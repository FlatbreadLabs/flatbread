import { readFile, readdir, stat, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
export const READ_RELATIONS = [
  'derives_from',
  'supersedes',
  'superseded_by',
  'invalidates',
  'invalidated_by',
  'rejected_by',
  'mitigated_by',
  'resolved_by',
  'evidence',
  'cites',
] as const;

export interface ReadOptions {
  cacheRoot: string;
  consistency?:
    | { mode: 'eventual' }
    | { mode: 'strict'; min_generation: string; timeout_ms?: number };
}

export type EffortStatus = 'active' | 'paused' | 'completed' | 'abandoned';

export type ReadQuery =
  | { type: 'getRecord'; id: string; resolve?: 'exact' | 'head' }
  | {
      type: 'effortRecords';
      effort_id: string;
      kinds?: string[];
      where?: Record<string, unknown>;
      page?: { cursor?: string; limit?: number };
    }
  | {
      type: 'relations';
      effort_id: string;
      from_id: string;
      relations: string[];
      page?: { cursor?: string; limit?: number };
    }
  | {
      type: 'blockingDecisions';
      effort_id: string;
      page?: { cursor?: string; limit?: number };
    }
  | {
      type: 'listEfforts';
      status: EffortStatus[];
      page?: { cursor?: string; limit?: number };
    };

export interface ConsistencyErrorShape {
  error: {
    code:
      | 'EFFORT_GRAPH_GENERATION_WAIT_TIMEOUT'
      | 'EFFORT_GRAPH_LIVE_SCHEMA_REJECTED'
      | 'EFFORT_GRAPH_INVALID_GENERATION';
    message: string;
    requested_generation: string;
    timeout_ms?: number;
  };
}

export class EffortGraphReadValidationError extends Error {
  readonly shape: {
    error: {
      code: 'EFFORT_GRAPH_INVALID_GENERATION' | 'EFFORT_GRAPH_INVALID_ARGUMENT';
      message: string;
    };
  };
  constructor(
    code: 'EFFORT_GRAPH_INVALID_GENERATION' | 'EFFORT_GRAPH_INVALID_ARGUMENT',
    message: string
  ) {
    super(message);
    this.name = 'EffortGraphReadValidationError';
    this.shape = { error: { code, message } };
  }
}

export class EffortGraphInvalidCursorError extends Error {
  readonly shape = {
    error: { code: 'EFFORT_GRAPH_INVALID_CURSOR' as const, message: '' },
  };
  constructor(message: string) {
    super(message);
    this.name = 'EffortGraphInvalidCursorError';
    this.shape.error.message = message;
  }
}

export class EffortGraphConsistencyError extends Error {
  readonly shape: ConsistencyErrorShape;
  constructor(shape: ConsistencyErrorShape) {
    super(shape.error.message);
    this.name = 'EffortGraphConsistencyError';
    this.shape = shape;
  }
}

async function generation(rootDir: string): Promise<number> {
  try {
    const data = JSON.parse(
      await readFile(join(rootDir, '.journal', 'generation.json'), 'utf8')
    );
    return Number(data.generation) || 0;
  } catch {
    return 0;
  }
}

async function servedGeneration(
  rootDir: string,
  consistency: ReadOptions['consistency']
): Promise<string> {
  const strict = consistency?.mode === 'strict' ? consistency : undefined;
  const wanted = strict
    ? parseGenerationToken(strict.min_generation)
    : undefined;
  const timeout = strict ? strict.timeout_ms ?? 3000 : 0;
  const started = Date.now();
  let current = await generation(rootDir);
  while (
    wanted !== undefined &&
    current < wanted &&
    Date.now() - started < timeout
  ) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    current = await generation(rootDir);
  }
  if (wanted !== undefined && current < wanted) {
    const shape: ConsistencyErrorShape = {
      error: {
        code: 'EFFORT_GRAPH_GENERATION_WAIT_TIMEOUT',
        message: `Durable Effort Graph generation ${wanted} was not observed (current: ${current})`,
        requested_generation: strict!.min_generation,
        timeout_ms: timeout,
      },
    };
    throw new EffortGraphConsistencyError(shape);
  }
  return String(current);
}

export function parseGenerationToken(value: unknown): number {
  if (
    typeof value !== 'string' ||
    !/^(0|[1-9]\d*)$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  )
    throw new EffortGraphReadValidationError(
      'EFFORT_GRAPH_INVALID_GENERATION',
      'strict-min-generation must be a canonical non-negative safe integer string'
    );
  return Number(value);
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return [...new Set(value.map(String))].sort();
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)])
    );
  return value;
}

export function canonicalizeReadQuery(
  query: Record<string, unknown>
): Record<string, unknown> {
  return canonical(query) as Record<string, unknown>;
}

export function readQueryHash(query: Record<string, unknown>): string {
  return createHash('sha256')
    .update(JSON.stringify(canonical(query)))
    .digest('hex');
}

export async function pruneReadCache(
  cacheRoot: string,
  options: { maxAgeMs?: number; maxBytes?: number } = {}
): Promise<{ deleted: number; bytes: number }> {
  const maxAge = options.maxAgeMs ?? 24 * 60 * 60 * 1000;
  const maxBytes = options.maxBytes ?? 100 * 1024 * 1024;
  const files: { path: string; mtime: number; size: number }[] = [];
  async function walk(dir: string): Promise<void> {
    let entries: any[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name.endsWith('.md')) {
        const info = await stat(path);
        files.push({ path, mtime: info.mtimeMs, size: info.size });
      }
    }
  }
  await walk(join(cacheRoot, 'read-cache'));
  const now = Date.now();
  let deleted = 0;
  let bytes = files.reduce((sum, file) => sum + file.size, 0);
  for (const file of files
    .filter((item) => now - item.mtime > maxAge)
    .concat(
      files
        .filter((item) => now - item.mtime <= maxAge)
        .sort((a, b) => a.mtime - b.mtime)
    )) {
    if (now - file.mtime <= maxAge && bytes <= maxBytes) break;
    await unlink(file.path);
    deleted++;
    bytes -= file.size;
  }
  return { deleted, bytes };
}
