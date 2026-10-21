import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

function setup() {
  const e = createEditor();
  const a = e.create('rect', { x: 0 });
  const b = e.create('rect', { x: 100 });
  const c = e.create('rect', { x: 200 });
  return { e, a, b, c };
}
const shown = (e: ReturnType<typeof createEditor>, ids: string[]) =>
  ids.map((id) => e.doc.require(id).visible);

test('Mod+Shift+H hides the selected layers, and again shows them', () => {
  const { e, a, b, c } = setup();
  e.selection.set([a, b]);
  assert.ok(e.keys.press('Mod+Shift+H'));
  assert.deepEqual(shown(e, [a, b, c]), [false, false, true]);
  e.keys.press('Mod+Shift+H');
  assert.deepEqual(shown(e, [a, b, c]), [true, true, true]);
});

test('when only some are hidden it hides them all', () => {
  const { e, a, b } = setup();
  e.selection.set([a]);
  e.keys.press('Mod+Shift+H');
  e.selection.set([a, b]);
  e.keys.press('Mod+Shift+H');
  assert.deepEqual(shown(e, [a, b]), [false, false]);
});

test('it is one step to undo, labelled Hide or Show', () => {
  const { e, a, b } = setup();
  e.selection.set([a, b]);
  e.keys.press('Mod+Shift+H');
  assert.equal(e.history.size, 1);
  assert.equal(e.history.entries().at(-1)?.label, 'Hide');
  e.keys.press('Mod+Shift+H');
  assert.equal(e.history.entries().at(-1)?.label, 'Show');
  e.history.undo();
  assert.deepEqual(shown(e, [a, b]), [false, false]);
  e.history.undo();
  assert.deepEqual(shown(e, [a, b]), [true, true]);
});

test('any spelling of the chord works', () => {
  const { e, a } = setup();
  e.selection.set([a]);
  e.keys.press('shift+cmd+h');
  assert.equal(e.doc.require(a).visible, false);
});

test('it is a canvas shortcut and does nothing with no selection', () => {
  const { e, a } = setup();
  assert.equal(e.history.size, 0);
  e.keys.press('Mod+Shift+H');
  assert.equal(e.history.size, 0);
  e.selection.set([a]);
  e.keys.focus('panel');
  e.keys.press('Mod+Shift+H');
  assert.equal(e.doc.require(a).visible, true);
});
