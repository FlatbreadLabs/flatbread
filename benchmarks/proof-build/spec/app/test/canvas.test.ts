import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editor, threeRects, close } from './helpers.ts';

test('a click selects; a click on empty canvas clears', () => {
  const { e, b } = threeRects();
  e.canvas.click({ x: 120, y: 20 });
  assert.deepEqual(e.selection.ids(), [b]);
  e.canvas.click({ x: 500, y: 500 });
  assert.deepEqual(e.selection.ids(), []);
});

test('shift-click adds and removes', () => {
  const { e, a, c } = threeRects();
  e.canvas.click({ x: 10, y: 10 });
  e.canvas.click({ x: 210, y: 10 }, { shift: true });
  assert.deepEqual(e.selection.ids(), [a, c]);
  e.canvas.click({ x: 10, y: 10 }, { shift: true });
  assert.deepEqual(e.selection.ids(), [c]);
});

test('locked layers are not selected by a click', () => {
  const { e, a } = threeRects();
  e.doc.update(a, { locked: true });
  e.canvas.click({ x: 10, y: 10 });
  assert.deepEqual(e.selection.ids(), []);
});

test('dragging a layer moves it, and undo puts it back', () => {
  const { e, a } = threeRects();
  e.canvas.drag({ x: 10, y: 10 }, { x: 50, y: 30 });
  assert.deepEqual([e.doc.require(a).x, e.doc.require(a).y], [40, 20]);
  assert.equal(e.history.size, 1);
  e.history.undo();
  assert.deepEqual([e.doc.require(a).x, e.doc.require(a).y], [0, 0]);
});

test('dragging one of several selected layers moves them all', () => {
  const { e, a, b } = threeRects();
  e.selection.set([a, b]);
  e.canvas.drag({ x: 110, y: 10 }, { x: 120, y: 10 });
  assert.equal(e.doc.require(a).x, 10);
  assert.equal(e.doc.require(b).x, 110);
});

test('the corner handle resizes a single selection', () => {
  const { e, a } = threeRects();
  e.selection.set([a]);
  e.canvas.drag({ x: 50, y: 50 }, { x: 80, y: 70 });
  const node = e.doc.require(a);
  assert.deepEqual([node.width, node.height], [80, 70]);
  assert.equal(e.history.size, 1);
});

test('the rotation handle rotates about the centre', () => {
  const e = editor();
  const id = e.create('rect', { x: 0, y: 0, width: 100, height: 100 });
  e.selection.set([id]);
  // The handle sits 24 px above the top centre; drag it round to the right.
  e.canvas.drag({ x: 50, y: -24 }, { x: 150, y: 50 });
  assert.ok(
    close(e.doc.require(id).rotation, Math.PI / 2),
    String(e.doc.require(id).rotation)
  );
  assert.equal(e.panel.value('Rotation'), '90°');
  assert.equal(e.history.size, 1);
});

test('zoom changes how screen points map', () => {
  const { e, c } = threeRects();
  e.canvas.setZoom(2);
  e.canvas.click({ x: 420, y: 20 });
  assert.deepEqual(e.selection.ids(), [c]);
  assert.equal(e.canvas.zoom, 2);
});
