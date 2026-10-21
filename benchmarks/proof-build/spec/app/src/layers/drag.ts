import type { Document } from '../model/document.ts';
import { isAncestor } from '../model/tree.ts';
import { isContainer } from '../model/types.ts';

/** Where a dragged row lands relative to the row under the pointer. */
export type DropPosition = 'above' | 'below' | 'inside';

export interface Placement {
  parent: string | null;
  /** Index in the parent's child list, back to front. */
  index: number;
}

/**
 * Turns a drop on the layers list into a place in the tree. The list shows
 * siblings frontmost first, so a row dropped above another goes in front of
 * it, which is the next index up in paint order. Returns null for a drop
 * that would put a node inside itself.
 */
export function dropPlacement(
  doc: Document,
  dragged: string,
  target: string,
  position: DropPosition
): Placement | null {
  if (dragged === target || isAncestor(doc, dragged, target)) return null;
  const targetNode = doc.require(target);
  if (position === 'inside') {
    if (!isContainer(targetNode)) return null;
    const kids = doc.children(target).filter((id) => id !== dragged);
    return { parent: target, index: kids.length };
  }
  const parent = targetNode.parent;
  const siblings = doc.children(parent).filter((id) => id !== dragged);
  const at = siblings.indexOf(target);
  return { parent, index: position === 'above' ? at + 1 : at };
}
