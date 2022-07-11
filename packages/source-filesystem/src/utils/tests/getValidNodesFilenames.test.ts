import test from 'ava';
import getValidNodesFilenames from '../getValidNodesFilenames.js';
import { readDirectory } from './mocks.js';

const dirStructure = {
  Comedy: ['Nine Lives of Tomas Katz, The.md', 'Road to Wellville, The.md'],
  Drama: ['Life for Sale (Life for Sale (Kotirauha).md', 'Lap Dance'],

  Documentary: ['TerrorStorm: A History of Government-Sponsored Terrorism.md'],

  'random file.md': true,
  deeply: {
    nested: ['file.md'],
  },
};

const opts = {
  readDirectory: readDirectory(dirStructure),
};

test('basic flat folder', async (t) => {
  const result = await getValidNodesFilenames('.', ['.md'], opts as any);
  t.snapshot(result);
});

test('basic case', async (t) => {
  const result = await getValidNodesFilenames(
    'deeply/nested',
    ['.md'],
    opts as any
  );
  t.snapshot(result);

  const result2 = await getValidNodesFilenames(
    './deeply/nested',
    ['.md'],
    opts as any
  );
  t.snapshot(result2);
});

test('double level recursion', async (t) => {
  const result = await getValidNodesFilenames(
    'deeply/**/*.md',
    ['.md'],
    opts as any
  );
  t.snapshot(result);
});

test('double level recursion named', async (t) => {
  const result = await getValidNodesFilenames(
    'deeply/[a]/[b].md',
    ['.md'],
    opts as any
  );
  t.snapshot(result);
});

test('single level recursion', async (t) => {
  const result = await getValidNodesFilenames('./*.md', ['.md'], opts as any);
  t.snapshot(result);
});

test('double level recursion named without parent directory', async (t) => {
  const result = await getValidNodesFilenames(
    './[genre]/[title].md',
    ['.md'],
    opts as any
  );
  t.snapshot(result);
});

test('single level named', async (t) => {
  const result = await getValidNodesFilenames(
    './[title].md',
    ['.md'],
    opts as any
  );
  t.snapshot(result);
});

test('double level first named', async (t) => {
  const result = await getValidNodesFilenames(
    './[genre]/*.md',
    ['.md'],
    opts as any
  );
  t.snapshot(result);
});

test('double level second named', async (t) => {
  const result = await getValidNodesFilenames(
    './**/[title].md',
    ['.md'],
    opts as any
  );
  t.snapshot(result);
});

test('triple level', async (t) => {
  const result = await getValidNodesFilenames(
    './[random]/[name]/[title].md',
    ['.md'],
    opts as any
  );
  t.snapshot(result);
});
