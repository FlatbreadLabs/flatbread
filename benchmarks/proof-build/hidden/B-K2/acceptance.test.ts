import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

function setup() {
  const e = createEditor();
  const r = e.create('rect');
  e.selection.set([r]);
  return { e, r };
}

test('Fill takes three-digit shorthand, with or without #', () => {
  const { e } = setup();
  assert.ok(e.panel.edit('Fill', '#f80').ok);
  assert.equal(e.panel.value('Fill'), '#FF8800');
  e.panel.edit('Fill', '0aF');
  assert.equal(e.panel.value('Fill'), '#00AAFF');
});

test('Fill takes six digits with or without #', () => {
  const { e } = setup();
  e.panel.edit('Fill', '12ab9c');
  assert.equal(e.panel.value('Fill'), '#12AB9C');
  e.panel.edit('Fill', '#C0FFEE');
  assert.equal(e.panel.value('Fill'), '#C0FFEE');
});

test('Fill takes rgb() with values from 0 to 255', () => {
  const { e } = setup();
  e.panel.edit('Fill', 'rgb(255, 136, 0)');
  assert.equal(e.panel.value('Fill'), '#FF8800');
  e.panel.edit('Fill', '  RGB( 0,0,255 ) ');
  assert.equal(e.panel.value('Fill'), '#0000FF');
  e.panel.edit('Fill', 'rgb(1,2,3)');
  assert.equal(e.panel.value('Fill'), '#010203');
});

test('Stroke takes the same forms', () => {
  const { e } = setup();
  e.panel.edit('Stroke', '#abc');
  assert.equal(e.panel.value('Stroke'), '#AABBCC');
  e.panel.edit('Stroke', 'rgb(16, 32, 48)');
  assert.equal(e.panel.value('Stroke'), '#102030');
});

test('anything else is refused and changes nothing', () => {
  const { e } = setup();
  e.panel.edit('Fill', '#123456');
  const size = e.history.size;
  for (const bad of [
    'rgb(300, 0, 0)',
    'rgb(1, 2)',
    'rgb(-1, 0, 0)',
    'orange',
    '#ff88',
    '#ggg',
    'rgb(1.5, 2, 3)',
  ])
    assert.equal(e.panel.edit('Fill', bad).ok, false, bad);
  assert.equal(e.panel.value('Fill'), '#123456');
  assert.equal(e.history.size, size);
});
