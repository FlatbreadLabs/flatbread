import { Emitter } from '../util/emitter.ts';
import type { Command } from './types.ts';
import { mergeEntries, shouldMerge } from './coalesce.ts';

export const UNDO_LIMIT = 200;

/**
 * An entry in the undo stack. `inverses` are in the order they were produced; undo runs
 * them last to first. The selection on each side is restored exactly.
 */
export interface HistoryEntry {
  id: number;
  label: string;
  commands: Command[];
  inverses: Command[];
  selectionBefore: string[];
  selectionAfter: string[];
  gesture: string | null;
  at: number;
}

export interface HistoryEvents extends Record<string, unknown> {
  change: { canUndo: boolean; canRedo: boolean; size: number };
}

/** Runs one command without recording it and returns its inverse. */
export type Applier = (command: Command) => Command;

export class History {
  readonly events = new Emitter<HistoryEvents>();
  private done: HistoryEntry[] = [];
  private undone: HistoryEntry[] = [];
  private nextId = 1;
  private limit: number;

  constructor(options: { limit?: number } = {}) {
    this.limit = options.limit ?? UNDO_LIMIT;
  }

  get canUndo(): boolean {
    return this.done.length > 0;
  }

  get canRedo(): boolean {
    return this.undone.length > 0;
  }

  get size(): number {
    return this.done.length;
  }

  /** Every undoable entry, oldest first, as copies. */
  entries(): HistoryEntry[] {
    return this.done.map((entry) => structuredClone(entry));
  }

  peek(): HistoryEntry | undefined {
    return this.done.at(-1);
  }

  record(entry: Omit<HistoryEntry, 'id'>): void {
    const full = { ...entry, id: this.nextId++ };
    const top = this.done.at(-1);
    if (shouldMerge(top, full))
      this.done[this.done.length - 1] = mergeEntries(top!, full);
    else {
      this.done.push(full);
      if (this.done.length > this.limit)
        this.done.splice(0, this.done.length - this.limit);
    }
    this.undone = [];
    this.changed();
  }

  /** Undoes the newest entry. Returns its selection before, or null. */
  undo(apply: Applier): string[] | null {
    const entry = this.done.pop();
    if (!entry) return null;
    for (const inverse of [...entry.inverses].reverse()) apply(inverse);
    this.undone.push(entry);
    this.changed();
    return [...entry.selectionBefore];
  }

  /** Redoes the newest undone entry. Returns its selection after, or null. */
  redo(apply: Applier): string[] | null {
    const entry = this.undone.pop();
    if (!entry) return null;
    entry.inverses = entry.commands.map((c) => apply(c));
    this.done.push(entry);
    this.changed();
    return [...entry.selectionAfter];
  }

  clear(): void {
    this.done = [];
    this.undone = [];
    this.changed();
  }

  private changed(): void {
    this.events.emit('change', {
      canUndo: this.canUndo,
      canRedo: this.canRedo,
      size: this.size,
    });
  }
}
