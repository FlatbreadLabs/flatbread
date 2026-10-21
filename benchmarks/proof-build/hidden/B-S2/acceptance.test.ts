import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

type Editor = ReturnType<typeof createEditor>;

/** A 100 × 100 square at the origin, selected; its rotation handle is at (50, -24). */
function square(props: Record<string, unknown> = {}) {
  const e = createEditor();
  const id = e.create('rect', {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    ...props,
  });
  e.selection.set([id]);
  return { e, id };
}

/** Drags the rotation handle of the selection round its centre by `degrees`. */
function rotateBy(
  e: Editor,
  centre: { x: number; y: number },
  from: { x: number; y: number },
  degrees: number,
  shift: boolean
) {
  const start = Math.atan2(from.y - centre.y, from.x - centre.x);
  const r = Math.hypot(from.x - centre.x, from.y - centre.y);
  const end = start + (degrees * Math.PI) / 180;
  e.canvas.drag(
    from,
    { x: centre.x + r * Math.cos(end), y: centre.y + r * Math.sin(end) },
    { shift }
  );
}

const C = { x: 50, y: 50 };
const HANDLE = { x: 50, y: -24 };

test('with Shift the rotation snaps to 15° steps', () => {
  const { e } = square();
  rotateBy(e, C, HANDLE, 50, true);
  assert.equal(e.panel.value('Rotation'), '45°');
});

test('without Shift rotation stays free', () => {
  const { e } = square();
  rotateBy(e, C, HANDLE, 50, false);
  assert.equal(e.panel.value('Rotation'), '50°');
});

test('it snaps to the nearest step either way round', () => {
  const a = square();
  rotateBy(a.e, C, HANDLE, 100, true);
  assert.equal(a.e.panel.value('Rotation'), '105°');
  const b = square();
  rotateBy(b.e, C, HANDLE, -37, true);
  assert.equal(b.e.panel.value('Rotation'), '-30°');
});

test('each layer’s own angle is snapped', () => {
  const e = createEditor();
  const a = e.create('rect', {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: (10 * Math.PI) / 180,
  });
  const b = e.create('rect', { x: 0, y: 0, width: 100, height: 100 });
  e.selection.set([a, b]);
  const bounds = { x: 0, y: 0, w: 0, h: 0 };
  // The selection box of the two squares; the handle sits 24 px above its top centre.
  const xs: number[] = [];
  const ys: number[] = [];
  for (const id of [a, b]) {
    const n = e.doc.require(id);
    const c = { x: n.x + 50, y: n.y + 50 };
    for (const [dx, dy] of [
      [-50, -50],
      [50, -50],
      [50, 50],
      [-50, 50],
    ]) {
      const cos = Math.cos(n.rotation);
      const sin = Math.sin(n.rotation);
      xs.push(c.x + dx * cos - dy * sin);
      ys.push(c.y + dx * sin + dy * cos);
    }
  }
  bounds.x = Math.min(...xs);
  bounds.y = Math.min(...ys);
  bounds.w = Math.max(...xs) - bounds.x;
  bounds.h = Math.max(...ys) - bounds.y;
  const centre = { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 };
  rotateBy(e, centre, { x: centre.x, y: bounds.y - 24 }, 50, true);
  e.selection.set([a]);
  assert.equal(e.panel.value('Rotation'), '60°');
  e.selection.set([b]);
  assert.equal(e.panel.value('Rotation'), '45°');
});

test('a snapped rotation is one step to undo', () => {
  const { e } = square();
  rotateBy(e, C, HANDLE, 50, true);
  assert.equal(e.history.size, 1);
  e.history.undo();
  assert.equal(e.panel.value('Rotation'), '0°');
});
