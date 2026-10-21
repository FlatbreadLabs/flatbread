import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

type Editor = ReturnType<typeof createEditor>;
const sel = (e: Editor) => [...e.selection.ids()].sort();
const sorted = (ids: string[]) => [...ids].sort();

function row() {
  const e = createEditor();
  const a = e.create('rect', { name: 'A', x: 0, y: 0, width: 50, height: 50 });
  const b = e.create('rect', {
    name: 'B',
    x: 100,
    y: 0,
    width: 50,
    height: 50,
  });
  const c = e.create('rect', {
    name: 'C',
    x: 200,
    y: 0,
    width: 50,
    height: 50,
  });
  return { e, a, b, c };
}

test('dragging on empty canvas selects every layer fully inside the box', () => {
  const { e, a, b } = row();
  e.canvas.drag({ x: -10, y: -10 }, { x: 160, y: 60 });
  assert.deepEqual(sel(e), sorted([a, b]));
});

test('the box works whichever way it is drawn', () => {
  const { e, b, c } = row();
  e.canvas.drag({ x: 260, y: 70 }, { x: 90, y: -5 });
  assert.deepEqual(sel(e), sorted([b, c]));
});

test('a layer only partly inside the box is not selected', () => {
  const { e, a } = row();
  e.canvas.drag({ x: -10, y: -10 }, { x: 120, y: 60 });
  assert.deepEqual(sel(e), [a]);
});

test('a group the box covers is selected whole; one it partly covers gives up its covered layers', () => {
  const e = createEditor();
  const g = e.create('group', { name: 'G' });
  const g1 = e.create(
    'rect',
    { x: 0, y: 0, width: 40, height: 40 },
    { parent: g }
  );
  const g2 = e.create(
    'rect',
    { x: 60, y: 0, width: 40, height: 40 },
    { parent: g }
  );
  e.canvas.drag({ x: -5, y: -5 }, { x: 110, y: 50 });
  assert.deepEqual(sel(e), [g]);
  e.canvas.drag({ x: -5, y: -5 }, { x: 50, y: 50 });
  assert.deepEqual(sel(e), [g1]);
  assert.ok(!e.selection.has(g2));
});

test('inside a frame the box reaches the layers it covers', () => {
  const e = createEditor();
  const f = e.create('frame', { x: 50, y: 50, width: 400, height: 300 });
  const r1 = e.create(
    'rect',
    { x: 70, y: 70, width: 40, height: 40 },
    { parent: f }
  );
  const r2 = e.create(
    'rect',
    { x: 130, y: 70, width: 40, height: 40 },
    { parent: f }
  );
  e.create('rect', { x: 350, y: 250, width: 40, height: 40 }, { parent: f });
  e.canvas.drag({ x: 0, y: 0 }, { x: 180, y: 120 });
  assert.deepEqual(sel(e), sorted([r1, r2]));
  e.canvas.drag({ x: 0, y: 0 }, { x: 460, y: 360 });
  assert.deepEqual(sel(e), [f]);
});

test('Shift adds the boxed layers to the selection', () => {
  const { e, a, c } = row();
  e.selection.set([c]);
  e.canvas.drag({ x: -10, y: -10 }, { x: 60, y: 60 }, { shift: true });
  assert.deepEqual(sel(e), sorted([a, c]));
});

test('without Shift the box replaces the selection', () => {
  const { e, a, c } = row();
  e.selection.set([c]);
  e.canvas.drag({ x: -10, y: -10 }, { x: 60, y: 60 });
  assert.deepEqual(sel(e), [a]);
});

test('the box moves nothing and is not an edit', () => {
  const { e, a, b, c } = row();
  e.canvas.drag({ x: -10, y: -10 }, { x: 260, y: 60 });
  assert.deepEqual(sel(e), sorted([a, b, c]));
  assert.equal(e.history.size, 0);
  assert.deepEqual(
    [a, b, c].map((id) => e.doc.require(id).x),
    [0, 100, 200]
  );
});

test('a click on empty canvas still clears, and dragging a layer still moves it', () => {
  const { e, a, b } = row();
  e.selection.set([a, b]);
  e.canvas.click({ x: 500, y: 500 });
  assert.deepEqual(sel(e), []);
  e.canvas.drag({ x: 10, y: 10 }, { x: 30, y: 10 });
  assert.equal(e.doc.require(a).x, 20);
});
