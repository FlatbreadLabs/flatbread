import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  boundsOfPoints,
  nodeBounds,
  normalizeRect,
  pointInNode,
  rectContainsRect,
  rectsIntersect,
  unionRects,
} from '../src/model/geometry.ts';
import {
  normalizeAngle,
  resizeRect,
  rotatePoint,
  rotatedCorners,
} from '../src/model/transform.ts';
import { createRect } from '../src/model/factory.ts';
import { createIdSource } from '../src/util/ids.ts';
import { close } from './helpers.ts';

const ids = createIdSource();

test('union and containment', () => {
  const u = unionRects([
    { x: 0, y: 0, width: 10, height: 10 },
    { x: 20, y: 5, width: 10, height: 10 },
  ]);
  assert.deepEqual(u, { x: 0, y: 0, width: 30, height: 15 });
  assert.ok(rectContainsRect(u, { x: 1, y: 1, width: 5, height: 5 }));
  assert.ok(!rectContainsRect(u, { x: 25, y: 10, width: 10, height: 10 }));
  assert.ok(rectsIntersect(u, { x: 25, y: 10, width: 10, height: 10 }));
});

test('normalizeRect accepts any two corners', () => {
  assert.deepEqual(normalizeRect({ x: 10, y: 10 }, { x: 0, y: 4 }), {
    x: 0,
    y: 4,
    width: 10,
    height: 6,
  });
});

test('rotation is stored in radians', () => {
  const node = createRect(ids, {
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    rotation: Math.PI / 2,
  });
  const b = nodeBounds(node);
  assert.ok(close(b.x, 40) && close(b.y, -40), JSON.stringify(b));
  assert.ok(close(b.width, 20) && close(b.height, 100), JSON.stringify(b));
});

test('rotatePoint turns clockwise in screen coordinates', () => {
  const p = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, Math.PI / 2);
  assert.ok(close(p.x, 0) && close(p.y, 10));
});

test('rotated corners keep the centre', () => {
  const node = createRect(ids, {
    x: 0,
    y: 0,
    width: 40,
    height: 40,
    rotation: Math.PI / 4,
  });
  const box = boundsOfPoints(rotatedCorners(node));
  assert.ok(close(box.x + box.width / 2, 20));
  assert.ok(close(box.width, 40 * Math.SQRT2));
});

test('pointInNode respects rotation', () => {
  const node = createRect(ids, {
    x: 0,
    y: 0,
    width: 100,
    height: 10,
    rotation: Math.PI / 2,
  });
  assert.ok(pointInNode(node, { x: 50, y: -40 }));
  assert.ok(!pointInNode(node, { x: 5, y: 5 }));
});

test('normalizeAngle maps into (-π, π]', () => {
  assert.ok(close(normalizeAngle(3 * Math.PI), Math.PI));
  assert.ok(close(normalizeAngle(-Math.PI / 2 - 2 * Math.PI), -Math.PI / 2));
  assert.equal(normalizeAngle(0), 0);
});

test('resizeRect keeps the opposite edge and a minimum size', () => {
  const r = { x: 10, y: 10, width: 100, height: 50 };
  assert.deepEqual(resizeRect(r, 'se', 20, 10), {
    x: 10,
    y: 10,
    width: 120,
    height: 60,
  });
  assert.deepEqual(resizeRect(r, 'nw', 20, 10), {
    x: 30,
    y: 20,
    width: 80,
    height: 40,
  });
  assert.deepEqual(resizeRect(r, 'w', 500, 0), {
    x: 109,
    y: 10,
    width: 1,
    height: 50,
  });
});
