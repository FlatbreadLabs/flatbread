import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  effectiveOpacity,
  parseColor,
  withFillColor,
  withStroke,
} from '../src/model/style.ts';
import { autoHeight, lineCount, wrapLines } from '../src/model/text.ts';
import { editor } from './helpers.ts';

test('parseColor reads #rrggbb in any case', () => {
  assert.equal(parseColor('#a1b2c3'), '#A1B2C3');
  assert.equal(parseColor('  A1B2C3 '), '#A1B2C3');
  assert.equal(parseColor('#abc'), null);
  assert.equal(parseColor('red'), null);
});

test('withFillColor replaces the first paint only', () => {
  const fills = withFillColor(
    [{ color: '#000000' }, { color: '#FFFFFF' }],
    '#FF0000'
  );
  assert.deepEqual(fills, [{ color: '#FF0000' }, { color: '#FFFFFF' }]);
  assert.deepEqual(withFillColor([], '#FF0000'), [{ color: '#FF0000' }]);
});

test('withStroke adds a default stroke when there is none', () => {
  assert.deepEqual(withStroke([], { width: 3 }), [
    { color: '#000000', width: 3, align: 'inside' },
  ]);
});

test('a group has its own opacity, multiplied into its children', () => {
  const e = editor();
  const g = e.create('group');
  const r = e.create('rect', { opacity: 0.5 }, { parent: g });
  assert.equal(effectiveOpacity(e.doc, r), 0.5);
  e.doc.update(g, { opacity: 0.5 });
  assert.equal(effectiveOpacity(e.doc, r), 0.25);
  assert.equal(e.doc.require(r).opacity, 0.5);
});

test('frames multiply into their children too', () => {
  const e = editor();
  const f = e.create('frame', { opacity: 0.8 });
  const r = e.create('rect', {}, { parent: f });
  assert.ok(Math.abs(effectiveOpacity(e.doc, r) - 0.8) < 1e-12);
});

test('text wraps at spaces and inside long words', () => {
  assert.deepEqual(wrapLines('aaa bbb ccc', 9.6 * 7, 16), ['aaa bbb', 'ccc']);
  assert.deepEqual(wrapLines('abcdefghij', 9.6 * 4, 16), [
    'abcd',
    'efgh',
    'ij',
  ]);
  assert.deepEqual(wrapLines('one\ntwo', 1000, 16), ['one', 'two']);
});

test('autoHeight follows line count, size and line height', () => {
  const node = {
    text: 'aaa bbb ccc',
    width: 9.6 * 7,
    fontSize: 16,
    lineHeight: 1.5,
  };
  assert.equal(lineCount(node), 2);
  assert.equal(autoHeight(node), 48);
});
