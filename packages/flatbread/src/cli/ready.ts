/**
 * Pure ready-message decision for `flatbread start`.
 *
 * The runner forks the GraphQL server and listens for `flatbread-gql-ready`.
 * This module decides what happens next: keep the parent alive (server-only)
 * or spawn the corunner. Callers inject spawn and exit so tests stay fast.
 */

/** Narrow child-process surface used by the ready handler. */
export interface ChildLike {
  on(event: 'close', listener: (code: number | null) => void): unknown;
  on(event: 'exit', listener: (code: number | null) => void): unknown;
  on(event: 'error', listener: (err: Error) => void): unknown;
  kill(): unknown;
}

export interface ReadyHandlerDeps {
  readonly corunner: string;
  readonly packageManager: string | null;
  spawnCorunner(packageManagerCommand: string): ChildLike;
  onExit(code: number): void;
  onReady?: () => void;
  /** Override for tests; defaults to `console.error`. */
  logError?: (message: string) => void;
}

export interface ReadyHandleResult {
  /** True when this call took the server-only keep-alive branch. */
  readonly serverOnly: boolean;
  /** True when this call was the first accepted `flatbread-gql-ready`. */
  readonly accepted: boolean;
}

/**
 * Build the IPC message handler that runs when the GraphQL child is ready.
 *
 * Also attaches `exit` / `error` listeners so a child that dies before ready
 * exits the parent instead of hanging. A second `flatbread-gql-ready` is
 * ignored so the corunner is never spawned twice.
 */
export function createGqlReadyHandler(
  gqlChild: ChildLike,
  deps: ReadyHandlerDeps
): (msg: unknown) => ReadyHandleResult {
  let handled = false;
  const logError = deps.logError ?? ((message) => console.error(message));

  const exitBeforeReady = (code: number | null): void => {
    if (handled) return;
    handled = true;
    logError(
      `Flatbread GraphQL server exited before ready (code ${
        code === null ? 'null' : code
      }).`
    );
    deps.onExit(code ?? 1);
  };

  gqlChild.on('exit', (code) => {
    exitBeforeReady(code);
  });
  gqlChild.on('error', () => {
    exitBeforeReady(1);
  });

  return (msg: unknown): ReadyHandleResult => {
    if (msg !== 'flatbread-gql-ready') {
      return { serverOnly: false, accepted: false };
    }

    if (handled) {
      return { serverOnly: false, accepted: false };
    }
    handled = true;

    deps.onReady?.();

    const hasCorunner =
      typeof deps.corunner === 'string' && deps.corunner.trim().length > 0;

    if (!hasCorunner) {
      gqlChild.on('close', (code) => {
        deps.onExit(code ?? 1);
      });
      return { serverOnly: true, accepted: true };
    }

    const packageManagerCommand = deps.packageManager ?? 'npm run';
    const targetProcess = deps.spawnCorunner(packageManagerCommand);

    for (const script of [gqlChild, targetProcess]) {
      script.on('close', (code) => {
        deps.onExit(code ?? 1);
      });
    }

    return { serverOnly: false, accepted: true };
  };
}
