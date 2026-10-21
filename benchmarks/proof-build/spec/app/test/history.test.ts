import { test } from 'node:test';
import assert from 'node:assert/strict';
import { History, UNDO_LIMIT } from '../src/commands/history.ts';
import { editor, threeRects } from './helpers.ts';

const move = (id: string, dx: number) => ({
  type: 'move',
  payload: { ids: [id], dx, dy: 0 },
});

test('undo and redo walk the entries', () => {
  const { e, a } = threeRects();
  e.commands.dispatch(move(a, 10));
  e.commands.dispatch(move(a, 10));
  assert.equal(e.doc.require(a).x, 20);
  assert.ok(e.history.undo());
  assert.equal(e.doc.require(a).x, 10);
  assert.ok(e.history.redo());
  assert.equal(e.doc.require(a).x, 20);
  assert.ok(e.history.undo() && e.history.undo());
  assert.equal(e.history.undo(), false);
  assert.equal(e.doc.require(a).x, 0);
});

test('a new command clears redo', () => {
  const { e, a } = threeRects();
  e.commands.dispatch(move(a, 10));
  e.history.undo();
  assert.ok(e.history.canRedo);
  e.commands.dispatch(move(a, 5));
  assert.equal(e.history.canRedo, false);
});

test('commands that share a gesture id become one entry', () => {
  const { e, a } = threeRects();
  for (let i = 0; i < 5; i++)
    e.commands.dispatch(move(a, 2), { gesture: 'g-drag' });
  assert.equal(e.history.size, 1);
  assert.equal(e.doc.require(a).x, 10);
  e.history.undo();
  assert.equal(e.doc.require(a).x, 0);
});

test('commands without a gesture id stay apart however close in time', () => {
  const { e, a } = threeRects();
  e.commands.dispatch(move(a, 1));
  e.commands.dispatch(move(a, 1));
  assert.equal(e.history.size, 2);
});

test('different gestures do not merge', () => {
  const { e, a } = threeRects();
  e.commands.dispatch(move(a, 1), { gesture: 'g1' });
  e.commands.dispatch(move(a, 1), { gesture: 'g2' });
  assert.equal(e.history.size, 2);
});

test('undo restores the selection from before the change', () => {
  const { e, a, b } = threeRects();
  e.selection.set([a]);
  e.commands.dispatch(move(b, 5), { select: [b] });
  assert.deepEqual(e.selection.ids(), [b]);
  e.history.undo();
  assert.deepEqual(e.selection.ids(), [a]);
  e.history.redo();
  assert.deepEqual(e.selection.ids(), [b]);
});

test(`history keeps the last ${UNDO_LIMIT} entries`, () => {
  const e = editor();
  const id = e.create('rect');
  for (let i = 0; i < UNDO_LIMIT + 25; i++) e.commands.dispatch(move(id, 1));
  assert.equal(e.history.size, UNDO_LIMIT);
  while (e.history.undo());
  assert.equal(e.doc.require(id).x, 25);
});

test('entries are copies', () => {
  const { e, a } = threeRects();
  e.commands.dispatch(move(a, 3));
  const [entry] = e.history.entries();
  assert.equal(entry.label, 'Move');
  entry.commands.length = 0;
  assert.equal(e.history.entries()[0].commands.length, 1);
});

test('history emits change events', () => {
  const h = new History({ limit: 2 });
  const seen: number[] = [];
  h.events.on('change', ({ size }) => seen.push(size));
  const entry = {
    label: 'x',
    commands: [],
    inverses: [],
    selectionBefore: [],
    selectionAfter: [],
    gesture: null,
    at: 0,
  };
  h.record(entry);
  h.record(entry);
  h.record(entry);
  assert.deepEqual(seen, [1, 2, 2]);
});
