import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);

// Each test checks the rule only when the build has the command.

test('scaled geometry is stored exactly; only the panel rounds it', () => {
  const e = createEditor();
  const r = e.create('rect', { x: 0, y: 0, width: 10, height: 10 });
  e.selection.set([r]);
  if (!e.palette.has('Scale selection')) return;
  e.palette.run('Scale selection', '12.345');
  const n = e.doc.require(r);
  near(n.width, 1.2345);
  near(n.height, 1.2345);
  near(n.x, 4.38275);
  near(n.y, 4.38275);
  assert.equal(e.panel.value('W'), '1.23');
});

test('scaling up and back down returns the same numbers', () => {
  const e = createEditor();
  const a = e.create('rect', {
    x: 3.125,
    y: 7.375,
    width: 11.0625,
    height: 13.4375,
  });
  const b = e.create('rect', { x: 41, y: 2.5, width: 17, height: 5 });
  e.selection.set([a, b]);
  if (!e.palette.has('Scale selection')) return;
  e.palette.run('Scale selection', '150');
  e.palette.run('Scale selection', '100 / 1.5');
  for (const [id, x, y, w, h] of [
    [a, 3.125, 7.375, 11.0625, 13.4375],
    [b, 41, 2.5, 17, 5],
  ] as const) {
    const n = e.doc.require(id);
    near(n.x, x);
    near(n.y, y);
    near(n.width, w);
    near(n.height, h);
  }
});
