import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

test('one Undo takes back the whole rename', () => {
  const e = createEditor();
  const ids = ['A', 'B', 'C', 'D', 'E'].map((n, i) =>
    e.create('rect', { name: n, x: i * 60 })
  );
  e.selection.set(ids);
  // Only a build that has the command can break the rule.
  if (!e.palette.has('Rename layers')) return;
  const before = e.history.size;
  e.palette.run('Rename layers', 'Tile');
  assert.equal(e.history.size, before + 1);
  assert.ok(e.history.undo());
  assert.deepEqual(
    ids.map((id) => e.doc.require(id).name),
    ['A', 'B', 'C', 'D', 'E']
  );
  assert.deepEqual(e.selection.ids(), ids);
  assert.ok(e.history.redo());
  assert.deepEqual(
    ids.map((id) => e.doc.require(id).name),
    ['Tile 1', 'Tile 2', 'Tile 3', 'Tile 4', 'Tile 5']
  );
});
