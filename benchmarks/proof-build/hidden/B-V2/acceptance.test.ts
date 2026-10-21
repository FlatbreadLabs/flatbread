import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

type Editor = ReturnType<typeof createEditor>;
const box = (e: Editor, id: string) => {
  const n = e.doc.require(id);
  return [n.x, n.y, n.width, n.height];
};

function row() {
  const e = createEditor();
  const a = e.create('rect', { x: 0, y: 0, width: 50, height: 50 });
  const b = e.create('rect', { x: 100, y: 0, width: 50, height: 50 });
  const c = e.create('rect', { x: 200, y: 0, width: 50, height: 50 });
  e.selection.set([a, b, c]);
  return { e, a, b, c };
}

test('Scale selection scales sizes and positions about the centre of the selection', () => {
  const { e, a, b, c } = row();
  assert.ok(e.palette.run('Scale selection', '200'));
  assert.deepEqual(box(e, a), [-125, -25, 100, 100]);
  assert.deepEqual(box(e, b), [75, -25, 100, 100]);
  assert.deepEqual(box(e, c), [275, -25, 100, 100]);
});

test('a percent sign is fine, and smaller works too', () => {
  const { e, a, c } = row();
  e.palette.run('Scale selection', '50%');
  assert.deepEqual(box(e, a), [62.5, 12.5, 25, 25]);
  assert.deepEqual(box(e, c), [162.5, 12.5, 25, 25]);
});

test('a single layer scales about its own centre', () => {
  const e = createEditor();
  const r = e.create('rect', { x: 10, y: 20, width: 40, height: 20 });
  e.selection.set([r]);
  e.palette.run('Scale selection', '150');
  assert.deepEqual(box(e, r), [0, 15, 60, 30]);
});

test('what is inside a selected group or frame scales with it', () => {
  const e = createEditor();
  const f = e.create('frame', { x: 0, y: 0, width: 100, height: 100 });
  const inner = e.create(
    'rect',
    { x: 10, y: 10, width: 20, height: 20 },
    { parent: f }
  );
  const g = e.create('group');
  const g1 = e.create(
    'rect',
    { x: 200, y: 0, width: 20, height: 20 },
    { parent: g }
  );
  const g2 = e.create(
    'rect',
    { x: 280, y: 80, width: 20, height: 20 },
    { parent: g }
  );
  e.selection.set([f, g]);
  e.palette.run('Scale selection', '200');
  // The selection spans x 0..300, y 0..100: centre (150, 50).
  assert.deepEqual(box(e, f), [-150, -50, 200, 200]);
  assert.deepEqual(box(e, inner), [-130, -30, 40, 40]);
  assert.deepEqual(box(e, g1), [250, -50, 40, 40]);
  assert.deepEqual(box(e, g2), [410, 110, 40, 40]);
  assert.deepEqual(box(e, g), [250, -50, 200, 200]);
});

test('it is one step to undo', () => {
  const { e, a, b, c } = row();
  e.palette.run('Scale selection', '300');
  assert.ok(e.history.undo());
  assert.deepEqual(
    [a, b, c].map((id) => box(e, id)),
    [
      [0, 0, 50, 50],
      [100, 0, 50, 50],
      [200, 0, 50, 50],
    ]
  );
});

test('anything but a positive number is refused', () => {
  const { e, a } = row();
  for (const bad of ['abc', '0', '-50', ''])
    e.palette.run('Scale selection', bad);
  e.palette.run('Scale selection');
  assert.deepEqual(box(e, a), [0, 0, 50, 50]);
  assert.equal(e.history.size, 0);
});

test('it is offered only with a selection', () => {
  const e = createEditor();
  e.create('rect');
  assert.ok(!e.palette.list().includes('Scale selection'));
});
