import type { Document } from '../model/document.ts';
import type { NodeType } from '../model/types.ts';
import { isContainer } from '../model/types.ts';

export interface LayerRow {
  id: string;
  name: string;
  type: NodeType;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  visible: boolean;
  locked: boolean;
  selected: boolean;
}

/**
 * The rows the layers panel lists, frontmost first: the last child in
 * paint order is the first row, and a container's children follow it when
 * it is expanded.
 */
export function buildRows(
  doc: Document,
  expanded: ReadonlySet<string>,
  selected: ReadonlySet<string>
): LayerRow[] {
  const rows: LayerRow[] = [];
  const add = (parent: string | null, depth: number) => {
    const ids = [...doc.children(parent)].reverse();
    for (const id of ids) {
      const node = doc.require(id);
      const container = isContainer(node);
      const open = container && expanded.has(id);
      rows.push({
        id,
        name: node.name,
        type: node.type,
        depth,
        hasChildren: container && node.children.length > 0,
        expanded: open,
        visible: node.visible,
        locked: node.locked,
        selected: selected.has(id),
      });
      if (open) add(id, depth + 1);
    }
  };
  add(null, 0);
  return rows;
}

export function rowIndex(rows: readonly LayerRow[], id: string): number {
  return rows.findIndex((row) => row.id === id);
}
