import type { BaseNode } from './types.ts';
import type { Point, Rect } from './geometry.ts';

const TAU = Math.PI * 2;

/** Maps any angle in radians into (-π, π]. */
export function normalizeAngle(radians: number): number {
  let a = radians % TAU;
  if (a <= -Math.PI) a += TAU;
  if (a > Math.PI) a -= TAU;
  return Object.is(a, -0) ? 0 : a;
}

export function rotatePoint(
  point: Point,
  about: Point,
  radians: number
): Point {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - about.x;
  const dy = point.y - about.y;
  return { x: about.x + dx * cos - dy * sin, y: about.y + dx * sin + dy * cos };
}

/** The four corners of a node after its rotation, clockwise from top left. */
export function rotatedCorners(
  node: Pick<BaseNode, 'x' | 'y' | 'width' | 'height' | 'rotation'>
): Point[] {
  const c = { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  const corners = [
    { x: node.x, y: node.y },
    { x: node.x + node.width, y: node.y },
    { x: node.x + node.width, y: node.y + node.height },
    { x: node.x, y: node.y + node.height },
  ];
  return node.rotation
    ? corners.map((p) => rotatePoint(p, c, node.rotation))
    : corners;
}

/** The angle of `point` around `about`, in radians, 0 pointing right. */
export function angleAround(about: Point, point: Point): number {
  return Math.atan2(point.y - about.y, point.x - about.x);
}

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/**
 * The rect after dragging `handle` by (dx, dy), unrotated. Width and height
 * never go below `min`; the opposite edge stays put.
 */
export function resizeRect(
  rect: Rect,
  handle: Handle,
  dx: number,
  dy: number,
  min = 1
): Rect {
  let { x, y, width, height } = rect;
  if (handle.includes('e')) width = Math.max(min, width + dx);
  if (handle.includes('s')) height = Math.max(min, height + dy);
  if (handle.includes('w')) {
    const next = Math.max(min, width - dx);
    x += width - next;
    width = next;
  }
  if (handle.includes('n')) {
    const next = Math.max(min, height - dy);
    y += height - next;
    height = next;
  }
  return { x, y, width, height };
}

export function translateRect(rect: Rect, dx: number, dy: number): Rect {
  return { ...rect, x: rect.x + dx, y: rect.y + dy };
}
