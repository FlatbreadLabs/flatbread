import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editor, threeRects } from './helpers.ts';

test('the panel is empty with nothing selected', () => {
  const { e } = threeRects();
  assert.deepEqual(e.panel.view(), { count: 0, sections: [] });
});

test('sections follow the selected node types', () => {
  const e = editor();
  const t = e.create('text', { text: 'Hello' });
  e.selection.set([t]);
  const names = e.panel.view().sections.map((s) => s.name);
  assert.deepEqual(names, ['layout', 'appearance', 'fill', 'stroke', 'text']);
  const g = e.create('group');
  e.create('rect', {}, { parent: g });
  e.selection.set([g]);
  assert.deepEqual(
    e.panel.view().sections.map((s) => s.name),
    ['layout', 'appearance']
  );
});

test('a field shows Mixed when the selection disagrees', () => {
  const { e, a, b } = threeRects();
  e.selection.set([a, b]);
  assert.equal(e.panel.value('X'), 'Mixed');
  assert.equal(e.panel.value('W'), '50');
  const x = e.panel.view().sections[0].fields.find((f) => f.label === 'X');
  assert.equal(x?.mixed, true);
});

test('typing a value sets it on every selected node', () => {
  const { e, a, b, c } = threeRects();
  e.selection.set([a, b, c]);
  const result = e.panel.edit('Y', '40');
  assert.deepEqual(result, { ok: true, changed: 3 });
  for (const id of [a, b, c]) assert.equal(e.doc.require(id).y, 40);
  assert.equal(e.panel.value('Y'), '40');
});

test('length fields take arithmetic', () => {
  const { e, a } = threeRects();
  e.selection.set([a]);
  e.panel.edit('W', '50 * 2 + 10');
  assert.equal(e.doc.require(a).width, 110);
  e.panel.edit('H', '100px / 4');
  assert.equal(e.doc.require(a).height, 25);
});

test('bad input changes nothing', () => {
  const { e, a } = threeRects();
  e.selection.set([a]);
  const result = e.panel.edit('W', 'wide');
  assert.equal(result.ok, false);
  assert.equal(e.doc.require(a).width, 50);
  assert.equal(e.history.size, 0);
});

test('rotation is typed and shown in degrees', () => {
  const { e, a } = threeRects();
  e.selection.set([a]);
  e.panel.edit('Rotation', '90');
  assert.ok(Math.abs(e.doc.require(a).rotation - Math.PI / 2) < 1e-12);
  assert.equal(e.panel.value('Rotation'), '90°');
  e.panel.edit('Rotation', '270°');
  assert.equal(e.panel.value('Rotation'), '-90°');
});

test('opacity is a percentage, clamped', () => {
  const { e, a } = threeRects();
  e.selection.set([a]);
  e.panel.edit('Opacity', '40%');
  assert.equal(e.doc.require(a).opacity, 0.4);
  e.panel.edit('Opacity', '150');
  assert.equal(e.panel.value('Opacity'), '100%');
});

test('opacity on a group is the group’s own', () => {
  const e = editor();
  const g = e.create('group');
  const r = e.create('rect', { opacity: 0.5 }, { parent: g });
  e.selection.set([g]);
  e.panel.edit('Opacity', '50%');
  assert.equal(e.doc.require(g).opacity, 0.5);
  assert.equal(e.doc.require(r).opacity, 0.5);
  assert.equal(e.panel.value('Opacity'), '50%');
});

test('fill takes #rrggbb and shows upper case', () => {
  const { e, a } = threeRects();
  e.selection.set([a]);
  e.panel.edit('Fill', '#ff8800');
  assert.equal(e.panel.value('Fill'), '#FF8800');
  assert.equal(e.panel.edit('Fill', 'orange').ok, false);
});

test('stroke width adds a stroke when there is none', () => {
  const { e, a } = threeRects();
  e.selection.set([a]);
  e.panel.edit('Stroke width', '2');
  const node = e.doc.require(a);
  assert.ok(node.type === 'rect');
  assert.deepEqual(node.strokes, [
    { color: '#000000', width: 2, align: 'inside' },
  ]);
});

test('editing text resizes the box to fit', () => {
  const e = editor();
  const t = e.create('text', {
    text: 'a',
    width: 9.6 * 5,
    fontSize: 16,
    lineHeight: 1,
  });
  e.selection.set([t]);
  e.panel.edit('Text', 'aaaa bbbb cccc');
  assert.equal(e.doc.require(t).height, 48);
  e.panel.edit('Font size', '8');
  assert.equal(e.doc.require(t).height, 16);
});

test('collapsed sections are remembered', () => {
  const { e, a } = threeRects();
  e.selection.set([a]);
  e.panel.toggleSection('fill');
  const fill = e.panel.view().sections.find((s) => s.name === 'fill');
  assert.equal(fill?.collapsed, true);
  assert.deepEqual(e.files.viewState().collapsedSections, ['fill']);
  e.panel.toggleSection('fill');
  assert.deepEqual(e.files.viewState().collapsedSections, []);
});

test('an unknown field label throws', () => {
  const { e } = threeRects();
  assert.throws(() => e.panel.edit('Blur', '4'), /no field/);
});
