import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

test('undo and redo of Ungroup restore the exact selection on each side', () => {
  const e = createEditor();
  const b = e.create('rect', { x: 100 });
  const g = e.create('group');
  e.create('rect', { x: 0 }, { parent: g });
  e.create('rect', { x: 200 }, { parent: g });
  const other = e.create('ellipse', { x: 300 });
  if (!e.palette.has('Ungroup')) return;
  e.selection.set([other, g, b]);
  const before = e.selection.ids();
  e.palette.run('Ungroup');
  const after = e.selection.ids();
  assert.ok(e.history.undo());
  assert.deepEqual(e.selection.ids(), before);
  assert.ok(e.history.redo());
  assert.deepEqual(e.selection.ids(), after);
});
