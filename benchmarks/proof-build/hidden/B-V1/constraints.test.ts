import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

const sel = (e: ReturnType<typeof createEditor>) =>
  [...e.selection.ids()].sort();

test('hidden and locked layers are never selected by the box', () => {
  const e = createEditor();
  const a = e.create('rect', { x: 0, y: 0, width: 40, height: 40 });
  e.create('rect', { x: 50, y: 0, width: 40, height: 40, visible: false });
  e.create('rect', { x: 100, y: 0, width: 40, height: 40, locked: true });
  e.canvas.drag({ x: -10, y: -10 }, { x: 200, y: 50 });
  assert.ok(
    sel(e).every((id) => id === a),
    String(sel(e))
  );
});

test('nothing inside a hidden or locked container is selected by the box', () => {
  const e = createEditor();
  const locked = e.create('frame', {
    x: 0,
    y: 0,
    width: 300,
    height: 300,
    locked: true,
  });
  e.create('rect', { x: 20, y: 20, width: 40, height: 40 }, { parent: locked });
  const hidden = e.create('group', { visible: false });
  e.create(
    'rect',
    { x: 400, y: 20, width: 40, height: 40 },
    { parent: hidden }
  );
  const shown = e.create('group');
  const inShown = e.create(
    'rect',
    { x: 400, y: 200, width: 40, height: 40 },
    { parent: shown }
  );
  e.create(
    'rect',
    { x: 460, y: 200, width: 40, height: 40, locked: true },
    { parent: shown }
  );
  e.canvas.drag({ x: 10, y: 10 }, { x: 450, y: 250 });
  assert.ok(
    sel(e).every((id) => id === inShown),
    String(sel(e))
  );
  e.canvas.drag({ x: -50, y: -50 }, { x: 600, y: 600 });
  assert.ok(
    sel(e).every((id) => id === shown || id === inShown),
    String(sel(e))
  );
});
