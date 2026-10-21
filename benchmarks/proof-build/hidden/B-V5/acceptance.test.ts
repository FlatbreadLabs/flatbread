import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

function setup() {
  let now = 0;
  const e = createEditor({ clock: () => (now += 16) });
  const a = e.create('rect', { x: 0, y: 0, width: 50, height: 50 });
  e.selection.set([a]);
  return { e, a };
}

function hold(
  e: ReturnType<typeof createEditor>,
  chord: string,
  repeats: number
) {
  e.keys.down(chord);
  for (let i = 0; i < repeats; i++) e.keys.down(chord, { repeat: true });
  e.keys.up(chord);
}

test('holding an arrow key keeps nudging', () => {
  const { e, a } = setup();
  hold(e, 'ArrowRight', 5);
  assert.equal(e.doc.require(a).x, 6);
  hold(e, 'Shift+ArrowDown', 2);
  assert.equal(e.doc.require(a).y, 30);
});

test('one Undo takes back the whole hold', () => {
  const { e, a } = setup();
  const before = e.history.size;
  hold(e, 'ArrowLeft', 20);
  assert.equal(e.doc.require(a).x, -21);
  assert.equal(e.history.size, before + 1);
  assert.ok(e.history.undo());
  assert.equal(e.doc.require(a).x, 0);
  assert.ok(e.history.redo());
  assert.equal(e.doc.require(a).x, -21);
});

test('a hold with Shift undoes in one step too', () => {
  const { e, a } = setup();
  hold(e, 'Shift+ArrowUp', 4);
  assert.equal(e.doc.require(a).y, -50);
  e.history.undo();
  assert.equal(e.doc.require(a).y, 0);
});

test('separate presses are separate steps', () => {
  const { e, a } = setup();
  e.keys.press('ArrowRight');
  e.keys.press('ArrowRight');
  e.keys.press('ArrowRight');
  assert.equal(e.doc.require(a).x, 3);
  e.history.undo();
  assert.equal(e.doc.require(a).x, 2);
});

test('a hold after a press is its own step', () => {
  const { e, a } = setup();
  e.keys.press('ArrowRight');
  hold(e, 'ArrowRight', 3);
  assert.equal(e.doc.require(a).x, 5);
  e.history.undo();
  assert.equal(e.doc.require(a).x, 1);
});
