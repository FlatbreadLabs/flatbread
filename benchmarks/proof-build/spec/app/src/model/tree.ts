import type { Document } from './document.ts';
import type { SceneNode } from './types.ts';
import { isContainer } from './types.ts';

/** Ancestors of `id`, nearest first. */
export function ancestors(doc: Document, id: string): SceneNode[] {
  const out: SceneNode[] = [];
  let cursor = doc.require(id).parent;
  while (cursor !== null) {
    const node = doc.require(cursor);
    out.push(node);
    cursor = node.parent;
  }
  return out;
}

/** Every descendant of `id`, depth first, back to front at each level. */
export function descendants(doc: Document, id: string): SceneNode[] {
  const out: SceneNode[] = [];
  const walk = (parent: string) => {
    for (const child of doc.children(parent)) {
      const node = doc.require(child);
      out.push(node);
      if (isContainer(node)) walk(child);
    }
  };
  walk(id);
  return out;
}

export function isAncestor(
  doc: Document,
  maybeAncestor: string,
  id: string
): boolean {
  return ancestors(doc, id).some((node) => node.id === maybeAncestor);
}

export function depth(doc: Document, id: string): number {
  return ancestors(doc, id).length;
}

export function indexInParent(doc: Document, id: string): number {
  const node = doc.require(id);
  return doc.children(node.parent).indexOf(id);
}

/**
 * The position of every node in paint order (back to front, depth first).
 * Lower numbers paint first.
 */
export function paintOrder(doc: Document): Map<string, number> {
  const order = new Map<string, number>();
  const walk = (parent: string | null) => {
    for (const child of doc.children(parent)) {
      order.set(child, order.size);
      const node = doc.require(child);
      if (isContainer(node)) walk(child);
    }
  };
  walk(null);
  return order;
}

/** Sorts ids into paint order, back to front. */
export function sortByPaintOrder(
  doc: Document,
  ids: Iterable<string>
): string[] {
  const order = paintOrder(doc);
  return [...ids].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}

/** Drops every id whose ancestor is also in `ids`. */
export function topmostOnly(doc: Document, ids: Iterable<string>): string[] {
  const set = new Set(ids);
  return [...set].filter(
    (id) => !ancestors(doc, id).some((a) => set.has(a.id))
  );
}

/** The deepest container that holds every id, or null for the page. */
export function commonParent(
  doc: Document,
  ids: readonly string[]
): string | null {
  if (!ids.length) return null;
  const chains = ids.map((id) =>
    ancestors(doc, id)
      .map((n) => n.id)
      .reverse()
  );
  let parent: string | null = null;
  for (let i = 0; ; i++) {
    const candidate = chains[0][i];
    if (
      candidate === undefined ||
      chains.some((chain) => chain[i] !== candidate)
    )
      return parent;
    parent = candidate;
  }
}
