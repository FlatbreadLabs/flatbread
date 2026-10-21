import type { HistoryEntry } from './history.ts';

/**
 * Whether `next` folds into `previous` instead of becoming an entry of its
 * own: both carry the same gesture id. A drag passes one gesture id to
 * every command it dispatches.
 */
export function shouldMerge(
  previous: HistoryEntry | undefined,
  next: HistoryEntry
): boolean {
  return (
    previous !== undefined &&
    previous.gesture !== null &&
    next.gesture !== null &&
    previous.gesture === next.gesture
  );
}

/** `previous` with `next` folded in: its selection before, `next`'s after. */
export function mergeEntries(
  previous: HistoryEntry,
  next: HistoryEntry
): HistoryEntry {
  return {
    ...previous,
    commands: [...previous.commands, ...next.commands],
    inverses: [...previous.inverses, ...next.inverses],
    selectionAfter: next.selectionAfter,
    at: next.at,
  };
}

export interface GestureSource {
  next(): string;
}

export function createGestureSource(): GestureSource {
  let n = 0;
  return { next: () => `g${++n}` };
}
