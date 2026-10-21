import type { Document } from '../../model/document.ts';
import type { Rect } from '../../model/geometry.ts';
import { rectOf } from '../../model/geometry.ts';
import { descendants } from '../../model/tree.ts';
import type { CommandHandler, Json } from '../types.ts';
import { command } from '../types.ts';

export interface GeometryItem extends Rect {
  id: string;
}

/**
 * The geometry every node under `id` takes when `id` goes from its current
 * rect to `next`, scaling positions and sizes about the old top-left.
 * Groups are left out: their bounds follow their children.
 */
export function scaledSubtree(
  doc: Document,
  id: string,
  next: Rect
): GeometryItem[] {
  const node = doc.require(id);
  const from = rectOf(node);
  const sx = from.width ? next.width / from.width : 1;
  const sy = from.height ? next.height / from.height : 1;
  const map = (r: Rect): Rect => ({
    x: next.x + (r.x - from.x) * sx,
    y: next.y + (r.y - from.y) * sy,
    width: r.width * sx,
    height: r.height * sy,
  });
  const items: GeometryItem[] = [];
  if (node.type !== 'group') items.push({ id, ...next });
  if (node.type === 'group')
    for (const inner of descendants(doc, id))
      if (inner.type !== 'group')
        items.push({ id: inner.id, ...map(rectOf(inner)) });
  return items;
}

/** Sets x, y, width and height on each item. Frames keep their children where they are. */
export const resizeHandler: CommandHandler = {
  type: 'resize',
  label: 'Resize',
  apply({ doc }, payload) {
    const items = payload.items as unknown as GeometryItem[];
    const before: GeometryItem[] = items.map((item) => ({
      id: item.id,
      ...rectOf(doc.require(item.id)),
    }));
    for (const item of items)
      doc.update(item.id, {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      });
    return command('resize', { items: before as unknown as Json[] });
  },
};
