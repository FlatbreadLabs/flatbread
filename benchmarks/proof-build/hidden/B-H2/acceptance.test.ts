import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

function setup() {
  const e = createEditor();
  const title = e.create('text', {
    name: 'Title',
    text: 'A heading that wraps onto more than one line',
    width: 160,
    fontSize: 24,
  } as never);
  const body = e.create('text', {
    name: 'Body',
    text: 'Short',
    x: 200,
    fontSize: 12,
  } as never);
  const box = e.create('rect', { name: 'Box', x: 400 });
  return { e, title, body, box };
}
type Editor = ReturnType<typeof createEditor>;
const size = (e: Editor, id: string) => (e.doc.require(id) as any).fontSize;

/** The height the text box gets when that font size is typed into the panel. */
function typedHeight(e: Editor, id: string, fontSize: number): number {
  const twin = createEditor();
  const { text, width, lineHeight } = e.doc.require(id) as any;
  const copy = twin.create('text', { text, width, lineHeight } as never);
  twin.selection.set([copy]);
  twin.panel.edit('Font size', String(fontSize));
  return twin.doc.require(copy).height;
}

test('both commands are offered only when the selection has a text layer', () => {
  const { e, title, box } = setup();
  for (const ids of [[], [box]]) {
    e.selection.set(ids);
    assert.ok(!e.palette.list().includes('Increase font size'));
    assert.ok(!e.palette.list().includes('Decrease font size'));
  }
  for (const ids of [[title], [title, box]]) {
    e.selection.set(ids);
    assert.ok(e.palette.list().includes('Increase font size'));
    assert.ok(e.palette.list().includes('Decrease font size'));
  }
});

test('Increase font size makes each selected text layer bigger, from its own size', () => {
  const { e, title, body, box } = setup();
  const boxBefore = structuredClone(e.doc.require(box));
  e.selection.set([title, body, box]);
  assert.ok(e.palette.run('Increase font size'));
  assert.ok(size(e, title) > 24 && size(e, title) <= 48);
  assert.ok(size(e, body) > 12 && size(e, body) <= 24);
  assert.deepEqual(e.doc.require(box), boxBefore);
});

test('Decrease font size makes each selected text layer smaller', () => {
  const { e, title, body } = setup();
  e.selection.set([title, body]);
  assert.ok(e.palette.run('Decrease font size'));
  assert.ok(size(e, title) < 24 && size(e, title) >= 12);
  assert.ok(size(e, body) < 12 && size(e, body) >= 6);
});

test('the text box fits the new size as it does for a typed size', () => {
  const { e, title, body } = setup();
  e.selection.set([title, body]);
  e.palette.run('Increase font size');
  for (const id of [title, body])
    assert.equal(e.doc.require(id).height, typedHeight(e, id, size(e, id)));
  e.palette.run('Decrease font size');
  e.palette.run('Decrease font size');
  for (const id of [title, body])
    assert.equal(e.doc.require(id).height, typedHeight(e, id, size(e, id)));
  e.selection.set([title]);
  assert.equal(e.panel.value('Font size'), String(size(e, title)));
});

test('one Undo takes a whole step back', () => {
  const { e, title, body } = setup();
  const before = [title, body].map((id) => structuredClone(e.doc.require(id)));
  e.selection.set([title, body]);
  const entries = e.history.size;
  e.palette.run('Increase font size');
  assert.equal(e.history.size, entries + 1);
  assert.ok(e.history.undo());
  assert.deepEqual(
    [title, body].map((id) => e.doc.require(id)),
    before
  );
});
