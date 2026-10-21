import type { Document } from '../model/document.ts';
import { ancestors, topmostOnly } from '../model/tree.ts';

/** A node can be hit or selected on the canvas when it and every ancestor are visible and unlocked. */
export function isInteractive(doc: Document, id: string): boolean {
  const node = doc.require(id);
  if (!node.visible || node.locked) return false;
  return ancestors(doc, id).every((a) => a.visible && !a.locked);
}

/**
 * What a canvas click on `id` selects. A click inside a group selects the
 * outermost group around it, up to the nearest frame; a frame's children
 * are selected directly.
 */
export function selectableTarget(doc: Document, id: string): string {
  let target = id;
  for (const ancestor of ancestors(doc, id)) {
    if (ancestor.type === 'frame') break;
    if (ancestor.type === 'group') target = ancestor.id;
  }
  return target;
}

/** A selection never holds both a node and one of its ancestors. */
export function normalizeSelection(
  doc: Document,
  ids: Iterable<string>
): string[] {
  const present = [...ids].filter((id) => doc.has(id));
  const keep = new Set(topmostOnly(doc, present));
  return present.filter((id) => keep.has(id));
}
