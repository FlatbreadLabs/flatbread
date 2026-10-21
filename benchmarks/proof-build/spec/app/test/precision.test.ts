import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayNumber, sameOnScreen } from '../src/units/precision.ts';
import { editor } from './helpers.ts';

test('display precision depends on the unit', () => {
  assert.equal(displayNumber(1.23456, 'px'), '1.23');
  assert.equal(displayNumber(1.23456, 'in'), '1.235');
  assert.equal(displayNumber(33.333, '%'), '33.3');
  assert.equal(displayNumber(44.96, 'deg'), '45');
});

test('stored geometry is never rounded: ten moves of 0.1 add up to 1', () => {
  const e = editor();
  const id = e.create('rect', { x: 0 });
  e.selection.set([id]);
  for (let i = 0; i < 10; i++)
    e.commands.dispatch({
      type: 'move',
      payload: { ids: [id], dx: 0.1, dy: 0 },
    });
  assert.ok(Math.abs(e.doc.require(id).x - 1) < 1e-9);
  assert.equal(e.panel.value('X'), '1');
});

test('typing a value with more digits than the field shows keeps them', () => {
  const e = editor();
  const id = e.create('rect', { x: 0 });
  e.selection.set([id]);
  e.panel.edit('X', '10.123456');
  assert.equal(e.doc.require(id).x, 10.123456);
  assert.equal(e.panel.value('X'), '10.12');
});

test('values that look the same are the same on screen', () => {
  assert.ok(sameOnScreen(10, 10.000001));
  assert.ok(!sameOnScreen(10, 10.01));
});
