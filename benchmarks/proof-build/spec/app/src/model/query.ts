import type { Document } from './document.ts';
import type { NodeType, SceneNode } from './types.ts';
import { isContainer } from './types.ts';

/** Visits every node depth first in paint order. Return false to skip a subtree. */
export function walk(
  doc: Document,
  visit: (node: SceneNode, depth: number) => boolean | void
): void {
  const step = (parent: string | null, depth: number) => {
    for (const id of doc.children(parent)) {
      const node = doc.require(id);
      if (visit(node, depth) === false) continue;
      if (isContainer(node)) step(id, depth + 1);
    }
  };
  step(null, 0);
}

export function byType(doc: Document, type: NodeType): SceneNode[] {
  const out: SceneNode[] = [];
  walk(doc, (node) => {
    if (node.type === type) out.push(node);
  });
  return out;
}

export function findByName(doc: Document, name: string): SceneNode | undefined {
  let found: SceneNode | undefined;
  walk(doc, (node) => {
    if (!found && node.name === name) found = node;
    return !found;
  });
  return found;
}

/** Nodes that are visible themselves and under visible ancestors. */
export function visibleNodes(doc: Document): SceneNode[] {
  const out: SceneNode[] = [];
  walk(doc, (node) => {
    if (!node.visible) return false;
    out.push(node);
  });
  return out;
}

export function countByType(doc: Document): Record<NodeType, number> {
  const counts = { frame: 0, rect: 0, ellipse: 0, line: 0, text: 0, group: 0 };
  walk(doc, (node) => {
    counts[node.type] += 1;
  });
  return counts;
}
