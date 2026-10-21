import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

type Editor = ReturnType<typeof createEditor>;
const field = (e: Editor, label: string) =>
  e.panel
    .view()
    .sections.flatMap((s) => s.fields)
    .find((f) => f.label === label);

function oneText(text: string) {
  const e = createEditor();
  const t = e.create('text', { text, width: 400 });
  e.selection.set([t]);
  return { e, t };
}

test('a text layer shows its character and word counts', () => {
  const { e } = oneText('Hello brave new\nworld');
  assert.equal(e.panel.value('Characters'), '20');
  assert.equal(e.panel.value('Words'), '4');
});

test('spaces count as characters; line breaks do not; runs of spaces make one gap', () => {
  const { e } = oneText('  two   words  ');
  assert.equal(e.panel.value('Characters'), '15');
  assert.equal(e.panel.value('Words'), '2');
  const empty = oneText('');
  assert.equal(empty.e.panel.value('Characters'), '0');
  assert.equal(empty.e.panel.value('Words'), '0');
  const lines = oneText('a\n\nb\n');
  assert.equal(lines.e.panel.value('Characters'), '2');
  assert.equal(lines.e.panel.value('Words'), '2');
});

test('both fields are read-only', () => {
  const { e } = oneText('Hi there');
  assert.equal(field(e, 'Characters')?.readonly, true);
  assert.equal(field(e, 'Words')?.readonly, true);
  assert.equal(e.panel.edit('Words', '10').ok, false);
  assert.equal(e.panel.value('Words'), '2');
  assert.equal(e.history.size, 0);
});

test('the counts follow edits to the text', () => {
  const { e } = oneText('one');
  e.panel.edit('Text', 'one two three');
  assert.equal(e.panel.value('Words'), '3');
  assert.equal(e.panel.value('Characters'), '13');
  e.history.undo();
  assert.equal(e.panel.value('Words'), '1');
});

test('several text layers show Mixed when their counts differ', () => {
  const e = createEditor();
  const a = e.create('text', { text: 'same size' });
  const b = e.create('text', { text: 'size same' });
  const c = e.create('text', { text: 'longer text here' });
  e.selection.set([a, b]);
  assert.equal(e.panel.value('Characters'), '9');
  assert.equal(e.panel.value('Words'), '2');
  e.selection.set([a, c]);
  assert.equal(e.panel.value('Characters'), 'Mixed');
  assert.equal(e.panel.value('Words'), 'Mixed');
});

test('other layers do not show the counts', () => {
  const e = createEditor();
  const r = e.create('rect');
  e.selection.set([r]);
  assert.equal(e.panel.value('Characters'), undefined);
  assert.equal(e.panel.value('Words'), undefined);
});
