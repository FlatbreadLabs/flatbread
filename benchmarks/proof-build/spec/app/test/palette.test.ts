import { test } from 'node:test';
import assert from 'node:assert/strict';
import { threeRects } from './helpers.ts';

test('the palette lists only commands that can run', () => {
  const { e, a } = threeRects();
  const idle = e.palette.list();
  assert.ok(idle.includes('Select all'));
  assert.ok(!idle.includes('Delete'));
  e.selection.set([a]);
  const busy = e.palette.list();
  assert.ok(busy.includes('Delete'));
  assert.ok(busy.includes('Rename layer'));
  assert.ok(!busy.includes('Distribute horizontally'));
});

test('unknown titles throw; disabled ones return false', () => {
  const { e } = threeRects();
  assert.throws(() => e.palette.run('Make it pop'), /no palette command/);
  assert.equal(e.palette.run('Delete'), false);
  assert.ok(e.palette.has('Undo'));
});

test('Select all skips locked and hidden layers', () => {
  const { e, a, b, c } = threeRects();
  e.doc.update(b, { locked: true });
  e.doc.update(c, { visible: false });
  e.palette.run('Select all');
  assert.deepEqual(e.selection.ids(), [a]);
});

test('Undo and Redo are in the palette', () => {
  const { e, a } = threeRects();
  e.selection.set([a]);
  e.palette.run('Hide');
  e.palette.run('Undo');
  assert.equal(e.doc.require(a).visible, true);
  e.palette.run('Redo');
  assert.equal(e.doc.require(a).visible, false);
});
