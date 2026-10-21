import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

type Editor = ReturnType<typeof createEditor>;
const xs = (e: Editor, ids: string[]) => ids.map((id) => e.doc.require(id).x);
const ys = (e: Editor, ids: string[]) => ids.map((id) => e.doc.require(id).y);

function row() {
  const e = createEditor();
  const a = e.create('rect', { x: 0, y: 0, width: 50, height: 50 });
  const b = e.create('rect', { x: 100, y: 0, width: 30, height: 50 });
  const c = e.create('rect', { x: 300, y: 0, width: 50, height: 50 });
  return { e, a, b, c };
}

test('Distribute horizontally with a gap lays the layers out from the leftmost', () => {
  const { e, a, b, c } = row();
  e.selection.set([c, a, b]);
  assert.ok(e.palette.run('Distribute horizontally', '20'));
  assert.deepEqual(xs(e, [a, b, c]), [0, 70, 120]);
});

test('the order comes from the layers’ positions, not the selection', () => {
  const { e, a, b, c } = row();
  e.doc.update(b, { x: 400 });
  e.selection.set([b, a, c]);
  e.palette.run('Distribute horizontally', '10');
  assert.deepEqual(xs(e, [a, c, b]), [0, 60, 120]);
});

test('Distribute vertically with a gap lays them out from the topmost', () => {
  const e = createEditor();
  const p = e.create('rect', { x: 0, y: 10, width: 50, height: 40 });
  const q = e.create('rect', { x: 0, y: 500, width: 50, height: 10 });
  const r = e.create('rect', { x: 0, y: 90, width: 50, height: 20 });
  e.selection.set([p, q, r]);
  e.palette.run('Distribute vertically', '5');
  assert.deepEqual(ys(e, [p, r, q]), [10, 55, 80]);
});

test('a gap of 0 puts them edge to edge', () => {
  const { e, a, b, c } = row();
  e.selection.set([a, b, c]);
  e.palette.run('Distribute horizontally', '0');
  assert.deepEqual(xs(e, [a, b, c]), [0, 50, 80]);
  e.palette.run('Distribute horizontally', '16');
  assert.deepEqual(xs(e, [a, b, c]), [0, 66, 112]);
});

test('layers inside a group move with it', () => {
  const e = createEditor();
  const a = e.create('rect', { x: 0, y: 0, width: 50, height: 50 });
  const g = e.create('group');
  const inner = e.create(
    'rect',
    { x: 200, y: 0, width: 40, height: 50 },
    { parent: g }
  );
  const c = e.create('rect', { x: 500, y: 0, width: 50, height: 50 });
  e.selection.set([a, g, c]);
  e.palette.run('Distribute horizontally', '10');
  assert.deepEqual(xs(e, [a, inner, c]), [0, 60, 110]);
});

test('a gap is one step to undo', () => {
  const { e, a, b, c } = row();
  e.selection.set([a, b, c]);
  e.palette.run('Distribute horizontally', '20');
  e.history.undo();
  assert.deepEqual(xs(e, [a, b, c]), [0, 100, 300]);
});

test('text that is not a number is refused', () => {
  const { e, a, b, c } = row();
  e.selection.set([a, b, c]);
  e.palette.run('Distribute horizontally', 'wide');
  assert.deepEqual(xs(e, [a, b, c]), [0, 100, 300]);
  assert.equal(e.history.size, 0);
});
