import type {
  CommittedGenerationPublication,
  GenerationToken,
} from './types.js';

export class EffortGraphError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class EffortGraphLockedError extends EffortGraphError {
  readonly retryAfterMs: number;
  constructor(retryAfterMs = 1000, message = 'Effort graph is locked') {
    super(message, 'EFFORT_GRAPH_LOCKED');
    this.retryAfterMs = retryAfterMs;
  }
}
export class EffortGraphValidationError extends EffortGraphError {
  constructor(message: string) {
    super(message, 'EFFORT_GRAPH_VALIDATION');
  }
}
export class EffortGraphReindexFailedError extends EffortGraphError {
  constructor(message: string, readonly originalError?: unknown) {
    super(message, 'EFFORT_GRAPH_REINDEX_FAILED');
  }
}
export class EffortGraphCorruptJournalError extends EffortGraphError {
  constructor(message: string) {
    super(message, 'EFFORT_GRAPH_CORRUPT_JOURNAL');
  }
}

export class EffortGraphLiveSchemaRejectedError extends EffortGraphError {
  constructor(
    readonly publication: CommittedGenerationPublication,
    readonly originalError: Error
  ) {
    super(
      `Live schema rejected generation ${publication.targetGeneration}: ${originalError.message}`,
      'EFFORT_GRAPH_LIVE_SCHEMA_REJECTED'
    );
  }
}
export class EffortGraphGenerationWaitTimeoutError extends EffortGraphError {
  constructor(readonly token: GenerationToken, readonly timeoutMs: number) {
    super(
      `Timed out waiting for committed generation ${token} after ${timeoutMs}ms`,
      'EFFORT_GRAPH_GENERATION_WAIT_TIMEOUT'
    );
  }
}
export class EffortGraphBarrierTimeoutError extends EffortGraphError {
  constructor(readonly paths: readonly string[], readonly maxWaitMs: number) {
    super(
      `Timed out waiting for journal readability after ${maxWaitMs}ms`,
      'EFFORT_GRAPH_BARRIER_TIMEOUT'
    );
  }
}
