import type { Document } from '../../model/document.ts';
import type { Rect } from '../../model/geometry.ts';
import { nodeBounds, rectOf } from '../../model/geometry.ts';
import { descendants, topmostOnly } from '../../model/tree.ts';
import { selectionBounds } from '../../selection/bounds.ts';
import type { Command, Json } from '../types.ts';
import { command } from '../types.ts';
import type { GeometryItem } from './resize.ts';

export type Alignment =
  | 'left'
  | 'center'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom';
export type Axis = 'horizontal' | 'vertical';

/** Geometry for `id` and everything inside it, moved by (dx, dy). */
function shifted(
  doc: Document,
  id: string,
  dx: number,
  dy: number
): GeometryItem[] {
  return [doc.require(id), ...descendants(doc, id)]
    .filter((node) => node.type !== 'group')
    .map((node) => ({
      id: node.id,
      ...rectOf(node),
      x: node.x + dx,
      y: node.y + dy,
    }));
}

function offset(
  bounds: Rect,
  target: Rect,
  how: Alignment
): { dx: number; dy: number } {
  switch (how) {
    case 'left':
      return { dx: target.x - bounds.x, dy: 0 };
    case 'center':
      return {
        dx: target.x + target.width / 2 - (bounds.x + bounds.width / 2),
        dy: 0,
      };
    case 'right':
      return { dx: target.x + target.width - (bounds.x + bounds.width), dy: 0 };
    case 'top':
      return { dx: 0, dy: target.y - bounds.y };
    case 'middle':
      return {
        dx: 0,
        dy: target.y + target.height / 2 - (bounds.y + bounds.height / 2),
      };
    case 'bottom':
      return {
        dx: 0,
        dy: target.y + target.height - (bounds.y + bounds.height),
      };
  }
}

/**
 * One resize command that lines `ids` up on an edge or centre of their
 * combined bounds. With a single node it aligns to the parent frame, if
 * there is one. Returns null when nothing would move.
 */
export function alignCommand(
  doc: Document,
  ids: readonly string[],
  how: Alignment
): Command | null {
  const members = topmostOnly(
    doc,
    ids.filter((id) => doc.has(id))
  );
  if (!members.length) return null;
  let target = selectionBounds(doc, members)!;
  if (members.length === 1) {
    const parent = doc.require(members[0]).parent;
    if (parent === null || doc.require(parent).type !== 'frame') return null;
    target = rectOf(doc.require(parent));
  }
  const items: GeometryItem[] = [];
  for (const id of members) {
    const { dx, dy } = offset(nodeBounds(doc.require(id)), target, how);
    if (dx || dy) items.push(...shifted(doc, id, dx, dy));
  }
  return items.length
    ? command('resize', { items: items as unknown as Json[] })
    : null;
}

/** One resize command that spaces three or more nodes evenly between the outermost two. */
export function distributeCommand(
  doc: Document,
  ids: readonly string[],
  axis: Axis
): Command | null {
  const members = topmostOnly(
    doc,
    ids.filter((id) => doc.has(id))
  );
  if (members.length < 3) return null;
  const key = axis === 'horizontal' ? 'x' : 'y';
  const size = axis === 'horizontal' ? 'width' : 'height';
  const boxes = members
    .map((id) => ({ id, box: nodeBounds(doc.require(id)) }))
    .sort((a, b) => a.box[key] - b.box[key]);
  const first = boxes[0].box;
  const last = boxes[boxes.length - 1].box;
  const used = boxes.reduce((total, b) => total + b.box[size], 0);
  const gap = (last[key] + last[size] - first[key] - used) / (boxes.length - 1);
  const items: GeometryItem[] = [];
  let cursor = first[key] + first[size] + gap;
  for (const { id, box } of boxes.slice(1, -1)) {
    const delta = cursor - box[key];
    if (delta)
      items.push(
        ...shifted(doc, id, key === 'x' ? delta : 0, key === 'y' ? delta : 0)
      );
    cursor += box[size] + gap;
  }
  return items.length
    ? command('resize', { items: items as unknown as Json[] })
    : null;
}
