import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editor, threeRects } from './helpers.ts';

test('set-prop sets one property and undoes it', () => {
  const { e, a } = threeRects();
  e.commands.dispatch({
    type: 'set-prop',
    payload: { id: a, key: 'opacity', value: 0.3 },
  });
  assert.equal(e.doc.require(a).opacity, 0.3);
  e.history.undo();
  assert.equal(e.doc.require(a).opacity, 1);
});

test('set-prop refuses unknown and structural keys', () => {
  const { e, a } = threeRects();
  assert.throws(
    () =>
      e.commands.dispatch({
        type: 'set-prop',
        payload: { id: a, key: 'bogus', value: 1 },
      }),
    /no property/
  );
  assert.throws(
    () =>
      e.commands.dispatch({
        type: 'set-prop',
        payload: { id: a, key: 'parent', value: null },
      }),
    /cannot be set/
  );
});

test('move carries a container and everything in it', () => {
  const e = editor();
  const frame = e.create('frame', { x: 0, y: 0 });
  const child = e.create('rect', { x: 10, y: 10 }, { parent: frame });
  e.commands.dispatch({
    type: 'move',
    payload: { ids: [frame, child], dx: 5, dy: 7 },
  });
  assert.deepEqual([e.doc.require(frame).x, e.doc.require(frame).y], [5, 7]);
  assert.deepEqual([e.doc.require(child).x, e.doc.require(child).y], [15, 17]);
});

test('delete and undo put the subtree back where it was', () => {
  const e = editor();
  const a = e.create('rect');
  const frame = e.create('frame');
  const inner = e.create('ellipse', {}, { parent: frame });
  const b = e.create('rect');
  e.selection.set([frame, b]);
  e.palette.run('Delete');
  assert.deepEqual([...e.doc.children(null)], [a]);
  assert.deepEqual(e.selection.ids(), []);
  e.history.undo();
  assert.deepEqual([...e.doc.children(null)], [a, frame, b]);
  assert.deepEqual([...e.doc.children(frame)], [inner]);
  assert.deepEqual(e.selection.ids(), [frame, b]);
  e.history.redo();
  assert.equal(e.doc.size, 1);
});

test('reorder and its inverse', () => {
  const { e, a, b, c } = threeRects();
  e.commands.dispatch({
    type: 'reorder',
    payload: { id: a, parent: null, index: 2 },
  });
  assert.deepEqual([...e.doc.children(null)], [b, c, a]);
  e.history.undo();
  assert.deepEqual([...e.doc.children(null)], [a, b, c]);
});

test('bring forward and send to back keep sibling order', () => {
  const { e, a, b, c } = threeRects();
  e.selection.set([a, b]);
  e.palette.run('Bring forward');
  assert.deepEqual([...e.doc.children(null)], [c, a, b]);
  e.selection.set([b]);
  e.palette.run('Send to back');
  assert.deepEqual([...e.doc.children(null)], [b, c, a]);
  e.selection.set([c]);
  e.palette.run('Bring to front');
  assert.deepEqual([...e.doc.children(null)], [b, a, c]);
});

test('rename, hide and lock are undoable', () => {
  const { e, a } = threeRects();
  e.selection.set([a]);
  e.palette.run('Rename layer', '  Header ');
  e.palette.run('Hide');
  e.palette.run('Lock');
  const node = e.doc.require(a);
  assert.deepEqual(
    [node.name, node.visible, node.locked],
    ['Header', false, true]
  );
  e.history.undo();
  e.history.undo();
  e.history.undo();
  const back = e.doc.require(a);
  assert.deepEqual([back.name, back.visible, back.locked], ['A', true, false]);
});

test('align left lines the selection up on its left edge', () => {
  const { e, a, b, c } = threeRects();
  e.doc.update(b, { y: 80, x: 130 });
  e.selection.set([b, c]);
  e.palette.run('Align left');
  assert.equal(e.doc.require(b).x, 130);
  assert.equal(e.doc.require(c).x, 130);
  assert.equal(e.doc.require(a).x, 0);
});

test('distribute spaces the middle nodes evenly', () => {
  const { e, a, b, c } = threeRects();
  e.doc.update(b, { x: 20 });
  e.selection.set([a, b, c]);
  e.palette.run('Distribute horizontally');
  assert.equal(e.doc.require(b).x, 100);
});

test('the bus reports each command it runs', () => {
  const { e, a } = threeRects();
  const seen: unknown[] = [];
  e.commands.on('executed', ({ command }) => seen.push(command));
  e.commands.dispatch({ type: 'move', payload: { ids: [a], dx: 1, dy: 2 } });
  assert.deepEqual(seen, [
    { type: 'move', payload: { ids: [a], dx: 1, dy: 2 } },
  ]);
  assert.ok(e.commands.types().includes('set-prop'));
});
