import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

function setup() {
  const e = createEditor();
  const f = e.create('frame', { x: 0, y: 0, width: 400, height: 300 });
  const inFrame = e.create(
    'rect',
    { x: 10, y: 10, width: 50, height: 50 },
    { parent: f }
  );
  const g = e.create('group', {}, { parent: f });
  const inGroup = e.create(
    'rect',
    { x: 100, y: 100, width: 20, height: 20 },
    { parent: g }
  );
  const loose = e.create('rect', { x: 500, y: 0, width: 50, height: 50 });
  return { e, f, inFrame, inGroup, loose };
}

const size = (e: ReturnType<typeof createEditor>, id: string) => [
  e.doc.require(id).width,
  e.doc.require(id).height,
];

test('W and H take inches, points and px', () => {
  const { e, loose } = setup();
  e.selection.set([loose]);
  assert.ok(e.panel.edit('W', '2in').ok);
  assert.ok(e.panel.edit('H', '18pt').ok);
  assert.deepEqual(size(e, loose), [192, 24]);
  e.panel.edit('W', '10px');
  e.panel.edit('H', '0.5 in');
  assert.deepEqual(size(e, loose), [10, 48]);
});

test('arithmetic still works and can mix units', () => {
  const { e, loose } = setup();
  e.selection.set([loose]);
  e.panel.edit('W', '1in + 4');
  assert.equal(e.doc.require(loose).width, 100);
  e.panel.edit('W', '(1in - 16) / 2');
  assert.equal(e.doc.require(loose).width, 40);
  e.panel.edit('H', '72pt - 1in + 30');
  assert.equal(e.doc.require(loose).height, 30);
  e.panel.edit('W', '50 * 2 + 10');
  assert.equal(e.doc.require(loose).width, 110);
});

test('% is a share of the parent frame: its width for W, its height for H', () => {
  const { e, inFrame } = setup();
  e.selection.set([inFrame]);
  e.panel.edit('W', '50%');
  e.panel.edit('H', '10%');
  assert.deepEqual(size(e, inFrame), [200, 30]);
  e.panel.edit('W', '25% + 1in');
  assert.equal(e.doc.require(inFrame).width, 196);
});

test('a layer in a group inside a frame takes the frame', () => {
  const { e, inGroup } = setup();
  e.selection.set([inGroup]);
  e.panel.edit('W', '10%');
  assert.equal(e.doc.require(inGroup).width, 40);
});

test('% on a layer that is not inside a frame is refused', () => {
  const { e, loose } = setup();
  e.selection.set([loose]);
  const result = e.panel.edit('W', '50%');
  assert.equal(result.ok, false);
  assert.deepEqual(size(e, loose), [50, 50]);
  assert.equal(e.history.size, 0);
});

test('other fields work as before', () => {
  const { e, loose } = setup();
  e.selection.set([loose]);
  e.panel.edit('X', '12 + 3');
  assert.equal(e.doc.require(loose).x, 15);
  e.panel.edit('Opacity', '40%');
  assert.equal(e.doc.require(loose).opacity, 0.4);
  e.panel.edit('Rotation', '90°');
  assert.equal(e.panel.value('Rotation'), '90°');
  assert.equal(e.panel.edit('W', 'wide').ok, false);
});
