import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

function setup() {
  const e = createEditor();
  const back = e.create('rect', {
    name: 'Backdrop',
    x: 0,
    y: 0,
    width: 600,
    height: 400,
  });
  const a = e.create('rect', {
    name: 'A',
    x: 40,
    y: 30,
    width: 100,
    height: 50,
  });
  const b = e.create('ellipse', {
    name: 'B',
    x: 300,
    y: 300,
    width: 20,
    height: 20,
  });
  const c = e.create('text', {
    name: 'C',
    text: 'Label',
    x: 200,
    y: 120,
    width: 120,
    height: 20,
  } as never);
  return { e, back, a, b, c };
}
type Editor = ReturnType<typeof createEditor>;
const box = (e: Editor, id: string) => {
  const { x, y, width, height } = e.doc.require(id);
  return { x, y, width, height };
};

test('Frame selection is offered only when something is selected', () => {
  const { e, a } = setup();
  assert.ok(!e.palette.list().includes('Frame selection'));
  e.selection.set([a]);
  assert.ok(e.palette.list().includes('Frame selection'));
});

test('the selected layers go into a new frame that fits around them, which is selected', () => {
  const { e, a, c } = setup();
  const before = { a: box(e, a), c: box(e, c) };
  e.selection.set([c, a]);
  assert.ok(e.palette.run('Frame selection'));
  const [frame] = e.selection.ids();
  assert.equal(e.selection.ids().length, 1);
  assert.equal(e.doc.require(frame).type, 'frame');
  assert.deepEqual([...e.doc.children(frame)], [a, c]);
  assert.deepEqual(box(e, frame), { x: 40, y: 30, width: 280, height: 110 });
  assert.deepEqual({ a: box(e, a), c: box(e, c) }, before);
});

test('the frame takes the place of the frontmost framed layer', () => {
  const { e, back, a, b, c } = setup();
  e.selection.set([a, c]);
  e.palette.run('Frame selection');
  const [frame] = e.selection.ids();
  assert.deepEqual([...e.doc.children(null)], [back, b, frame]);
});

test('layers inside a frame are framed where they are', () => {
  const e = createEditor();
  const screen = e.create('frame', { name: 'Screen', width: 800, height: 600 });
  const one = e.create(
    'rect',
    { name: 'One', x: 10, y: 10, width: 10, height: 10 },
    { parent: screen }
  );
  const two = e.create(
    'rect',
    { name: 'Two', x: 50, y: 20, width: 10, height: 30 },
    { parent: screen }
  );
  const three = e.create(
    'rect',
    { name: 'Three', x: 500, y: 500 },
    { parent: screen }
  );
  e.selection.set([one, two]);
  e.palette.run('Frame selection');
  const [frame] = e.selection.ids();
  assert.equal(e.doc.require(frame).parent, screen);
  assert.deepEqual([...e.doc.children(screen)], [frame, three]);
  assert.deepEqual(box(e, frame), { x: 10, y: 10, width: 50, height: 40 });
});

test('one Undo takes it all back', () => {
  const { e, a, c } = setup();
  const top = [...e.doc.children(null)];
  const size = e.doc.size;
  e.selection.set([a, c]);
  e.palette.run('Frame selection');
  assert.ok(e.history.undo());
  assert.deepEqual([...e.doc.children(null)], top);
  assert.equal(e.doc.size, size);
  assert.deepEqual(e.selection.ids(), [a, c]);
  assert.ok(e.history.redo());
  assert.equal(e.doc.require(e.selection.ids()[0]).type, 'frame');
});
