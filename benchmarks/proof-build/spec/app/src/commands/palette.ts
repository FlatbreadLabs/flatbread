import { fail } from '../util/assert.ts';
import type { EditorContext } from './types.ts';
import { command } from './types.ts';
import { groupNodes } from './builtin/group.ts';
import { arrangeCommands } from './builtin/reorder.ts';
import type { Arrange } from './builtin/reorder.ts';
import { visibilityItems } from './builtin/visibility.ts';
import { lockItems } from './builtin/lock.ts';
import { alignCommand, distributeCommand } from './builtin/align.ts';
import type { Alignment, Axis } from './builtin/align.ts';
import { walk } from '../model/query.ts';
import { isInteractive } from '../selection/rules.ts';

/** A command as the palette lists it, by its title. */
export interface PaletteEntry {
  title: string;
  /** Shown beside the title, such as a shortcut. */
  hint?: string;
  enabled?(ctx: EditorContext): boolean;
  run(ctx: EditorContext, input?: string): void;
}

export class Palette {
  private entries = new Map<string, PaletteEntry>();
  private ctx: EditorContext;

  constructor(ctx: EditorContext) {
    this.ctx = ctx;
  }

  register(entry: PaletteEntry): void {
    if (this.entries.has(entry.title))
      fail('duplicate-title', `palette already has "${entry.title}"`);
    this.entries.set(entry.title, entry);
  }

  /** Titles of the commands that can run now, in registration order. */
  list(): string[] {
    return [...this.entries.values()]
      .filter((entry) => !entry.enabled || entry.enabled(this.ctx))
      .map((entry) => entry.title);
  }

  has(title: string): boolean {
    return this.entries.has(title);
  }

  /** Runs a command by title. Returns false when it is disabled. */
  run(title: string, input?: string): boolean {
    const entry = this.entries.get(title);
    if (!entry) fail('unknown-title', `no palette command "${title}"`);
    if (entry.enabled && !entry.enabled(this.ctx)) return false;
    entry.run(this.ctx, input);
    return true;
  }
}

const hasSelection = (ctx: EditorContext) => !ctx.selection.isEmpty();

function align(title: string, how: Alignment): PaletteEntry {
  return {
    title,
    enabled: hasSelection,
    run(ctx) {
      const c = alignCommand(ctx.doc, ctx.selection.ids(), how);
      if (c) ctx.dispatch(c, { label: title });
    },
  };
}

function distribute(title: string, axis: Axis): PaletteEntry {
  return {
    title,
    enabled: (ctx) => ctx.selection.size >= 3,
    run(ctx) {
      const c = distributeCommand(ctx.doc, ctx.selection.ids(), axis);
      if (c) ctx.dispatch(c, { label: title });
    },
  };
}

function arrange(title: string, how: Arrange, hint: string): PaletteEntry {
  return {
    title,
    hint,
    enabled: hasSelection,
    run(ctx) {
      const gesture = ctx.newGesture();
      for (const c of arrangeCommands(ctx.doc, ctx.selection.ids(), how))
        ctx.dispatch(c, { label: title, gesture });
    },
  };
}

export const BUILTIN_ENTRIES: readonly PaletteEntry[] = [
  { title: 'Undo', hint: 'Mod+Z', run: (ctx) => void ctx.undo() },
  { title: 'Redo', hint: 'Mod+Shift+Z', run: (ctx) => void ctx.redo() },
  {
    title: 'Select all',
    hint: 'Mod+A',
    run(ctx) {
      const ids: string[] = [];
      walk(ctx.doc, (node) => {
        if (node.parent === null && isInteractive(ctx.doc, node.id))
          ids.push(node.id);
        return false;
      });
      ctx.selection.set(ids);
    },
  },
  {
    title: 'Deselect all',
    hint: 'Escape',
    enabled: hasSelection,
    run: (ctx) => ctx.selection.clear(),
  },
  {
    title: 'Delete',
    hint: 'Delete',
    enabled: hasSelection,
    run(ctx) {
      ctx.dispatch(command('delete', { ids: ctx.selection.ids() }), {
        select: [],
      });
    },
  },
  {
    title: 'Group selection',
    hint: 'Mod+G',
    enabled: hasSelection,
    run: (ctx) => void groupNodes(ctx, ctx.selection.ids()),
  },
  arrange('Bring forward', 'forward', 'Mod+]'),
  arrange('Send backward', 'backward', 'Mod+['),
  arrange('Bring to front', 'front', 'Mod+Shift+]'),
  arrange('Send to back', 'back', 'Mod+Shift+['),
  align('Align left', 'left'),
  align('Align horizontal centers', 'center'),
  align('Align right', 'right'),
  align('Align top', 'top'),
  align('Align vertical centers', 'middle'),
  align('Align bottom', 'bottom'),
  distribute('Distribute horizontally', 'horizontal'),
  distribute('Distribute vertically', 'vertical'),
  {
    title: 'Hide',
    enabled: hasSelection,
    run(ctx) {
      ctx.dispatch(
        command('set-visibility', {
          items: visibilityItems(ctx.selection.ids(), false),
        }),
        {
          label: 'Hide',
        }
      );
    },
  },
  {
    title: 'Show',
    enabled: hasSelection,
    run(ctx) {
      ctx.dispatch(
        command('set-visibility', {
          items: visibilityItems(ctx.selection.ids(), true),
        }),
        {
          label: 'Show',
        }
      );
    },
  },
  {
    title: 'Lock',
    hint: 'Mod+Shift+L',
    enabled: hasSelection,
    run(ctx) {
      ctx.dispatch(
        command('set-lock', { items: lockItems(ctx.selection.ids(), true) }),
        { label: 'Lock' }
      );
    },
  },
  {
    title: 'Unlock',
    enabled: hasSelection,
    run(ctx) {
      ctx.dispatch(
        command('set-lock', { items: lockItems(ctx.selection.ids(), false) }),
        { label: 'Unlock' }
      );
    },
  },
  {
    title: 'Rename layer',
    enabled: (ctx) => ctx.selection.size === 1,
    run(ctx, input) {
      const name = (input ?? '').trim();
      if (!name) return;
      ctx.dispatch(command('rename', { id: ctx.selection.ids()[0], name }), {
        label: 'Rename layer',
      });
    },
  },
];

export function createPalette(ctx: EditorContext): Palette {
  const palette = new Palette(ctx);
  for (const entry of BUILTIN_ENTRIES) palette.register(entry);
  return palette;
}
