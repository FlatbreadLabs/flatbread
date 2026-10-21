import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

// U6: a whole-pixel fit rounds each edge to the nearest whole pixel and
// takes the size from the rounded edges, so shapes that touched still touch.
test('shapes that touched still touch after rounding', () => {
  const e = createEditor();
  const left = e.create('rect', {
    name: 'Left',
    x: 0.4,
    y: 0,
    width: 10.1,
    height: 8,
  });
  const right = e.create('rect', {
    name: 'Right',
    x: 10.5,
    y: 0,
    width: 10.2,
    height: 8,
  });
  const top = e.create('rect', {
    name: 'Top',
    x: 40,
    y: 0.4,
    width: 8,
    height: 10.1,
  });
  const bottom = e.create('rect', {
    name: 'Bottom',
    x: 40,
    y: 10.5,
    width: 8,
    height: 9.6,
  });
  if (!e.palette.has('Round to pixels')) return;
  e.selection.set([left, right, top, bottom]);
  e.palette.run('Round to pixels');
  const n = (id: string) => e.doc.require(id);
  if (!Number.isInteger(n(left).x)) return;
  assert.equal(n(left).x + n(left).width, n(right).x, 'left meets right');
  assert.equal(n(top).y + n(top).height, n(bottom).y, 'top meets bottom');
  assert.deepEqual(
    [n(left).x, n(left).width, n(right).x, n(right).width],
    [0, 11, 11, 10]
  );
  assert.deepEqual(
    [n(top).y, n(top).height, n(bottom).y, n(bottom).height],
    [0, 11, 11, 9]
  );
});
