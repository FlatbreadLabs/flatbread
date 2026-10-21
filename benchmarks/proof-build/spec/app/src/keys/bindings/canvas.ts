import type { Binding, KeyContext } from '../dispatcher.ts';
import { command } from '../../commands/types.ts';
import type { Direction } from '../../commands/builtin/nudge.ts';
import { nudgeDelta } from '../../commands/builtin/nudge.ts';
import { lockItems } from '../../commands/builtin/lock.ts';

function palette(chord: string, title: string): Binding {
  return { chord, run: (ctx) => void ctx.palette.run(title) };
}

function nudge(chord: string, direction: Direction, large: boolean): Binding {
  return {
    chord,
    run(ctx: KeyContext) {
      const ids = ctx.selection.ids();
      if (!ids.length) return;
      ctx.dispatch(command('nudge', { ids, ...nudgeDelta(direction, large) }));
    },
  };
}

export const canvasBindings: readonly Binding[] = [
  palette('Delete', 'Delete'),
  palette('Backspace', 'Delete'),
  palette('Escape', 'Deselect all'),
  palette('Mod+A', 'Select all'),
  palette('Mod+G', 'Group selection'),
  palette('Mod+]', 'Bring forward'),
  palette('Mod+[', 'Send backward'),
  palette('Mod+Shift+]', 'Bring to front'),
  palette('Mod+Shift+[', 'Send to back'),
  {
    chord: 'Mod+Shift+L',
    run(ctx) {
      const ids = ctx.selection.ids();
      if (!ids.length) return;
      const lock = !ids.every((id) => ctx.doc.require(id).locked);
      ctx.dispatch(command('set-lock', { items: lockItems(ids, lock) }), {
        label: lock ? 'Lock' : 'Unlock',
      });
    },
  },
  nudge('ArrowLeft', 'left', false),
  nudge('ArrowRight', 'right', false),
  nudge('ArrowUp', 'up', false),
  nudge('ArrowDown', 'down', false),
  nudge('Shift+ArrowLeft', 'left', true),
  nudge('Shift+ArrowRight', 'right', true),
  nudge('Shift+ArrowUp', 'up', true),
  nudge('Shift+ArrowDown', 'down', true),
];
