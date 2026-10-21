import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

function setup() {
  const e = createEditor();
  const a = e.create('rect', { name: 'A', x: 0 });
  const b = e.create('rect', { name: 'B', x: 100 });
  const c = e.create('ellipse', { name: 'C', x: 200 });
  return { e, a, b, c };
}
const name = (e: ReturnType<typeof createEditor>, id: string) =>
  e.doc.require(id).name;

test('Rename layers numbers the layers in the order they were selected', () => {
  const { e, a, b, c } = setup();
  e.selection.set([c, a, b]);
  assert.ok(e.palette.run('Rename layers', 'Card'));
  assert.deepEqual(
    [name(e, c), name(e, a), name(e, b)],
    ['Card 1', 'Card 2', 'Card 3']
  );
});

test('a # in the name says where the number goes', () => {
  const { e, a, b } = setup();
  e.selection.set([a, b]);
  e.palette.run('Rename layers', 'Item #');
  assert.deepEqual([name(e, a), name(e, b)], ['Item 1', 'Item 2']);
  e.selection.set([b, a]);
  e.palette.run('Rename layers', '#-tile');
  assert.deepEqual([name(e, b), name(e, a)], ['1-tile', '2-tile']);
});

test('it is offered only for two or more layers', () => {
  const { e, a, b } = setup();
  e.selection.set([a]);
  assert.ok(!e.palette.list().includes('Rename layers'));
  assert.equal(e.palette.run('Rename layers', 'X'), false);
  assert.equal(name(e, a), 'A');
  e.selection.set([a, b]);
  assert.ok(e.palette.list().includes('Rename layers'));
});

test('typing nothing changes nothing', () => {
  const { e, a, b } = setup();
  e.selection.set([a, b]);
  e.palette.run('Rename layers', '   ');
  e.palette.run('Rename layers');
  assert.deepEqual([name(e, a), name(e, b)], ['A', 'B']);
  assert.equal(e.history.size, 0);
});

test('the renaming can be undone', () => {
  const { e, a, b, c } = setup();
  e.selection.set([a, b, c]);
  e.palette.run('Rename layers', 'Row');
  assert.ok(e.history.canUndo);
  while (e.history.undo());
  assert.deepEqual([name(e, a), name(e, b), name(e, c)], ['A', 'B', 'C']);
  while (e.history.redo());
  assert.deepEqual(
    [name(e, a), name(e, b), name(e, c)],
    ['Row 1', 'Row 2', 'Row 3']
  );
});
