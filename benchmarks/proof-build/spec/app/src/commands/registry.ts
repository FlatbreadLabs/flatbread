import { fail } from '../util/assert.ts';
import type { CommandHandler } from './types.ts';
import {
  deleteHandler,
  insertHandler,
  restoreHandler,
} from './builtin/delete.ts';
import { moveHandler } from './builtin/move.ts';
import { nudgeHandler } from './builtin/nudge.ts';
import { resizeHandler } from './builtin/resize.ts';
import { setPropHandler } from './builtin/set-prop.ts';
import { reorderHandler } from './builtin/reorder.ts';
import { renameHandler } from './builtin/rename.ts';
import { visibilityHandler } from './builtin/visibility.ts';
import { lockHandler } from './builtin/lock.ts';

export class CommandRegistry {
  private handlers = new Map<string, CommandHandler>();

  register(handler: CommandHandler): void {
    if (this.handlers.has(handler.type))
      fail(
        'duplicate-command',
        `command ${handler.type} is already registered`
      );
    this.handlers.set(handler.type, handler);
  }

  get(type: string): CommandHandler {
    const handler = this.handlers.get(type);
    if (!handler) fail('unknown-command', `no command ${type}`);
    return handler;
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }

  types(): string[] {
    return [...this.handlers.keys()].sort();
  }
}

export function createRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  for (const handler of [
    insertHandler,
    deleteHandler,
    restoreHandler,
    moveHandler,
    nudgeHandler,
    resizeHandler,
    setPropHandler,
    reorderHandler,
    renameHandler,
    visibilityHandler,
    lockHandler,
  ])
    registry.register(handler);
  return registry;
}
