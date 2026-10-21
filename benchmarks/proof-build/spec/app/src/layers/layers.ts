import type { EditorContext } from '../commands/types.ts';
import { command } from '../commands/types.ts';
import { ancestors } from '../model/tree.ts';
import { isContainer } from '../model/types.ts';
import type { LayerRow } from './tree-view.ts';
import { buildRows, rowIndex } from './tree-view.ts';
import type { DropPosition } from './drag.ts';
import { dropPlacement } from './drag.ts';
import { normalizeLayerName } from './rename.ts';

export interface RowClick {
  /** Toggle this row in the selection. */
  mod?: boolean;
  /** Select every row from the last clicked one to this one. */
  shift?: boolean;
}

/** The layers panel: rows, expand and collapse, selection, rename, drag. */
export class LayersPanel {
  private ctx: EditorContext;
  private expanded = new Set<string>();
  private anchor: string | null = null;

  constructor(ctx: EditorContext) {
    this.ctx = ctx;
  }

  view(): LayerRow[] {
    this.expanded = new Set(
      [...this.expanded].filter((id) => this.ctx.doc.has(id))
    );
    return buildRows(
      this.ctx.doc,
      this.expanded,
      new Set(this.ctx.selection.ids())
    );
  }

  isExpanded(id: string): boolean {
    return this.expanded.has(id);
  }

  expand(id: string): void {
    if (isContainer(this.ctx.doc.require(id))) this.expanded.add(id);
  }

  collapse(id: string): void {
    this.expanded.delete(id);
  }

  toggle(id: string): void {
    if (this.expanded.has(id)) this.collapse(id);
    else this.expand(id);
  }

  /** Expands every ancestor of `id`, so its row is listed. */
  reveal(id: string): void {
    for (const a of ancestors(this.ctx.doc, id)) this.expanded.add(a.id);
  }

  click(id: string, how: RowClick = {}): void {
    const { selection } = this.ctx;
    if (how.shift && this.anchor) {
      const rows = this.view();
      const [from, to] = [rowIndex(rows, this.anchor), rowIndex(rows, id)].sort(
        (a, b) => a - b
      );
      if (from >= 0) {
        selection.set(rows.slice(from, to + 1).map((row) => row.id));
        return;
      }
    }
    if (how.mod) selection.toggle(id);
    else selection.set([id]);
    this.anchor = id;
  }

  rename(id: string, name: string): boolean {
    const clean = normalizeLayerName(name);
    if (clean === null || clean === this.ctx.doc.require(id).name) return false;
    this.ctx.dispatch(command('rename', { id, name: clean }), {
      label: 'Rename layer',
    });
    return true;
  }

  /** Drops `id` above, below or inside the row `target`. Returns false when it cannot. */
  drag(id: string, target: string, position: DropPosition): boolean {
    const placement = dropPlacement(this.ctx.doc, id, target, position);
    if (!placement) return false;
    this.ctx.dispatch(
      command('reorder', {
        id,
        parent: placement.parent,
        index: placement.index,
      }),
      {
        label: 'Move layer',
      }
    );
    if (position === 'inside') this.expanded.add(target);
    return true;
  }
}
