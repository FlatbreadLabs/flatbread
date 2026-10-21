import type { Document } from '../model/document.ts';
import type { Selection } from '../selection/selection.ts';
import { normalizeSelection } from '../selection/rules.ts';
import { Emitter } from '../util/emitter.ts';
import type { CommandRegistry } from './registry.ts';
import type { History } from './history.ts';
import type { Command, DispatchOptions } from './types.ts';

export interface BusEvents extends Record<string, unknown> {
  executed: { command: Command; label: string };
}

interface OpenBatch {
  label: string;
  depth: number;
  commands: Command[];
  inverses: Command[];
  selectionBefore: string[];
}

/**
 * Runs commands against the document and records them in history. Commands
 * run inside `batch()` are recorded as one entry when the outermost batch
 * closes.
 */
export class CommandBus {
  readonly events = new Emitter<BusEvents>();
  private open: OpenBatch | null = null;
  private doc: Document;
  private selection: Selection;
  private registry: CommandRegistry;
  private history: History;
  private clock: () => number;

  constructor(
    doc: Document,
    selection: Selection,
    registry: CommandRegistry,
    history: History,
    clock: () => number = Date.now
  ) {
    this.doc = doc;
    this.selection = selection;
    this.registry = registry;
    this.history = history;
    this.clock = clock;
  }

  /** Applies a command without recording it. Returns its inverse. */
  apply(command: Command): Command {
    return this.registry
      .get(command.type)
      .apply({ doc: this.doc }, command.payload);
  }

  dispatch(command: Command, options: DispatchOptions = {}): void {
    const handler = this.registry.get(command.type);
    const label = options.label ?? handler.label;
    const selectionBefore = this.selection.ids();
    const inverse = this.apply(command);
    if (options.select) this.selection.set(options.select);
    this.selection.set(normalizeSelection(this.doc, this.selection.ids()));
    this.events.emit('executed', { command, label });
    if (this.open) {
      this.open.commands.push(command);
      this.open.inverses.push(inverse);
      return;
    }
    this.history.record({
      label,
      commands: [command],
      inverses: [inverse],
      selectionBefore,
      selectionAfter: this.selection.ids(),
      gesture: options.gesture ?? null,
      at: this.clock(),
    });
  }

  beginBatch(label: string): void {
    if (this.open) {
      this.open.depth += 1;
      return;
    }
    this.open = {
      label,
      depth: 1,
      commands: [],
      inverses: [],
      selectionBefore: this.selection.ids(),
    };
  }

  endBatch(): void {
    const open = this.open;
    if (!open) return;
    if (--open.depth > 0) return;
    this.open = null;
    if (!open.commands.length) return;
    this.history.record({
      label: open.label,
      commands: open.commands,
      inverses: open.inverses,
      selectionBefore: open.selectionBefore,
      selectionAfter: this.selection.ids(),
      gesture: null,
      at: this.clock(),
    });
  }

  get inBatch(): boolean {
    return this.open !== null;
  }

  undo(): boolean {
    const selection = this.history.undo((c) => this.apply(c));
    if (selection === null) return false;
    this.selection.set(normalizeSelection(this.doc, selection));
    return true;
  }

  redo(): boolean {
    const selection = this.history.redo((c) => this.apply(c));
    if (selection === null) return false;
    this.selection.set(normalizeSelection(this.doc, selection));
    return true;
  }

  /** Dispatches each command in turn, each as its own entry. */
  replay(commands: readonly Command[], options: DispatchOptions = {}): void {
    for (const c of commands) this.dispatch(c, options);
  }
}
