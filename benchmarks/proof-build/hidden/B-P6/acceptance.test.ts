import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

type Editor = ReturnType<typeof createEditor>;

function setup() {
  const e = createEditor();
  const page = e.create('frame', { name: 'Page' });
  const header = e.create('group', { name: 'Header' }, { parent: page });
  e.create('rect', { name: 'Logo' }, { parent: header });
  const nav = e.create('group', { name: 'Nav' }, { parent: page });
  e.create('text', { name: 'Link' }, { parent: nav });
  const footer = e.create('group', { name: 'Footer' });
  e.create('rect', { name: 'Bar' }, { parent: footer });
  return { e, page, header, nav, footer };
}

/** Closes the document and opens it again, as the shell does. */
function reopen(e: Editor): Editor {
  const file = e.files.save();
  const view = e.files.saveViewState();
  const next = createEditor();
  next.files.load(file, view);
  return next;
}

const open = (e: Editor) =>
  e.layers
    .view()
    .filter((r) => r.expanded)
    .map((r) => r.name);

test('groups and frames that were expanded are expanded again after reopening', () => {
  const { e, page, header } = setup();
  e.layers.expand(page);
  e.layers.expand(header);
  const again = reopen(e);
  assert.deepEqual(open(again), ['Page', 'Header']);
  assert.ok(again.layers.isExpanded(page));
  assert.ok(again.layers.isExpanded(header));
  assert.deepEqual(
    again.layers.view().map((r) => r.name),
    ['Footer', 'Page', 'Nav', 'Header', 'Logo']
  );
});

test('collapsed layers stay collapsed', () => {
  const { e, page, header, footer } = setup();
  e.layers.expand(page);
  e.layers.expand(header);
  e.layers.expand(footer);
  e.layers.collapse(header);
  e.layers.toggle(footer);
  assert.deepEqual(open(reopen(e)), ['Page']);
});

test('a document with nothing expanded opens collapsed', () => {
  const { e } = setup();
  assert.deepEqual(open(reopen(e)), []);
});

test('it survives more than one reopen', () => {
  const { e, page, nav } = setup();
  e.layers.expand(page);
  e.layers.expand(nav);
  const third = reopen(reopen(e));
  assert.deepEqual(open(third), ['Page', 'Nav']);
});
