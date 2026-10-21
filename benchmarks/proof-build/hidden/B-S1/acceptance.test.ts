import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

function setup() {
  const e = createEditor();
  const a = e.create('rect', { x: 0 });
  const b = e.create('ellipse', { x: 100, opacity: 0.25 });
  const t = e.create('text', { x: 200 });
  return { e, a, b, t };
}

test('number keys set the opacity of the selection', () => {
  const { e, a } = setup();
  e.selection.set([a]);
  assert.ok(e.keys.press('5'));
  assert.equal(e.panel.value('Opacity'), '50%');
  e.keys.press('1');
  assert.equal(e.panel.value('Opacity'), '10%');
  e.keys.press('9');
  assert.equal(e.panel.value('Opacity'), '90%');
  e.keys.press('0');
  assert.equal(e.panel.value('Opacity'), '100%');
});

test('every selected layer gets the opacity, and one Undo takes it back', () => {
  const { e, a, b, t } = setup();
  e.selection.set([a, b, t]);
  e.keys.press('3');
  assert.equal(e.panel.value('Opacity'), '30%');
  assert.ok(e.history.undo());
  assert.equal(e.panel.value('Opacity'), 'Mixed');
  assert.equal(e.doc.require(b).opacity, 0.25);
  assert.equal(e.doc.require(a).opacity, 1);
});

test('the keys work only on the canvas', () => {
  const { e, a } = setup();
  e.selection.set([a]);
  e.keys.focus('panel');
  e.keys.press('4');
  e.keys.focus('layers');
  e.keys.press('4');
  assert.equal(e.panel.value('Opacity'), '100%');
  e.keys.focus('canvas');
  e.keys.press('4');
  assert.equal(e.panel.value('Opacity'), '40%');
});

test('with nothing selected a number key changes nothing', () => {
  const { e } = setup();
  e.keys.press('5');
  assert.equal(e.history.size, 0);
});
