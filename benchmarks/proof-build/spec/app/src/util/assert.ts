// Assertions that throw a TesseraError, so callers can tell editor errors
// from programming errors in tests.

export class TesseraError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'TesseraError';
    this.code = code;
  }
}

export function assert(
  condition: unknown,
  message: string,
  code = 'assert'
): asserts condition {
  if (!condition) throw new TesseraError(code, message);
}

export function assertNever(value: never, message = 'unexpected value'): never {
  throw new TesseraError('never', `${message}: ${JSON.stringify(value)}`);
}

export function fail(code: string, message: string): never {
  throw new TesseraError(code, message);
}

export function isTesseraError(
  error: unknown,
  code?: string
): error is TesseraError {
  return (
    error instanceof TesseraError && (code === undefined || error.code === code)
  );
}
