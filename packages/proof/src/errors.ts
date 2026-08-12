import type {
  CommittedGenerationPublication,
  GenerationToken,
} from './types.js';

export class ProofError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class ProofLockedError extends ProofError {
  readonly retryAfterMs: number;
  constructor(retryAfterMs = 1000, message = 'Proof is locked') {
    super(message, 'PROOF_LOCKED');
    this.retryAfterMs = retryAfterMs;
  }
}
export class ProofValidationError extends ProofError {
  constructor(message: string) {
    super(message, 'PROOF_VALIDATION');
  }
}
export class ProofReindexFailedError extends ProofError {
  constructor(message: string, readonly originalError?: unknown) {
    super(message, 'PROOF_REINDEX_FAILED');
  }
}
export class ProofCorruptJournalError extends ProofError {
  constructor(message: string) {
    super(message, 'PROOF_CORRUPT_JOURNAL');
  }
}

export class ProofLiveSchemaRejectedError extends ProofError {
  constructor(
    readonly publication: CommittedGenerationPublication,
    readonly originalError: Error
  ) {
    super(
      `Live schema rejected generation ${publication.targetGeneration}: ${originalError.message}`,
      'PROOF_LIVE_SCHEMA_REJECTED'
    );
  }
}
export class ProofGenerationWaitTimeoutError extends ProofError {
  constructor(readonly token: GenerationToken, readonly timeoutMs: number) {
    super(
      `Timed out waiting for committed generation ${token} after ${timeoutMs}ms`,
      'PROOF_GENERATION_WAIT_TIMEOUT'
    );
  }
}
export class ProofBarrierTimeoutError extends ProofError {
  constructor(readonly paths: readonly string[], readonly maxWaitMs: number) {
    super(
      `Timed out waiting for journal readability after ${maxWaitMs}ms`,
      'PROOF_BARRIER_TIMEOUT'
    );
  }
}
