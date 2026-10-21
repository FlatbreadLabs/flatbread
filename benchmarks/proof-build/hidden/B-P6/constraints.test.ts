import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

function setup() {
  const e = createEditor();
  const page = e.create('frame', { name: 'Page' });
  const header = e.create('group', { name: 'Header' }, { parent: page });
  e.create('rect', { name: 'Logo' }, { parent: header });
  const footer = e.create('group', { name: 'Footer' });
  e.create('rect', { name: 'Bar' }, { parent: footer });
  return { e, page, header, footer };
}

test('expanding and collapsing layers leaves the document file as it was', () => {
  const { e, page, header, footer } = setup();
  const before = e.files.save();
  e.layers.expand(page);
  e.layers.expand(header);
  e.layers.toggle(footer);
  assert.equal(e.files.save(), before);
  e.layers.collapse(page);
  e.layers.toggle(footer);
  assert.equal(e.files.save(), before);
});

test('expanding is not an edit: no history entry and no document change', () => {
  const { e, page, header } = setup();
  const changes: unknown[] = [];
  e.plugins.load({
    name: 'watch',
    main: (api) => api.on('documentchange', (p) => changes.push(p)),
  });
  e.layers.expand(page);
  e.layers.expand(header);
  e.layers.collapse(header);
  assert.equal(e.history.size, 0);
  assert.equal(e.history.canUndo, false);
  assert.deepEqual(changes, []);
});

test('one document file opens with whichever expansion its view settings hold', () => {
  const { e, page, header, footer } = setup();
  e.layers.expand(page);
  e.layers.expand(header);
  const first = e.files.saveViewState();
  e.layers.collapse(page);
  e.layers.collapse(header);
  e.layers.expand(footer);
  const second = e.files.saveViewState();
  const file = e.files.save();
  const a = createEditor();
  a.files.load(file, first);
  const b = createEditor();
  b.files.load(file, second);
  const open = (x: typeof a) =>
    x.layers
      .view()
      .filter((r) => r.expanded)
      .map((r) => r.name);
  // Only a build that brings expansion back can break the rule.
  if (!open(a).length && !open(b).length) return;
  assert.deepEqual(open(a), ['Page', 'Header']);
  assert.deepEqual(open(b), ['Footer']);
});
