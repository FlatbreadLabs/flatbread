import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

type Editor = ReturnType<typeof createEditor>;
const top = (e: Editor) => [...e.doc.children(null)];
const at = (e: Editor, id: string) => {
  const n = e.doc.require(id);
  return [n.x, n.y, n.width, n.height];
};

function setup() {
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

test('Duplicate copies a layer 10 px right and down, in front of it, and selects the copy', () => {
  const { e, a, b, c } = setup();
  e.selection.set([a]);
  assert.ok(e.palette.run('Duplicate'));
  const [copy] = e.selection.ids();
  assert.ok(copy && copy !== a);
  assert.equal(e.doc.size, 4);
  assert.deepEqual(at(e, copy), [10, 10, 50, 50]);
  assert.deepEqual(at(e, a), [0, 0, 50, 50]);
  assert.equal(e.doc.require(copy).name, 'A');
  assert.equal(e.doc.require(copy).type, 'rect');
  assert.deepEqual(top(e), [a, copy, b, c]);
});

test('Mod+D duplicates, and again duplicates the copies', () => {
  const { e, a, b } = setup();
  e.selection.set([a, b]);
  assert.ok(e.keys.press('Mod+D'));
  const first = e.selection.ids();
  assert.equal(first.length, 2);
  assert.ok(!first.includes(a) && !first.includes(b));
  e.keys.press('Mod+D');
  const second = e.selection.ids();
  assert.equal(e.doc.size, 7);
  const xs = second.map((id) => e.doc.require(id).x).sort((p, q) => p - q);
  assert.deepEqual(xs, [20, 120]);
  for (const id of second) assert.equal(e.doc.require(id).y, 20);
});

test('a copied frame brings copies of everything inside it', () => {
  const e = createEditor();
  const f = e.create('frame', {
    name: 'Card',
    x: 0,
    y: 0,
    width: 200,
    height: 100,
  });
  const t = e.create(
    'text',
    { name: 'Label', x: 10, y: 10, text: 'Hi' },
    { parent: f }
  );
  const g = e.create('group', { name: 'Icons' }, { parent: f });
  e.create(
    'ellipse',
    { name: 'Dot', x: 50, y: 50, width: 10, height: 10 },
    { parent: g }
  );
  e.selection.set([f]);
  e.palette.run('Duplicate');
  const [copy] = e.selection.ids();
  assert.equal(e.doc.size, 8);
  const kids = e.doc.children(copy).map((id) => e.doc.require(id));
  assert.deepEqual(
    kids.map((k) => [k.type, k.name, k.x, k.y]),
    [
      ['text', 'Label', 20, 20],
      ['group', 'Icons', 60, 60],
    ]
  );
  assert.ok(!kids.some((k) => k.id === t || k.id === g));
  const dot = e.doc.require(e.doc.children(kids[1].id)[0]);
  assert.deepEqual([dot.name, dot.x, dot.y], ['Dot', 60, 60]);
  assert.equal(e.doc.require(t).x, 10);
});

test('Undo removes the copies and reselects the originals; Redo brings them back', () => {
  const { e, a, b } = setup();
  e.selection.set([a, b]);
  e.palette.run('Duplicate');
  assert.ok(e.history.undo());
  assert.equal(e.doc.size, 3);
  assert.deepEqual(e.selection.ids(), [a, b]);
  assert.ok(e.history.redo());
  assert.equal(e.doc.size, 5);
  const copies = e.doc.all().filter((n) => n.x === 10 || n.x === 110);
  assert.equal(copies.length, 2);
});

test('Duplicate is offered only with a selection', () => {
  const { e } = setup();
  assert.ok(!e.palette.list().includes('Duplicate'));
  assert.equal(e.palette.run('Duplicate'), false);
  assert.equal(e.doc.size, 3);
});
