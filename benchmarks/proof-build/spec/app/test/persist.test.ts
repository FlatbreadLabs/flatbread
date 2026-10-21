import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFile } from '../src/persist/deserialize.ts';
import { SCHEMA_VERSION } from '../src/persist/schema.ts';
import { parseViewState } from '../src/persist/viewstate.ts';
import { editor, fixture } from './helpers.ts';

function sample() {
  const e = editor();
  const f = e.create('frame', { name: 'Card', x: 0, y: 0 });
  e.create('text', { name: 'Title', text: 'Hi' }, { parent: f });
  const g = e.create('group', { name: 'Icons' }, { parent: f });
  e.create('ellipse', { name: 'Dot', x: 10, y: 10 }, { parent: g });
  return e;
}

test('a saved document loads back the same', () => {
  const e = sample();
  const saved = e.files.save();
  assert.equal(JSON.parse(saved).version, SCHEMA_VERSION);
  const other = editor();
  other.files.load(saved);
  assert.deepEqual(other.doc.toJSON(), e.doc.toJSON());
  assert.equal(other.files.save(), saved);
});

test('loading clears selection and history', () => {
  const e = sample();
  const saved = e.files.save();
  const [first] = e.doc.children(null);
  e.selection.set([first]);
  e.commands.dispatch({
    type: 'move',
    payload: { ids: [first], dx: 1, dy: 0 },
  });
  e.files.load(saved);
  assert.deepEqual(e.selection.ids(), []);
  assert.equal(e.history.size, 0);
});

test('ids minted after a load never repeat loaded ones', () => {
  const e = sample();
  const other = editor();
  other.files.load(e.files.save());
  const id = other.create('rect');
  assert.ok(!e.doc.has(id));
});

test('the fixture document round-trips', () => {
  const text = fixture('doc-v5.json');
  const e = editor();
  e.files.load(text);
  const saved = JSON.parse(e.files.save());
  const original = JSON.parse(text);
  assert.equal(saved.name, original.name);
  assert.deepEqual(saved.top, original.top);
  assert.deepEqual(Object.keys(saved.nodes), Object.keys(original.nodes));
  for (const [id, node] of Object.entries(original.nodes))
    for (const [key, value] of Object.entries(node as object))
      assert.deepEqual(saved.nodes[id][key], value, `${id}.${key}`);
});

test('a file from a newer editor is refused', () => {
  assert.throws(
    () =>
      parseFile(
        JSON.stringify({
          version: SCHEMA_VERSION + 1,
          name: 'x',
          top: [],
          nodes: {},
        })
      ),
    /reads up to/
  );
  assert.throws(() => parseFile('{nope'), /not JSON/);
  assert.throws(() => parseFile('{"name":"x"}'), /schema version/);
});

test('a broken tree is refused', () => {
  const data = {
    version: SCHEMA_VERSION,
    name: 'x',
    top: ['rect-1'],
    nodes: {},
  };
  assert.throws(() => parseFile(JSON.stringify(data)), /missing node/);
});

test('zoom and collapsed sections come back through saveViewState', () => {
  const e = sample();
  e.canvas.setZoom(2);
  e.panel.toggleSection('stroke');
  const view = e.files.saveViewState();
  const other = editor();
  other.files.load(e.files.save(), view);
  const restored = other.files.viewState();
  assert.equal(restored.zoom, 2);
  assert.deepEqual(restored.collapsedSections, ['stroke']);
  other.files.load(e.files.save());
  assert.equal(other.files.viewState().zoom, 1);
});

test('a malformed view state falls back to the default', () => {
  const bad = parseViewState('{bad');
  assert.equal(bad.zoom, 1);
  assert.deepEqual(bad.collapsedSections, []);
  const odd = parseViewState({
    zoom: 1000,
    collapsedSections: ['a', 3] as never,
  });
  assert.equal(odd.zoom, 64);
  assert.deepEqual(odd.collapsedSections, ['a']);
});
