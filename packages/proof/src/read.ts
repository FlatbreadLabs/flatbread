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
      | 'PROOF_GENERATION_WAIT_TIMEOUT'
      | 'PROOF_LIVE_SCHEMA_REJECTED'
      | 'PROOF_INVALID_GENERATION';
    message: string;
    requested_generation: string;
    timeout_ms?: number;
  };
}

export class ProofReadValidationError extends Error {
  readonly shape: {
    error: {
      code: 'PROOF_INVALID_GENERATION' | 'PROOF_INVALID_ARGUMENT';
      message: string;
    };
  };
  constructor(
    code: 'PROOF_INVALID_GENERATION' | 'PROOF_INVALID_ARGUMENT',
    message: string
  ) {
    super(message);
    this.name = 'ProofReadValidationError';
    this.shape = { error: { code, message } };
  }
}

export class ProofInvalidCursorError extends Error {
  readonly shape = {
    error: { code: 'PROOF_INVALID_CURSOR' as const, message: '' },
  };
  constructor(message: string) {
    super(message);
    this.name = 'ProofInvalidCursorError';
    this.shape.error.message = message;
  }
}

/**
 * Raised when a record stores a relation id that no record answers to. Relation
 * recall fails closed instead of handing back provenance that quietly lost an
 * edge, and the message names the record, the relation, and the missing id so a
 * reader can repair the file.
 */
export class ProofDanglingRelationError extends Error {
  readonly shape: {
    error: {
      code: 'PROOF_DANGLING_RELATION';
      message: string;
      from_id: string;
      edges: { relation: string; to_id: string }[];
    };
  };
  constructor(fromId: string, edges: { relation: string; to_id: string }[]) {
    const message = `Record ${fromId} stores relation targets that do not exist: ${edges
      .map((edge) => `${edge.relation} -> ${edge.to_id}`)
      .join(', ')}`;
    super(message);
    this.name = 'ProofDanglingRelationError';
    this.shape = {
      error: {
        code: 'PROOF_DANGLING_RELATION',
        message,
        from_id: fromId,
        edges,
      },
    };
  }
}

export interface CrossEffortRelationEdge {
  relation: string;
  to_id: string;
  target_effort_id: string | null;
}

/**
 * Raised when an effort-scoped read finds a stored edge whose target belongs
 * to another effort. Old or hand-edited records fail closed instead of
 * turning a foreign edge into a successful empty page.
 */
export class ProofCrossEffortRelationError extends Error {
  readonly shape: {
    error: {
      code: 'PROOF_CROSS_EFFORT_RELATION';
      message: string;
      effort_id: string;
      from_id: string;
      edges: CrossEffortRelationEdge[];
    };
  };
  constructor(
    effortId: string,
    fromId: string,
    edges: CrossEffortRelationEdge[]
  ) {
    const message = `Record ${fromId} in effort ${effortId} stores relation targets outside that effort: ${edges
      .map(
        (edge) =>
          `${edge.relation} -> ${edge.to_id} (effort ${
            edge.target_effort_id ?? 'unknown'
          })`
      )
      .join(', ')}`;
    super(message);
    this.name = 'ProofCrossEffortRelationError';
    this.shape = {
      error: {
        code: 'PROOF_CROSS_EFFORT_RELATION',
        message,
        effort_id: effortId,
        from_id: fromId,
        edges,
      },
    };
  }
}

export class ProofConsistencyError extends Error {
  readonly shape: ConsistencyErrorShape;
  constructor(shape: ConsistencyErrorShape) {
    super(shape.error.message);
    this.name = 'ProofConsistencyError';
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
        code: 'PROOF_GENERATION_WAIT_TIMEOUT',
        message: `Durable Proof generation ${wanted} was not observed (current: ${current})`,
        requested_generation: strict!.min_generation,
        timeout_ms: timeout,
      },
    };
    throw new ProofConsistencyError(shape);
  }
  return String(current);
}

export function parseGenerationToken(value: unknown): number {
  if (
    typeof value !== 'string' ||
    !/^(0|[1-9]\d*)$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  )
    throw new ProofReadValidationError(
      'PROOF_INVALID_GENERATION',
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
