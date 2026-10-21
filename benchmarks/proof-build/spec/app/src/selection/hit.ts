import type { Document } from '../model/document.ts';
import type { Point } from '../model/geometry.ts';
import { pointInNode } from '../model/geometry.ts';
import { paintOrder } from '../model/tree.ts';
import { isInteractive, selectableTarget } from './rules.ts';

/**
 * The frontmost node under `point`. Hidden and locked nodes are never hit
 * or selected from the canvas, and neither is anything inside a hidden or
 * locked container. Groups are never hit themselves, only through a child.
 */
export function hitNode(doc: Document, point: Point): string | null {
  const order = paintOrder(doc);
  const ids = [...order.keys()].reverse();
  for (const id of ids) {
    const node = doc.require(id);
    if (node.type === 'group') continue;
    if (!isInteractive(doc, id)) continue;
    if (pointInNode(node, point)) return id;
  }
  return null;
}

/** What a click at `point` selects, or null for empty canvas. */
export function hitTarget(doc: Document, point: Point): string | null {
  const id = hitNode(doc, point);
  return id === null ? null : selectableTarget(doc, id);
}
