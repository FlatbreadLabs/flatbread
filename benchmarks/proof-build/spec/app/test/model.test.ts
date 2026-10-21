import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Document } from '../src/model/document.ts';
import { createIdSource } from '../src/util/ids.ts';
import { createFrame, createGroup, createRect } from '../src/model/factory.ts';
import {
  ancestors,
  commonParent,
  descendants,
  paintOrder,
  sortByPaintOrder,
  topmostOnly,
} from '../src/model/tree.ts';
import { byType, findByName, visibleNodes } from '../src/model/query.ts';

function setup() {
  const ids = createIdSource();
  const doc = new Document('Test');
  const frame = createFrame(ids, { x: 0, y: 0, width: 400, height: 300 });
  doc.insert(frame, null);
  const r1 = createRect(ids, { x: 10, y: 10, width: 20, height: 20 });
  const r2 = createRect(ids, { x: 50, y: 50, width: 20, height: 20 });
  doc.insert(r1, frame.id);
  doc.insert(r2, frame.id);
  return { ids, doc, frame: frame.id, r1: r1.id, r2: r2.id };
}

test('insert links parent and child both ways', () => {
  const { doc, frame, r1, r2 } = setup();
  assert.equal(doc.require(r1).parent, frame);
  assert.deepEqual(doc.children(frame), [r1, r2]);
  assert.deepEqual(doc.children(null), [frame]);
});

test('insert refuses duplicate ids and non-container parents', () => {
  const { doc, r1, r2 } = setup();
  assert.throws(() => doc.insert({ ...doc.require(r1) }, null), /duplicate/);
  const ids = createIdSource(100);
  assert.throws(() => doc.insert(createRect(ids), r2), /cannot hold/);
});

test('remove takes the whole subtree and reports every id', () => {
  const { doc, frame, r1, r2 } = setup();
  const seen: string[][] = [];
  doc.events.on('change', ({ ids }) => seen.push(ids));
  const removed = doc.remove(frame);
  assert.deepEqual(
    removed.map((n) => n.id),
    [frame, r1, r2]
  );
  assert.equal(doc.size, 0);
  assert.deepEqual(seen, [[frame, r1, r2]]);
});

test('place moves within and across parents', () => {
  const { doc, frame, r1, r2 } = setup();
  doc.place(r1, frame, 1);
  assert.deepEqual(doc.children(frame), [r2, r1]);
  doc.place(r2, null, 0);
  assert.deepEqual(doc.children(null), [r2, frame]);
  assert.equal(doc.require(r2).parent, null);
});

test('place refuses to put a node inside itself', () => {
  const { doc, ids, frame } = setup();
  const inner = createFrame(ids);
  doc.insert(inner, frame);
  assert.throws(() => doc.place(frame, inner.id, 0), /into itself/);
});

test('update refuses structural keys', () => {
  const { doc, r1 } = setup();
  assert.throws(() => doc.update(r1, { parent: null }), /place/);
  doc.update(r1, { name: 'Renamed' });
  assert.equal(doc.require(r1).name, 'Renamed');
});

test('a group takes the bounds of its children', () => {
  const { doc, ids, frame, r1, r2 } = setup();
  const group = createGroup(ids);
  doc.insert(group, frame);
  doc.place(r1, group.id, 0);
  doc.place(r2, group.id, 1);
  const g = doc.require(group.id);
  assert.deepEqual([g.x, g.y, g.width, g.height], [10, 10, 60, 60]);
  doc.update(r2, { x: 100 });
  assert.equal(doc.require(group.id).width, 110);
});

test('tree helpers', () => {
  const { doc, frame, r1, r2 } = setup();
  assert.deepEqual(
    ancestors(doc, r1).map((n) => n.id),
    [frame]
  );
  assert.deepEqual(
    descendants(doc, frame).map((n) => n.id),
    [r1, r2]
  );
  assert.deepEqual([...paintOrder(doc).keys()], [frame, r1, r2]);
  assert.deepEqual(sortByPaintOrder(doc, [r2, frame, r1]), [frame, r1, r2]);
  assert.deepEqual(topmostOnly(doc, [r1, frame]), [frame]);
  assert.equal(commonParent(doc, [r1, r2]), frame);
  assert.equal(commonParent(doc, [r1, frame]), null);
});

test('queries walk in paint order and skip hidden subtrees', () => {
  const { doc, frame, r1 } = setup();
  assert.equal(byType(doc, 'rect').length, 2);
  assert.equal(findByName(doc, doc.require(r1).name)?.id, r1);
  doc.update(frame, { visible: false });
  assert.equal(visibleNodes(doc).length, 0);
});

test('toJSON and from round-trip', () => {
  const { doc } = setup();
  const copy = Document.from(doc.toJSON());
  assert.deepEqual(copy.toJSON(), doc.toJSON());
});
