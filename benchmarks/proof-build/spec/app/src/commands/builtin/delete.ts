import type { Document } from '../../model/document.ts';
import type { SceneNode } from '../../model/types.ts';
import { isContainer } from '../../model/types.ts';
import {
  indexInParent,
  sortByPaintOrder,
  topmostOnly,
} from '../../model/tree.ts';
import type { CommandHandler, Json } from '../types.ts';
import { command } from '../types.ts';

/** A removed subtree: its nodes (root first), where the root sat, and at which index. */
export interface Placement {
  nodes: SceneNode[];
  parent: string | null;
  index: number;
}

/** Inserts a subtree. Children lists are rebuilt from the nodes' order. */
export function insertSubtree(doc: Document, placement: Placement): string {
  const [root] = placement.nodes;
  const strip = (node: SceneNode): SceneNode =>
    isContainer(node) ? ({ ...node, children: [] } as SceneNode) : { ...node };
  doc.insert(strip(root), placement.parent, placement.index);
  const order = new Map(placement.nodes.map((n) => [n.id, n]));
  const add = (parent: SceneNode) => {
    if (!isContainer(parent)) return;
    for (const child of parent.children) {
      const node = order.get(child);
      if (!node) continue;
      doc.insert(strip(node), parent.id);
      add(node);
    }
  };
  add(root);
  return root.id;
}

export const insertHandler: CommandHandler = {
  type: 'insert',
  label: 'Insert',
  apply({ doc }, payload) {
    const placement = payload as unknown as Placement;
    const id = insertSubtree(doc, placement);
    return command('delete', { ids: [id] });
  },
};

export const deleteHandler: CommandHandler = {
  type: 'delete',
  label: 'Delete',
  apply({ doc }, payload) {
    const ids = topmostOnly(
      doc,
      (payload.ids as string[]).filter((id) => doc.has(id))
    );
    // Remove front to back so the saved indexes stay valid when restored back to front.
    const ordered = sortByPaintOrder(doc, ids).reverse();
    const items: Placement[] = [];
    for (const id of ordered) {
      const node = doc.require(id);
      const parent = node.parent;
      const index = indexInParent(doc, id);
      const nodes = structuredClone(doc.remove(id));
      items.push({ nodes, parent, index });
    }
    return command('restore', { items: items.reverse() as unknown as Json[] });
  },
};

export const restoreHandler: CommandHandler = {
  type: 'restore',
  label: 'Restore',
  apply({ doc }, payload) {
    const items = payload.items as unknown as Placement[];
    const ids = items.map((item) => insertSubtree(doc, structuredClone(item)));
    return command('delete', { ids });
  },
};
