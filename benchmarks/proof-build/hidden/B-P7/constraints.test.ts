import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

test('one Undo takes back the whole paste, however many layers it touched', () => {
  const e = createEditor();
  const src = e.create('rect', {
    name: 'Source',
    fills: [{ color: '#FF0000' }],
    opacity: 0.5,
  } as never);
  const ids = ['A', 'B', 'C', 'D'].map((n, i) =>
    e.create(i % 2 ? 'ellipse' : 'rect', { name: n, x: 100 + i * 60 })
  );
  // Only a build that has the commands can break the rule.
  if (!e.palette.has('Copy style') || !e.palette.has('Paste style')) return;
  e.selection.set([src]);
  e.palette.run('Copy style');
  const copyEntries = e.history.size;
  e.selection.set(ids);
  const before = ids.map((id) => structuredClone(e.doc.require(id)));
  e.palette.run('Paste style');
  assert.equal(e.history.size, copyEntries + 1, 'one entry for the paste');
  assert.ok(e.history.undo());
  assert.deepEqual(
    ids.map((id) => e.doc.require(id)),
    before
  );
  assert.deepEqual(e.selection.ids(), ids);
  assert.ok(e.history.redo());
  for (const id of ids) assert.equal((e.doc.require(id) as any).opacity, 0.5);
});

test('copying a style is not an edit', () => {
  const e = createEditor();
  const src = e.create('rect', { name: 'Source' });
  if (!e.palette.has('Copy style')) return;
  e.selection.set([src]);
  e.palette.run('Copy style');
  assert.equal(e.history.size, 0);
});
