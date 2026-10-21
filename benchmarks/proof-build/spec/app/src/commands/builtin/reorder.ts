import type { Document } from '../../model/document.ts';
import { indexInParent, sortByPaintOrder } from '../../model/tree.ts';
import type { Command, CommandHandler } from '../types.ts';
import { command } from '../types.ts';

/** Moves a node to `index` in `parent`'s child list (back to front). */
export const reorderHandler: CommandHandler = {
  type: 'reorder',
  label: 'Reorder',
  apply({ doc }, payload) {
    const id = payload.id as string;
    const parent = payload.parent as string | null;
    const index = payload.index as number;
    const node = doc.require(id);
    const from = { parent: node.parent, index: indexInParent(doc, id) };
    doc.place(id, parent, index);
    return command('reorder', { id, parent: from.parent, index: from.index });
  },
};

export type Arrange = 'forward' | 'backward' | 'front' | 'back';

/**
 * The reorder commands that arrange `ids` within their own parents. Siblings
 * keep their relative order.
 */
export function arrangeCommands(
  doc: Document,
  ids: readonly string[],
  how: Arrange
): Command[] {
  const out: Command[] = [];
  const byParent = new Map<string | null, string[]>();
  for (const id of sortByPaintOrder(doc, ids)) {
    const parent = doc.require(id).parent;
    byParent.set(parent, [...(byParent.get(parent) ?? []), id]);
  }
  for (const [parent, members] of byParent) {
    const list = [...doc.children(parent)];
    const last = list.length - 1;
    const moving =
      how === 'forward' || how === 'front' ? [...members].reverse() : members;
    moving.forEach((id, i) => {
      const at = list.indexOf(id);
      let to = at;
      if (how === 'forward') to = Math.min(last - i, at + 1);
      if (how === 'backward') to = Math.max(i, at - 1);
      if (how === 'front') to = last - i;
      if (how === 'back') to = i;
      if (to === at) return;
      list.splice(at, 1);
      list.splice(to, 0, id);
      out.push(command('reorder', { id, parent, index: to }));
    });
  }
  return out;
}
