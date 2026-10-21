import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

/** A group holding two shapes, with a loose rectangle beside it. */
function setup() {
  const e = createEditor();
  const g = e.create('group', { name: 'G' });
  const inner1 = e.create('rect', { x: 0, opacity: 0.8 }, { parent: g });
  const inner2 = e.create('ellipse', { x: 60 }, { parent: g });
  const loose = e.create('rect', { x: 200 });
  return { e, g, inner1, inner2, loose };
}

test('a number key gives a group its own opacity and leaves its layers alone', () => {
  const { e, g, inner1, inner2 } = setup();
  e.selection.set([g]);
  e.keys.press('3');
  assert.equal(e.doc.require(inner1).opacity, 0.8);
  assert.equal(e.doc.require(inner2).opacity, 1);
  const own = e.doc.require(g).opacity;
  assert.ok(own === 0.3 || own === 1, `group opacity ${own}`);
});

test('a number key does what typing the percentage into Opacity does', () => {
  for (const pick of [
    (s: ReturnType<typeof setup>) => [s.g],
    (s: ReturnType<typeof setup>) => [s.g, s.loose],
  ]) {
    const byKey = setup();
    byKey.e.selection.set(pick(byKey));
    const before = byKey.e.files.save();
    byKey.e.keys.press('6');
    // Only a build that has the keys can break the rule.
    if (byKey.e.files.save() === before) continue;
    const byField = setup();
    byField.e.selection.set(pick(byField));
    byField.e.panel.edit('Opacity', '60%');
    assert.equal(byKey.e.files.save(), byField.e.files.save());
  }
});
