import type { EditorContext } from '../commands/types.ts';
import type { Palette } from '../commands/palette.ts';
import type { LayersPanel } from '../layers/layers.ts';
import { command } from '../commands/types.ts';
import type { Direction } from '../commands/builtin/nudge.ts';
import { nudgeDelta } from '../commands/builtin/nudge.ts';
import { lockItems } from '../commands/builtin/lock.ts';
import { rowIndex } from '../layers/tree-view.ts';
import { normalizeChord } from './chords.ts';
import type { Scope } from './scopes.ts';
import { FocusTracker } from './scopes.ts';
import type { Keymap } from './keymap.ts';
import { DEFAULT_KEYMAP, lookup } from './keymap.ts';

export interface KeyEvent {
  chord: string;
  /** True for the auto-repeat presses while a key is held. */
  repeat: boolean;
}

export interface KeyContext extends EditorContext {
  palette: Palette;
  layers: LayersPanel;
  focus(scope: Scope): void;
}

type Action = (ctx: KeyContext, event: KeyEvent) => void;

function nudge(direction: Direction, large: boolean): Action {
  return (ctx) => {
    const ids = ctx.selection.ids();
    if (!ids.length) return;
    ctx.dispatch(command('nudge', { ids, ...nudgeDelta(direction, large) }));
  };
}

function step(ctx: KeyContext, by: number): void {
  const rows = ctx.layers.view();
  if (!rows.length) return;
  const current = ctx.selection.ids().at(-1);
  const at = current === undefined ? -1 : rowIndex(rows, current);
  const next =
    at < 0
      ? by > 0
        ? 0
        : rows.length - 1
      : Math.max(0, Math.min(rows.length - 1, at + by));
  ctx.layers.click(rows[next].id);
}

/** What each action name in the keymap does. */
export const ACTIONS: Record<string, Action> = {
  undo: (ctx) => void ctx.undo(),
  redo: (ctx) => void ctx.redo(),
  delete: (ctx) => void ctx.palette.run('Delete'),
  'deselect-all': (ctx) => void ctx.palette.run('Deselect all'),
  'select-all': (ctx) => void ctx.palette.run('Select all'),
  group: (ctx) => void ctx.palette.run('Group selection'),
  'bring-forward': (ctx) => void ctx.palette.run('Bring forward'),
  'send-backward': (ctx) => void ctx.palette.run('Send backward'),
  'bring-to-front': (ctx) => void ctx.palette.run('Bring to front'),
  'send-to-back': (ctx) => void ctx.palette.run('Send to back'),
  'toggle-lock': (ctx) => {
    const ids = ctx.selection.ids();
    if (!ids.length) return;
    const lock = !ids.every((id) => ctx.doc.require(id).locked);
    ctx.dispatch(command('set-lock', { items: lockItems(ids, lock) }), {
      label: lock ? 'Lock' : 'Unlock',
    });
  },
  'nudge-left': nudge('left', false),
  'nudge-right': nudge('right', false),
  'nudge-up': nudge('up', false),
  'nudge-down': nudge('down', false),
  'nudge-left-large': nudge('left', true),
  'nudge-right-large': nudge('right', true),
  'nudge-up-large': nudge('up', true),
  'nudge-down-large': nudge('down', true),
  'select-previous': (ctx) => step(ctx, -1),
  'select-next': (ctx) => step(ctx, 1),
  expand: (ctx) => {
    for (const id of ctx.selection.ids()) ctx.layers.expand(id);
  },
  collapse: (ctx) => {
    for (const id of ctx.selection.ids()) ctx.layers.collapse(id);
  },
  'focus-canvas': (ctx) => ctx.focus('canvas'),
};

/**
 * Runs the action a chord names in the focused scope's table, or failing
 * that the global table. The table is DEFAULT_KEYMAP.
 */
export class KeyDispatcher {
  readonly focus = new FocusTracker();
  private keymap: Keymap;
  private ctx: KeyContext;

  constructor(ctx: Omit<KeyContext, 'focus'>, keymap: Keymap = DEFAULT_KEYMAP) {
    this.keymap = keymap;
    this.ctx = {
      ...ctx,
      focus: (scope: Scope) => this.focus.focus(scope),
    } as KeyContext;
  }

  /** The action name a chord reaches from the focused scope. */
  resolve(chord: string): string | undefined {
    const normal = normalizeChord(chord);
    return (
      lookup(this.keymap, this.focus.current, normal) ??
      lookup(this.keymap, 'global', normal)
    );
  }

  down(chord: string, options: { repeat?: boolean } = {}): boolean {
    const name = this.resolve(chord);
    const action = name ? ACTIONS[name] : undefined;
    if (!action) return false;
    action(this.ctx, {
      chord: normalizeChord(chord),
      repeat: !!options.repeat,
    });
    return true;
  }

  up(chord: string): void {
    normalizeChord(chord);
  }

  /** A full press: down, then up. Returns whether an action ran. */
  press(chord: string): boolean {
    const ran = this.down(chord);
    this.up(chord);
    return ran;
  }
}

export function createDispatcher(
  ctx: Omit<KeyContext, 'focus'>
): KeyDispatcher {
  return new KeyDispatcher(ctx);
}
