import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChord, parseChord } from '../src/keys/chords.ts';
import { threeRects } from './helpers.ts';

test('chords have one spelling', () => {
  assert.equal(normalizeChord('shift+cmd+h'), 'Mod+Shift+H');
  assert.equal(normalizeChord('Ctrl+Alt+left'), 'Mod+Alt+ArrowLeft');
  assert.equal(normalizeChord('esc'), 'Escape');
  assert.equal(normalizeChord('Mod+]'), 'Mod+]');
  assert.deepEqual(parseChord('Shift+A'), {
    key: 'A',
    mod: false,
    alt: false,
    shift: true,
  });
  assert.throws(() => parseChord('Shift'), /names no key/);
});

test('arrow keys nudge the selection by 1, with Shift by 10', () => {
  const { e, a } = threeRects();
  e.selection.set([a]);
  e.keys.press('ArrowRight');
  e.keys.press('Shift+ArrowDown');
  assert.deepEqual([e.doc.require(a).x, e.doc.require(a).y], [1, 10]);
  assert.equal(e.history.size, 2);
});

test('Mod+Z and Mod+Shift+Z work from any scope', () => {
  const { e, a } = threeRects();
  e.selection.set([a]);
  e.keys.press('ArrowRight');
  e.keys.focus('panel');
  assert.ok(e.keys.press('Mod+Z'));
  assert.equal(e.doc.require(a).x, 0);
  e.keys.focus('layers');
  e.keys.press('Mod+Shift+Z');
  assert.equal(e.doc.require(a).x, 1);
});

test('a key does what its focused scope says', () => {
  const { e, a, b } = threeRects();
  e.selection.set([a]);
  e.keys.focus('layers');
  e.keys.press('ArrowUp');
  assert.deepEqual(e.selection.ids(), [b]);
  assert.equal(e.doc.require(a).y, 0);
  e.keys.focus('panel');
  assert.equal(e.keys.press('ArrowUp'), false);
  e.keys.press('Escape');
  assert.equal(e.keys.scope, 'canvas');
});

test('canvas shortcuts run palette commands', () => {
  const { e, a, b } = threeRects();
  e.selection.set([a, b]);
  e.keys.press('Mod+G');
  const [group] = e.selection.ids();
  assert.equal(e.doc.require(group).type, 'group');
  e.keys.press('Delete');
  assert.equal(e.doc.size, 1);
  e.keys.press('Mod+A');
  assert.equal(e.selection.ids().length, 1);
  e.keys.press('Escape');
  assert.deepEqual(e.selection.ids(), []);
});

test('Mod+Shift+L toggles lock', () => {
  const { e, a } = threeRects();
  e.selection.set([a]);
  e.keys.press('Mod+Shift+L');
  assert.equal(e.doc.require(a).locked, true);
  e.keys.press('Mod+Shift+L');
  assert.equal(e.doc.require(a).locked, false);
});

test('held keys repeat', () => {
  const { e, a } = threeRects();
  e.selection.set([a]);
  e.keys.down('ArrowRight');
  e.keys.down('ArrowRight', { repeat: true });
  e.keys.down('ArrowRight', { repeat: true });
  e.keys.up('ArrowRight');
  assert.equal(e.doc.require(a).x, 3);
});

test('unbound chords do nothing', () => {
  const { e } = threeRects();
  assert.equal(e.keys.press('Mod+Alt+Q'), false);
});
