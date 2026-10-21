import type { Point, Rect } from '../model/geometry.ts';
import { distance } from '../model/geometry.ts';
import type { Handle } from '../model/transform.ts';

/** Screen pixels between the top edge and the rotation handle. */
export const ROTATE_OFFSET = 24;
/** Screen pixels within which a handle is hit. */
export const HANDLE_RADIUS = 6;

export type HandleHit = { kind: 'rotate' } | { kind: 'resize'; handle: Handle };

export function handlePoints(bounds: Rect): Record<Handle, Point> {
  const { x, y, width: w, height: h } = bounds;
  return {
    nw: { x, y },
    n: { x: x + w / 2, y },
    ne: { x: x + w, y },
    e: { x: x + w, y: y + h / 2 },
    se: { x: x + w, y: y + h },
    s: { x: x + w / 2, y: y + h },
    sw: { x, y: y + h },
    w: { x, y: y + h / 2 },
  };
}

export function rotateHandle(bounds: Rect, zoom: number): Point {
  return { x: bounds.x + bounds.width / 2, y: bounds.y - ROTATE_OFFSET / zoom };
}

/** The handle of `bounds` under `point` (document coordinates), if any. */
export function handleAt(
  bounds: Rect,
  point: Point,
  zoom: number
): HandleHit | null {
  const radius = HANDLE_RADIUS / zoom;
  if (distance(rotateHandle(bounds, zoom), point) <= radius)
    return { kind: 'rotate' };
  for (const [handle, at] of Object.entries(handlePoints(bounds)) as [
    Handle,
    Point
  ][])
    if (distance(at, point) <= radius) return { kind: 'resize', handle };
  return null;
}
