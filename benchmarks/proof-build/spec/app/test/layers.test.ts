import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLayerName, uniqueName } from '../src/layers/rename.ts';
import { editor, threeRects } from './helpers.ts';

const names = (e: ReturnType<typeof editor>) =>
  e.layers.view().map((row) => `${'  '.repeat(row.depth)}${row.name}`);

test('rows list the frontmost layer first', () => {
  const { e } = threeRects();
  assert.deepEqual(names(e), ['C', 'B', 'A']);
});

test('containers start collapsed and expand on request', () => {
  const e = editor();
  const g = e.create('group', { name: 'G' });
  e.create('rect', { name: 'R1' }, { parent: g });
  e.create('rect', { name: 'R2' }, { parent: g });
  assert.deepEqual(names(e), ['G']);
  e.layers.toggle(g);
  assert.deepEqual(names(e), ['G', '  R2', '  R1']);
  const [row] = e.layers.view();
  assert.equal(row.expanded, true);
  assert.equal(row.hasChildren, true);
  e.layers.toggle(g);
  assert.deepEqual(names(e), ['G']);
});

test('reveal expands every ancestor', () => {
  const e = editor();
  const f = e.create('frame', { name: 'F' });
  const g = e.create('group', { name: 'G' }, { parent: f });
  const r = e.create('rect', { name: 'R' }, { parent: g });
  e.layers.reveal(r);
  assert.deepEqual(names(e), ['F', '  G', '    R']);
});

test('dragging a row above another puts it in front', () => {
  const { e, a, c } = threeRects();
  assert.ok(e.layers.drag(a, c, 'above'));
  assert.deepEqual(names(e), ['A', 'C', 'B']);
  assert.equal(e.doc.children(null).at(-1), a);
});

test('dragging a row below another puts it behind', () => {
  const { e, b, c } = threeRects();
  e.layers.drag(c, b, 'below');
  assert.deepEqual(names(e), ['B', 'C', 'A']);
});

test('dropping inside a container puts the row at its top', () => {
  const e = editor();
  const f = e.create('frame', { name: 'F' });
  e.create('rect', { name: 'In' }, { parent: f });
  const out = e.create('rect', { name: 'Out' });
  e.layers.drag(out, f, 'inside');
  assert.deepEqual(names(e), ['F', '  Out', '  In']);
  e.history.undo();
  assert.deepEqual(names(e), ['Out', 'F', '  In']);
});

test('a container cannot be dropped inside itself', () => {
  const e = editor();
  const f = e.create('frame');
  const inner = e.create('frame', {}, { parent: f });
  assert.equal(e.layers.drag(f, inner, 'inside'), false);
  assert.equal(e.history.size, 0);
});

test('clicking rows selects; mod toggles; shift selects a range', () => {
  const { e, a, b, c } = threeRects();
  e.layers.click(c);
  assert.deepEqual(e.selection.ids(), [c]);
  e.layers.click(a, { shift: true });
  assert.deepEqual(e.selection.ids(), [c, b, a]);
  e.layers.click(b, { mod: true });
  assert.deepEqual(e.selection.ids(), [c, a]);
});

test('rename trims and refuses blank names', () => {
  const { e, a } = threeRects();
  assert.ok(e.layers.rename(a, '  Hero   image '));
  assert.equal(e.doc.require(a).name, 'Hero image');
  assert.equal(e.layers.rename(a, '   '), false);
  assert.equal(e.history.entries().at(-1)?.label, 'Rename layer');
});

test('name helpers', () => {
  assert.equal(normalizeLayerName('x'.repeat(80))?.length, 64);
  assert.equal(uniqueName('Frame', ['Frame', 'Frame 2']), 'Frame 3');
  assert.equal(uniqueName('Card', []), 'Card');
});
