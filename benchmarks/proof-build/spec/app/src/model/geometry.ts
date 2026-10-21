import type { BaseNode, SceneNode } from './types.ts';
import { rotatedCorners } from './transform.ts';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const EMPTY_RECT: Rect = Object.freeze({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
});

export function rectOf(
  node: Pick<BaseNode, 'x' | 'y' | 'width' | 'height'>
): Rect {
  return { x: node.x, y: node.y, width: node.width, height: node.height };
}

export function centre(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** The axis-aligned box around a node, rotation included. */
export function nodeBounds(node: SceneNode): Rect {
  if (!node.rotation || node.type === 'group') return rectOf(node);
  return boundsOfPoints(rotatedCorners(node));
}

export function boundsOfPoints(points: readonly Point[]): Rect {
  if (!points.length) return { ...EMPTY_RECT };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function unionRects(rects: readonly Rect[]): Rect {
  if (!rects.length) return { ...EMPTY_RECT };
  return boundsOfPoints(
    rects.flatMap((r) => [
      { x: r.x, y: r.y },
      { x: r.x + r.width, y: r.y + r.height },
    ])
  );
}

export function rectContainsPoint(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function rectContainsRect(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width &&
    b.x <= a.x + a.width &&
    a.y <= b.y + b.height &&
    b.y <= a.y + a.height
  );
}

/** Normalises a rect drawn from any corner to positive width and height. */
export function normalizeRect(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

/** True when `point` is inside the node's own (possibly rotated) shape box. */
export function pointInNode(node: SceneNode, point: Point): boolean {
  if (!node.rotation || node.type === 'group')
    return rectContainsPoint(rectOf(node), point);
  const c = centre(rectOf(node));
  const cos = Math.cos(-node.rotation);
  const sin = Math.sin(-node.rotation);
  const dx = point.x - c.x;
  const dy = point.y - c.y;
  const local = { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
  return rectContainsPoint(rectOf(node), local);
}

/** The bounds a group takes from its children; an empty group keeps its own. */
export function fitGroup(children: readonly SceneNode[], group: Rect): Rect {
  if (!children.length) return rectOf(group);
  return unionRects(children.map(nodeBounds));
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
