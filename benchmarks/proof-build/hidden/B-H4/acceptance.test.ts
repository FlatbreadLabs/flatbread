import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

const RED = '#FF0000';
const GREEN = '#00AA00';
const BLUE = '#0000FF';

function setup() {
  const e = createEditor();
  const screen = e.create('frame', { name: 'Screen', width: 800, height: 600 });
  const icons = e.create('group', { name: 'Icons' }, { parent: screen });
  const dot = e.create(
    'ellipse',
    { name: 'Dot', fills: [{ color: RED }] } as never,
    { parent: icons }
  );
  const ring = e.create(
    'ellipse',
    {
      name: 'Ring',
      x: 50,
      fills: [{ color: BLUE }],
      strokes: [{ color: RED, width: 2, align: 'inside' }],
    } as never,
    { parent: icons }
  );
  const label = e.create(
    'text',
    { name: 'Label', text: 'Sale', y: 200, fills: [{ color: RED }] } as never,
    { parent: screen }
  );
  const loose = e.create('rect', {
    name: 'Loose',
    x: 900,
    fills: [{ color: RED }],
  } as never);
  const other = e.create('rect', {
    name: 'Other',
    x: 1100,
    fills: [{ color: BLUE }],
  } as never);
  return { e, screen, dot, ring, label, loose, other };
}
type Editor = ReturnType<typeof createEditor>;
const fill = (e: Editor, id: string) =>
  (e.doc.require(id) as any).fills[0]?.color;
const stroke = (e: Editor, id: string) =>
  (e.doc.require(id) as any).strokes[0]?.color;

test('every fill and stroke in the first colour gets the second, whatever is selected', () => {
  const { e, screen, dot, ring, label, loose, other } = setup();
  assert.ok(e.palette.run('Replace colour', '#ff0000 #00aa00'));
  assert.equal(fill(e, dot), GREEN);
  assert.equal(stroke(e, ring), GREEN);
  assert.equal(fill(e, ring), BLUE);
  assert.equal(fill(e, label), GREEN);
  assert.equal(fill(e, loose), GREEN);
  assert.equal(fill(e, other), BLUE);
  assert.equal(fill(e, screen), '#FFFFFF');
});

test('the selection does not limit it', () => {
  const { e, dot, loose, other } = setup();
  e.selection.set([other]);
  e.palette.run('Replace colour', `${RED} ${GREEN}`);
  assert.equal(fill(e, dot), GREEN);
  assert.equal(fill(e, loose), GREEN);
  assert.equal(fill(e, other), BLUE);
});

test('input it cannot read changes nothing', () => {
  const { e } = setup();
  const saved = e.files.save();
  for (const input of [
    'red green',
    '#FF0000',
    '',
    'FF0000 to 00AA00',
    '#GG0000 #00AA00',
  ]) {
    e.palette.run('Replace colour', input);
    assert.equal(e.files.save(), saved, `input "${input}"`);
  }
  assert.equal(e.history.size, 0);
});

test('one Undo puts the old colour back everywhere', () => {
  const { e } = setup();
  const saved = e.files.save();
  e.palette.run('Replace colour', `${RED} ${GREEN}`);
  assert.notEqual(e.files.save(), saved);
  assert.equal(e.history.size, 1);
  assert.ok(e.history.undo());
  assert.equal(e.files.save(), saved);
});
