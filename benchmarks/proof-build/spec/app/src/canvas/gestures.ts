import type { EditorContext, Json } from '../commands/types.ts';
import { command } from '../commands/types.ts';
import { scaledSubtree } from '../commands/builtin/resize.ts';
import type { Point, Rect } from '../model/geometry.ts';
import { centre, rectOf } from '../model/geometry.ts';
import type { Handle } from '../model/transform.ts';
import { angleAround, normalizeAngle, resizeRect } from '../model/transform.ts';
import { hitTarget } from '../selection/hit.ts';
import { selectionBounds } from '../selection/bounds.ts';
import type { Viewport } from './viewport.ts';
import { handleAt } from './handles.ts';

export interface Modifiers {
  shift?: boolean;
  alt?: boolean;
  mod?: boolean;
}

type Drag =
  | { kind: 'none' }
  | { kind: 'move'; gesture: string; last: Point }
  | {
      kind: 'resize';
      gesture: string;
      id: string;
      handle: Handle;
      start: Point;
      from: Rect;
    }
  | {
      kind: 'rotate';
      gesture: string;
      centre: Point;
      startAngle: number;
      from: Map<string, number>;
    };

/** Pointer gestures on the canvas: click to select, drag to move, handles to resize and rotate. */
export class CanvasGestures {
  private drag: Drag = { kind: 'none' };
  private ctx: EditorContext;
  private viewport: Viewport;

  constructor(ctx: EditorContext, viewport: Viewport) {
    this.ctx = ctx;
    this.viewport = viewport;
  }

  get active(): string {
    return this.drag.kind;
  }

  down(screen: Point, mods: Modifiers = {}): void {
    const { doc, selection } = this.ctx;
    const p = this.viewport.toDocument(screen);
    const bounds = selectionBounds(doc, selection.ids());
    const handle = bounds ? handleAt(bounds, p, this.viewport.zoom) : null;
    if (bounds && handle?.kind === 'rotate') {
      const from = new Map(
        selection.ids().map((id) => [id, doc.require(id).rotation])
      );
      const c = centre(bounds);
      this.drag = {
        kind: 'rotate',
        gesture: this.ctx.newGesture(),
        centre: c,
        startAngle: angleAround(c, p),
        from,
      };
      return;
    }
    if (handle?.kind === 'resize' && selection.size === 1) {
      const id = selection.ids()[0];
      this.drag = {
        kind: 'resize',
        gesture: this.ctx.newGesture(),
        id,
        handle: handle.handle,
        start: p,
        from: rectOf(doc.require(id)),
      };
      return;
    }
    const target = hitTarget(doc, p);
    if (target === null) {
      if (!mods.shift) selection.clear();
      this.drag = { kind: 'none' };
      return;
    }
    if (mods.shift) {
      selection.toggle(target);
      this.drag = { kind: 'none' };
      return;
    }
    if (!selection.has(target)) selection.set([target]);
    this.drag = { kind: 'move', gesture: this.ctx.newGesture(), last: p };
  }

  move(screen: Point, _mods: Modifiers = {}): void {
    const p = this.viewport.toDocument(screen);
    const drag = this.drag;
    if (drag.kind === 'move') {
      const dx = p.x - drag.last.x;
      const dy = p.y - drag.last.y;
      if (!dx && !dy) return;
      drag.last = p;
      this.ctx.dispatch(
        command('move', { ids: this.ctx.selection.ids(), dx, dy }),
        { gesture: drag.gesture }
      );
    } else if (drag.kind === 'resize') {
      const next = resizeRect(
        drag.from,
        drag.handle,
        p.x - drag.start.x,
        p.y - drag.start.y
      );
      const items = scaledSubtree(this.ctx.doc, drag.id, next);
      this.ctx.dispatch(
        command('resize', { items: items as unknown as Json[] }),
        { gesture: drag.gesture }
      );
    } else if (drag.kind === 'rotate') {
      const delta = angleAround(drag.centre, p) - drag.startAngle;
      for (const [id, start] of drag.from)
        this.ctx.dispatch(
          command('set-prop', {
            id,
            key: 'rotation',
            value: normalizeAngle(start + delta),
          }),
          {
            label: 'Rotate',
            gesture: drag.gesture,
          }
        );
    }
  }

  up(screen: Point, mods: Modifiers = {}): void {
    if (this.drag.kind !== 'none') this.move(screen, mods);
    this.drag = { kind: 'none' };
  }

  click(screen: Point, mods: Modifiers = {}): void {
    this.down(screen, mods);
    this.up(screen, mods);
  }

  /** A drag from `from` to `to` in `steps` pointer moves. */
  dragPath(from: Point, to: Point, mods: Modifiers = {}, steps = 4): void {
    this.down(from, mods);
    for (let i = 1; i <= steps; i++)
      this.move(
        {
          x: from.x + ((to.x - from.x) * i) / steps,
          y: from.y + ((to.y - from.y) * i) / steps,
        },
        mods
      );
    this.up(to, mods);
  }
}
