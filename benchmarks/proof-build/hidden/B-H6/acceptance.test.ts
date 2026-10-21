import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

type Editor = ReturnType<typeof createEditor>;
const box = (e: Editor, id: string) => {
  const { x, y, width, height } = e.doc.require(id);
  return { x, y, width, height };
};

function assertWhole(e: Editor, id: string, was: ReturnType<typeof box>) {
  const now = box(e, id);
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    assert.ok(Number.isInteger(now[key]), `${key} ${now[key]} is whole`);
    assert.ok(
      Math.abs(now[key] - was[key]) <= 1,
      `${key} moved from ${was[key]} to ${now[key]}`
    );
  }
}

test('the selected layers end up on whole pixels', () => {
  const e = createEditor();
  const a = e.create('rect', {
    name: 'A',
    x: 10.3,
    y: 4.6,
    width: 20.2,
    height: 9.7,
  });
  const b = e.create('ellipse', {
    name: 'B',
    x: 99.5,
    y: 0.25,
    width: 30.4,
    height: 30.4,
  });
  const before = { a: box(e, a), b: box(e, b) };
  e.selection.set([a, b]);
  assert.ok(e.palette.run('Round to pixels'));
  assertWhole(e, a, before.a);
  assertWhole(e, b, before.b);
  e.selection.set([a]);
  for (const label of ['X', 'Y', 'W', 'H'])
    assert.match(e.panel.value(label)!, /^-?\d+$/, label);
});

test('layers inside selected groups and frames are rounded too; others are not', () => {
  const e = createEditor();
  const frame = e.create('frame', {
    name: 'Icon',
    x: 0.4,
    y: 0.6,
    width: 47.8,
    height: 48.3,
  });
  const inFrame = e.create(
    'rect',
    { name: 'Body', x: 4.2, y: 4.7, width: 20.6, height: 11.1 },
    { parent: frame }
  );
  const group = e.create('group', { name: 'Marks' });
  const inGroup = e.create(
    'rect',
    { name: 'Tick', x: 100.7, y: 3.3, width: 5.5, height: 2.2 },
    { parent: group }
  );
  const untouched = e.create('rect', {
    name: 'Other',
    x: 300.5,
    y: 1.5,
    width: 2.5,
    height: 2.5,
  });
  const before = {
    frame: box(e, frame),
    inFrame: box(e, inFrame),
    inGroup: box(e, inGroup),
    untouched: box(e, untouched),
  };
  e.selection.set([frame, group]);
  e.palette.run('Round to pixels');
  assertWhole(e, frame, before.frame);
  assertWhole(e, inFrame, before.inFrame);
  assertWhole(e, inGroup, before.inGroup);
  assertWhole(e, group, before.inGroup);
  assert.deepEqual(box(e, untouched), before.untouched);
});

test('one Undo puts them all back exactly', () => {
  const e = createEditor();
  const ids = [0.1, 1.2, 2.3].map((f, i) =>
    e.create('rect', {
      name: `R${i}`,
      x: i * 50 + f,
      y: f,
      width: 20 + f,
      height: 10 + f,
    })
  );
  const before = ids.map((id) => box(e, id));
  e.selection.set(ids);
  e.palette.run('Round to pixels');
  assert.equal(e.history.size, 1);
  assert.ok(e.history.undo());
  assert.deepEqual(
    ids.map((id) => box(e, id)),
    before
  );
});

test('it is offered when something is selected', () => {
  const e = createEditor();
  const a = e.create('rect', { name: 'A' });
  assert.ok(!e.palette.list().includes('Round to pixels'));
  e.selection.set([a]);
  assert.ok(e.palette.list().includes('Round to pixels'));
});
