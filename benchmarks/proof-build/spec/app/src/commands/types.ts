import type { Document } from '../model/document.ts';
import type { Selection } from '../selection/selection.ts';
import type { IdSource } from '../util/ids.ts';

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

export interface Command {
  type: string;
  payload: { [key: string]: Json };
}

export interface ApplyContext {
  doc: Document;
}

/** Applies a command's payload and returns the command that undoes it. */
export interface CommandHandler {
  type: string;
  label: string;
  apply(ctx: ApplyContext, payload: Command['payload']): Command;
}

export interface DispatchOptions {
  /** History label; defaults to the handler's label. */
  label?: string;
  /** Entries that share a gesture id are merged. */
  gesture?: string | null;
  /** The selection to set once the command has run. */
  select?: string[];
}

/** What palette commands and key bindings work with. */
export interface EditorContext {
  doc: Document;
  selection: Selection;
  ids: IdSource;
  dispatch(command: Command, options?: DispatchOptions): void;
  batch(label: string, run: () => void): void;
  newGesture(): string;
  undo(): boolean;
  redo(): boolean;
}

export function command(type: string, payload: Command['payload']): Command {
  return { type, payload };
}
