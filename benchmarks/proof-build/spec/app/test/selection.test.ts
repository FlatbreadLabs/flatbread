import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hitNode, hitTarget } from '../src/selection/hit.ts';
import {
  normalizeSelection,
  selectableTarget,
} from '../src/selection/rules.ts';
import { selectionBounds } from '../src/selection/bounds.ts';
import { Selection } from '../src/selection/selection.ts';
import { editor, threeRects } from './helpers.ts';

test('the frontmost node under the point is hit', () => {
  const e = editor();
  const back = e.create('rect', { x: 0, y: 0, width: 100, height: 100 });
  const front = e.create('rect', { x: 50, y: 50, width: 100, height: 100 });
  assert.equal(hitNode(e.doc, { x: 75, y: 75 }), front);
  assert.equal(hitNode(e.doc, { x: 25, y: 25 }), back);
  assert.equal(hitNode(e.doc, { x: 500, y: 500 }), null);
});

test('hidden and locked nodes are never hit', () => {
  const e = editor();
  const back = e.create('rect', { x: 0, y: 0, width: 100, height: 100 });
  const hidden = e.create('rect', {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    visible: false,
  });
  assert.equal(hitNode(e.doc, { x: 10, y: 10 }), back);
  e.doc.update(hidden, { visible: true, locked: true });
  assert.equal(hitNode(e.doc, { x: 10, y: 10 }), back);
});

test('nothing inside a hidden or locked container is hit', () => {
  const e = editor();
  const frame = e.create('frame', {
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    locked: true,
  });
  e.create('rect', { x: 10, y: 10, width: 20, height: 20 }, { parent: frame });
  assert.equal(hitNode(e.doc, { x: 15, y: 15 }), null);
});

test('a click inside a group selects the group; inside a frame, the child', () => {
  const e = editor();
  const frame = e.create('frame', { x: 0, y: 0, width: 300, height: 300 });
  const group = e.create('group', {}, { parent: frame });
  const inGroup = e.create(
    'rect',
    { x: 10, y: 10, width: 20, height: 20 },
    { parent: group }
  );
  const inFrame = e.create(
    'rect',
    { x: 100, y: 100, width: 20, height: 20 },
    { parent: frame }
  );
  assert.equal(hitTarget(e.doc, { x: 15, y: 15 }), group);
  assert.equal(hitTarget(e.doc, { x: 105, y: 105 }), inFrame);
  assert.equal(selectableTarget(e.doc, inGroup), group);
});

test('a selection never holds a node and its ancestor', () => {
  const e = editor();
  const group = e.create('group');
  const child = e.create('rect', {}, { parent: group });
  assert.deepEqual(normalizeSelection(e.doc, [child, group]), [group]);
  assert.deepEqual(normalizeSelection(e.doc, ['missing-1', child]), [child]);
});

test('selection order is the order of selecting, and change events fire once', () => {
  const s = new Selection();
  const events: string[][] = [];
  s.events.on('change', ({ ids }) => events.push(ids));
  s.set(['b', 'a']);
  s.set(['b', 'a']);
  s.add('c');
  s.toggle('b');
  assert.deepEqual(s.ids(), ['a', 'c']);
  assert.deepEqual(events, [
    ['b', 'a'],
    ['b', 'a', 'c'],
    ['a', 'c'],
  ]);
});

test('selection bounds cover every selected node', () => {
  const { e, a, c } = threeRects();
  assert.deepEqual(selectionBounds(e.doc, [a, c]), {
    x: 0,
    y: 0,
    width: 250,
    height: 50,
  });
  assert.equal(selectionBounds(e.doc, []), null);
});
