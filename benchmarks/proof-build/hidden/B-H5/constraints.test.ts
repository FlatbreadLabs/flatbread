import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEditor } from '../../src/editor.ts';

// U5: picking similar layers stays inside the top-level frame that holds
// the starting layer, at any depth; a layer outside every frame looks only
// at the other layers outside frames.
const RED = [{ color: '#FF0000' }];

function screens() {
  const e = createEditor();
  const red = (name: string, parent?: string, x = 0) =>
    e.create(
      'rect',
      { name, x, fills: RED } as never,
      parent ? { parent } : {}
    );
  const home = e.create('frame', { name: 'Home', width: 400, height: 800 });
  const homeButton = red('Home button', home);
  const homeCard = e.create(
    'frame',
    { name: 'Card', fills: [{ color: '#FFFFFF' }] } as never,
    { parent: home }
  );
  const homeRow = e.create('group', { name: 'Row' }, { parent: homeCard });
  const homeBadge = red('Badge', homeRow, 20);
  const settings = e.create('frame', {
    name: 'Settings',
    x: 500,
    width: 400,
    height: 800,
  });
  red('Settings button', settings, 520);
  const looseGroup = e.create('group', { name: 'Notes' });
  const loose = red('Sticker', undefined, 1000);
  const looseInGroup = red('Arrow', looseGroup, 1100);
  return { e, homeButton, homeBadge, loose, looseInGroup };
}

test('the search stays inside the top-level frame of the selected layer', () => {
  const { e, homeButton, homeBadge } = screens();
  if (!e.palette.has('Select same fill')) return;
  e.selection.set([homeButton]);
  e.palette.run('Select same fill');
  if (e.selection.ids().length < 2) return;
  assert.deepEqual(
    [...e.selection.ids()].sort(),
    [homeBadge, homeButton].sort()
  );
});

test('a layer outside every frame finds only the others outside frames', () => {
  const { e, loose, looseInGroup } = screens();
  if (!e.palette.has('Select same fill')) return;
  e.selection.set([loose]);
  e.palette.run('Select same fill');
  if (e.selection.ids().length < 2) return;
  assert.deepEqual([...e.selection.ids()].sort(), [loose, looseInGroup].sort());
});
