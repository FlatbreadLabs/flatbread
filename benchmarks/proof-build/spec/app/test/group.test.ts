import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editor, threeRects } from './helpers.ts';

test('Group selection wraps the nodes and selects the group', () => {
  const { e, a, b, c } = threeRects();
  e.selection.set([a, c]);
  assert.ok(e.palette.run('Group selection'));
  const [group] = e.selection.ids();
  assert.equal(e.doc.require(group).type, 'group');
  assert.deepEqual([...e.doc.children(group)], [a, c]);
  assert.deepEqual([...e.doc.children(null)], [b, group]);
  const g = e.doc.require(group);
  assert.deepEqual([g.x, g.y, g.width, g.height], [0, 0, 250, 50]);
});

test('undo of a group restores the exact selection from before it', () => {
  const { e, a, b, c } = threeRects();
  e.selection.set([c, a]);
  e.palette.run('Group selection');
  assert.equal(e.history.size, 1);
  e.history.undo();
  assert.deepEqual(e.selection.ids(), [c, a]);
  assert.deepEqual([...e.doc.children(null)], [a, b, c]);
  e.history.redo();
  const [group] = e.selection.ids();
  assert.equal(e.doc.require(group).type, 'group');
});

test('grouping nodes from different frames lifts them to the common parent', () => {
  const e = editor();
  const f1 = e.create('frame');
  const f2 = e.create('frame');
  const r1 = e.create('rect', {}, { parent: f1 });
  const r2 = e.create('rect', {}, { parent: f2 });
  e.selection.set([r1, r2]);
  e.palette.run('Group selection');
  const [group] = e.selection.ids();
  assert.equal(e.doc.require(group).parent, null);
  assert.deepEqual([...e.doc.children(null)], [f1, f2, group]);
});

test('Group selection is disabled with nothing selected', () => {
  const { e } = threeRects();
  assert.ok(!e.palette.list().includes('Group selection'));
  assert.equal(e.palette.run('Group selection'), false);
});

test('moving a group moves its children', () => {
  const { e, a, b } = threeRects();
  e.selection.set([a, b]);
  e.palette.run('Group selection');
  e.panel.edit('X', '10');
  assert.equal(e.doc.require(a).x, 10);
  assert.equal(e.doc.require(b).x, 110);
});
