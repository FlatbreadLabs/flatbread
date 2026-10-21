import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

function shiftRotate(degrees: number) {
  const e = createEditor();
  const id = e.create('rect', { x: 0, y: 0, width: 100, height: 100 });
  e.selection.set([id]);
  const start = -Math.PI / 2;
  const end = start + (degrees * Math.PI) / 180;
  e.canvas.drag(
    { x: 50, y: -24 },
    { x: 50 + 74 * Math.cos(end), y: 50 + 74 * Math.sin(end) },
    { shift: true }
  );
  return { e, id };
}

test('rotation is stored in radians, whatever Shift does', () => {
  for (const degrees of [50, 100, -37, 170]) {
    const { e, id } = shiftRotate(degrees);
    const r = e.doc.require(id).rotation;
    assert.ok(r > -Math.PI - 1e-9 && r <= Math.PI + 1e-9, `rotation ${r}`);
    const shown = Number(e.panel.value('Rotation')!.replace('°', ''));
    assert.ok(
      Math.abs((r * 180) / Math.PI - shown) < 0.05,
      `${r} shows ${shown}`
    );
  }
});

test('a snapped angle is stored as the exact radian value', () => {
  const { e, id } = shiftRotate(50);
  if (e.panel.value('Rotation') !== '45°') return;
  assert.ok(Math.abs(e.doc.require(id).rotation - Math.PI / 4) < 1e-9);
  const saved = JSON.parse(e.files.save());
  assert.ok(Math.abs(saved.nodes[id].rotation - Math.PI / 4) < 1e-9);
});
