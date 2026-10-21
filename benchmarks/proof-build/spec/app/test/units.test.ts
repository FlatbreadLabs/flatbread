import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../src/units/expr.ts';
import { parseLength, readLength } from '../src/units/parse.ts';
import { fromPx, toPx, unitFor } from '../src/units/registry.ts';
import {
  formatAngle,
  formatCount,
  formatLength,
  formatPercent,
} from '../src/units/format.ts';

test('parseExpression reads numbers and arithmetic', () => {
  assert.equal(parseExpression('12'), 12);
  assert.equal(parseExpression(' 12px '), 12);
  assert.equal(parseExpression('10 + 5'), 15);
  assert.equal(parseExpression('100 / 4'), 25);
  assert.equal(parseExpression('(8 + 4) * 2'), 24);
  assert.equal(parseExpression('-5 + 2'), -3);
  assert.equal(parseExpression('.5'), 0.5);
});

test('parseExpression rejects what it cannot read', () => {
  for (const bad of ['', 'abc', '1 +', '(1', '1 / 0', '2in', '5 5'])
    assert.equal(parseExpression(bad), null, bad);
});

test('parseLength reads legacy length strings', () => {
  assert.equal(parseLength('12'), 12);
  assert.equal(parseLength('12px'), 12);
  assert.equal(parseLength(' 4.5 px '), 4.5);
  assert.equal(parseLength('-3'), -3);
  assert.equal(parseLength('12pt'), null);
  assert.equal(parseLength('1+1'), null);
});

test('readLength takes numbers or strings and falls back', () => {
  assert.equal(readLength(7), 7);
  assert.equal(readLength('7px'), 7);
  assert.equal(readLength('seven', 3), 3);
  assert.equal(readLength(undefined), 0);
});

test('the unit registry converts to and from px', () => {
  assert.equal(toPx(1, 'in'), 96);
  assert.equal(toPx(72, 'pt'), 96);
  assert.equal(toPx(50, '%', { reference: 300 }), 150);
  assert.equal(toPx(50, '%'), null);
  assert.equal(fromPx(96, 'in'), 1);
  assert.equal(fromPx(150, '%', { reference: 300 }), 50);
  assert.equal(unitFor(' PT ')?.id, 'pt');
  assert.equal(unitFor('cm'), null);
});

test('formatting for fields', () => {
  assert.equal(formatLength(12.3456), '12.35');
  assert.equal(formatLength(12.5), '12.5');
  assert.equal(formatLength(-0.001), '0');
  assert.equal(formatAngle(Math.PI / 4), '45°');
  assert.equal(formatPercent(0.555), '55.5%');
  assert.equal(formatCount(1, 'layer'), '1 layer');
  assert.equal(formatCount(3, 'layer'), '3 layers');
});
