import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';
import { V1_NOTE, V2_POSTER, V5_RESAVED } from './files.ts';

function open(text: string) {
  const e = createEditor();
  e.files.load(text);
  return e;
}
const byName = (e: ReturnType<typeof open>, name: string) =>
  e.doc.all().find((n) => n.name === name)!.id;
function fields(e: ReturnType<typeof open>, name: string) {
  e.selection.set([byName(e, name)]);
  return { fill: e.panel.value('Fill'), stroke: e.panel.value('Stroke') };
}

test('a version 2 file shows named colours as their hex codes', () => {
  const e = open(V2_POSTER);
  assert.deepEqual(fields(e, 'Band'), { fill: '#FF0000', stroke: '#000080' });
  assert.equal(fields(e, 'Poster').fill, '#FFFFFF');
  assert.deepEqual(fields(e, 'Spot'), { fill: '#008080', stroke: '#000000' });
});

test('a version 1 file does too', () => {
  const e = open(V1_NOTE);
  assert.deepEqual(fields(e, 'Sticky'), {
    fill: '#FFFF00',
    stroke: '#808000',
  });
});

test('a file saved again since, still holding the name, is fixed when it opens', () => {
  const e = open(V5_RESAVED);
  assert.deepEqual(fields(e, 'Band'), { fill: '#FF0000', stroke: '#000080' });
});

test('every basic colour name becomes its hex code', () => {
  const names: Record<string, string> = {
    black: '#000000',
    silver: '#C0C0C0',
    gray: '#808080',
    white: '#FFFFFF',
    maroon: '#800000',
    red: '#FF0000',
    purple: '#800080',
    fuchsia: '#FF00FF',
    green: '#008000',
    lime: '#00FF00',
    olive: '#808000',
    yellow: '#FFFF00',
    navy: '#000080',
    blue: '#0000FF',
    teal: '#008080',
    aqua: '#00FFFF',
  };
  for (const [name, hex] of Object.entries(names)) {
    const file = JSON.parse(V1_NOTE);
    file.nodes[0].fill = name;
    const e = open(JSON.stringify(file));
    assert.equal(fields(e, 'Sticky').fill, hex, name);
  }
});

test('hex colours and everything else open as before', () => {
  const e = open(V2_POSTER);
  assert.equal(fields(e, 'Title').fill, '#333333');
  const title = e.doc.require(byName(e, 'Title'));
  assert.equal(title.rotation, Math.PI / 2);
  assert.equal(title.width, 360);
  const band = e.doc.require(byName(e, 'Band')) as any;
  assert.deepEqual(band.strokes, [
    { color: '#000080', width: 2, align: 'inside' },
  ]);
  assert.equal(e.history.size, 0);
  const note = open(V1_NOTE);
  const sticky = note.doc.require(byName(note, 'Sticky'));
  assert.deepEqual([sticky.x, sticky.y, sticky.width], [10, 20, 120]);
});

test('an unknown name is left alone', () => {
  const file = JSON.parse(V1_NOTE);
  file.nodes[0].fill = 'rebeccapurple';
  const e = open(JSON.stringify(file));
  assert.equal(fields(e, 'Sticky').fill, 'REBECCAPURPLE');
});
