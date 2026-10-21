import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

type Editor = ReturnType<typeof createEditor>;
const sel = (e: Editor) => [...e.selection.ids()].sort();
const sorted = (ids: string[]) => [...ids].sort();
const pos = (e: Editor, id: string) => [
  e.doc.require(id).x,
  e.doc.require(id).y,
];

function grouped() {
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
  e.selection.set([a, c]);
  e.palette.run('Group selection');
  const [g] = e.selection.ids();
  e.history.clear();
  return { e, a, b, c, g };
}

test('Ungroup puts the children in the group’s place and selects them', () => {
  const { e, a, b, c, g } = grouped();
  assert.deepEqual([...e.doc.children(null)], [b, g]);
  e.selection.set([g]);
  assert.ok(e.palette.run('Ungroup'));
  assert.ok(!e.doc.has(g));
  assert.deepEqual([...e.doc.children(null)], [b, a, c]);
  assert.deepEqual(sel(e), sorted([a, c]));
  assert.deepEqual(pos(e, a), [0, 0]);
  assert.deepEqual(pos(e, c), [200, 0]);
});

test('Mod+Shift+G ungroups on the canvas', () => {
  const { e, a, c, g } = grouped();
  e.selection.set([g]);
  assert.ok(e.keys.press('Mod+Shift+G'));
  assert.ok(!e.doc.has(g));
  assert.deepEqual(sel(e), sorted([a, c]));
});

test('inside a frame the children take the group’s place among its siblings', () => {
  const e = createEditor();
  const f = e.create('frame', { width: 500, height: 500 });
  const x = e.create('rect', { name: 'X' }, { parent: f });
  const g = e.create('group', { name: 'G' }, { parent: f });
  const y = e.create('rect', { name: 'Y', x: 10 }, { parent: g });
  const z = e.create('ellipse', { name: 'Z', x: 20 }, { parent: g });
  const w = e.create('rect', { name: 'W' }, { parent: f });
  e.selection.set([g]);
  e.palette.run('Ungroup');
  assert.deepEqual([...e.doc.children(f)], [x, y, z, w]);
  assert.equal(e.doc.require(y).parent, f);
});

test('other selected layers stay selected, and every selected group is ungrouped', () => {
  const e = createEditor();
  const g1 = e.create('group');
  const p = e.create('rect', { x: 0 }, { parent: g1 });
  const g2 = e.create('group');
  const q = e.create('rect', { x: 100 }, { parent: g2 });
  const r = e.create('rect', { x: 200 });
  e.selection.set([g1, r, g2]);
  e.palette.run('Ungroup');
  assert.ok(!e.doc.has(g1) && !e.doc.has(g2));
  assert.deepEqual([...e.doc.children(null)], [p, q, r]);
  assert.deepEqual(sel(e), sorted([p, q, r]));
});

test('one Undo puts the groups back as they were', () => {
  const { e, a, b, c, g } = grouped();
  e.selection.set([g]);
  e.palette.run('Ungroup');
  assert.ok(e.history.undo());
  assert.ok(e.doc.has(g));
  assert.equal(e.doc.require(g).type, 'group');
  assert.deepEqual([...e.doc.children(null)], [b, g]);
  assert.deepEqual([...e.doc.children(g)], [a, c]);
  assert.ok(e.history.redo());
  assert.deepEqual([...e.doc.children(null)], [b, a, c]);
});

test('Ungroup is offered only when a group is selected', () => {
  const { e, a, b } = grouped();
  e.selection.set([b]);
  assert.ok(!e.palette.list().includes('Ungroup'));
  e.selection.clear();
  assert.equal(e.palette.run('Ungroup'), false);
  assert.ok(e.doc.has(a));
});
