import type { Document } from '../../model/document.ts';
import { descendants, topmostOnly } from '../../model/tree.ts';
import type { CommandHandler } from '../types.ts';
import { command } from '../types.ts';

/** Moves nodes, and everything inside them, by (dx, dy). */
export function translate(
  doc: Document,
  ids: readonly string[],
  dx: number,
  dy: number
): void {
  for (const id of topmostOnly(doc, ids)) {
    const node = doc.require(id);
    for (const inner of descendants(doc, id))
      if (inner.type !== 'group')
        doc.update(inner.id, { x: inner.x + dx, y: inner.y + dy });
    if (node.type !== 'group' || !node.children.length)
      doc.update(id, { x: node.x + dx, y: node.y + dy });
  }
}

export const moveHandler: CommandHandler = {
  type: 'move',
  label: 'Move',
  apply({ doc }, payload) {
    const ids = payload.ids as string[];
    const dx = payload.dx as number;
    const dy = payload.dy as number;
    translate(doc, ids, dx, dy);
    return command('move', { ids, dx: -dx, dy: -dy });
  },
};
