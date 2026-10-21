import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

/** An editor whose clock the test moves by hand. */
function setup() {
  const clock = { now: 0 };
  const e = createEditor({ clock: () => clock.now });
  const a = e.create('rect', { x: 0, y: 0, width: 50, height: 50 });
  e.selection.set([a]);
  return { e, a, clock };
}

/** History entries one hold of `chord` makes, with `gap` ms between repeats. */
function entriesForHold(chord: string, repeats: number, gap: number) {
  const { e, clock } = setup();
  e.keys.down(chord);
  for (let i = 0; i < repeats; i++) {
    clock.now += gap;
    e.keys.down(chord, { repeat: true });
  }
  e.keys.up(chord);
  return e.history.size;
}

test('how fast a key repeats does not change what a hold becomes in history', () => {
  for (const chord of ['ArrowRight', 'Shift+ArrowDown'])
    assert.equal(
      entriesForHold(chord, 4, 1500),
      entriesForHold(chord, 4, 16),
      chord
    );
});

test('two holds a moment apart make twice the entries of one', () => {
  const one = entriesForHold('ArrowDown', 1, 1);
  const { e, clock } = setup();
  for (let n = 0; n < 2; n++) {
    e.keys.down('ArrowDown');
    clock.now += 1;
    e.keys.down('ArrowDown', { repeat: true });
    e.keys.up('ArrowDown');
    clock.now += 1;
  }
  assert.equal(e.history.size, 2 * one);
});

test('separate presses with no time between them stay apart', () => {
  const { e, a } = setup();
  for (let i = 0; i < 3; i++) e.keys.press('ArrowLeft');
  assert.equal(e.history.size, 3);
  e.history.undo();
  assert.equal(e.doc.require(a).x, -2);
});
