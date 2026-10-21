import type { Binding, KeyContext } from '../dispatcher.ts';
import { rowIndex } from '../../layers/tree-view.ts';

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

function each(ctx: KeyContext, fn: (id: string) => void): void {
  for (const id of ctx.selection.ids()) fn(id);
}

export const layersBindings: readonly Binding[] = [
  { chord: 'ArrowUp', run: (ctx) => step(ctx, -1) },
  { chord: 'ArrowDown', run: (ctx) => step(ctx, 1) },
  {
    chord: 'ArrowRight',
    run: (ctx) => each(ctx, (id) => ctx.layers.expand(id)),
  },
  {
    chord: 'ArrowLeft',
    run: (ctx) => each(ctx, (id) => ctx.layers.collapse(id)),
  },
  { chord: 'Delete', run: (ctx) => void ctx.palette.run('Delete') },
  { chord: 'Mod+G', run: (ctx) => void ctx.palette.run('Group selection') },
];
