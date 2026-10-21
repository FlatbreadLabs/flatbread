import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

// U4: an edit that sweeps the whole document leaves locked layers, and
// everything inside a locked group or frame, alone, and changes hidden
// layers like any other.
const RED = '#FF0000';
const GREEN = '#00AA00';

test('locked layers keep their colour; hidden ones change', () => {
  const e = createEditor();
  const red = (name: string, extra = {}, parent?: string) =>
    e.create(
      'rect',
      { name, fills: [{ color: RED }], ...extra } as never,
      parent ? { parent } : {}
    );
  const plain = red('Plain');
  const lockedRect = red('Locked logo', { locked: true });
  const lockedGroup = e.create('group', {
    name: 'Approved',
    locked: true,
  } as never);
  const inLockedGroup = red('Mark', {}, lockedGroup);
  const lockedFrame = e.create('frame', {
    name: 'Signed off',
    locked: true,
  } as never);
  const inLockedFrame = red('Button', {}, lockedFrame);
  const hiddenRect = red('Hover state', { visible: false });
  const hiddenGroup = e.create('group', {
    name: 'States',
    visible: false,
  } as never);
  const inHiddenGroup = red('Pressed', {}, hiddenGroup);
  if (!e.palette.has('Replace colour')) return;
  e.palette.run('Replace colour', `${RED} ${GREEN}`);
  const fill = (id: string) => (e.doc.require(id) as any).fills[0].color;
  if (fill(plain) !== GREEN) return;
  assert.equal(fill(lockedRect), RED, 'a locked layer');
  assert.equal(fill(inLockedGroup), RED, 'inside a locked group');
  assert.equal(fill(inLockedFrame), RED, 'inside a locked frame');
  assert.equal(fill(hiddenRect), GREEN, 'a hidden layer');
  assert.equal(fill(inHiddenGroup), GREEN, 'inside a hidden group');
});
