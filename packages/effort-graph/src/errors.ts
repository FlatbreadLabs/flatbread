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
