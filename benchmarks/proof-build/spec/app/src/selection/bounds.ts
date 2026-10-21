import type { Document } from '../model/document.ts';
import type { Point, Rect } from '../model/geometry.ts';
import { centre, nodeBounds, unionRects } from '../model/geometry.ts';

/** The box around every selected node, rotation included; null when empty. */
export function selectionBounds(
  doc: Document,
  ids: readonly string[]
): Rect | null {
  const present = ids.filter((id) => doc.has(id));
  if (!present.length) return null;
  return unionRects(present.map((id) => nodeBounds(doc.require(id))));
}

export function selectionCentre(
  doc: Document,
  ids: readonly string[]
): Point | null {
  const bounds = selectionBounds(doc, ids);
  return bounds ? centre(bounds) : null;
}
