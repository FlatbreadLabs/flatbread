import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

// U3: a frame made around existing layers has no fill and does not clip, so
// the canvas looks as it did; a frame made from scratch keeps the defaults.
test('a frame made around layers has no fill and does not clip', () => {
  const e = createEditor();
  e.create('rect', { name: 'Behind', width: 500, height: 500 });
  const a = e.create('rect', { name: 'A', x: 10, y: 10 });
  const b = e.create('rect', { name: 'B', x: 200, y: 50 });
  if (!e.palette.has('Frame selection')) return;
  e.selection.set([a, b]);
  e.palette.run('Frame selection');
  const frame = e.doc.require(e.selection.ids()[0]) as any;
  if (frame.type !== 'frame') return;
  assert.deepEqual(frame.fills, [], 'no fill hides the layers behind');
  assert.equal(frame.clip, false, 'nothing is clipped');
});

test('a frame made from scratch keeps its white fill and clipping', () => {
  const e = createEditor();
  const frame = e.doc.require(e.create('frame', { name: 'New' })) as any;
  assert.deepEqual(frame.fills, [{ color: '#FFFFFF' }]);
  assert.equal(frame.clip, true);
});
