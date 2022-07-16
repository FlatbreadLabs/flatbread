import test from 'ava';
import gatherFileNodes from '../gatherFileNodes';
import { readDirectory } from './mocks';

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
  extensions: ['.md'],
  readDirectory: readDirectory(dirStructure),
};

test('basic flat folder', async (t) => {
  const result = await gatherFileNodes('.', opts);
  t.snapshot(result);
});

test('basic case', async (t) => {
  const result = await gatherFileNodes('deeply/nested', opts);
  t.snapshot(result);

  const result2 = await gatherFileNodes('./deeply/nested', opts);
  t.snapshot(result2);
});

test('double level recursion', async (t) => {
  const result = await gatherFileNodes('deeply/**/*.md', opts);
  t.snapshot(result);
});

test('double level recursion named', async (t) => {
  const result = await gatherFileNodes('deeply/[a]/[b].md', opts);
  t.snapshot(result);
});

test('single level recursion', async (t) => {
  const result = await gatherFileNodes('./*.md', opts as any);
  t.snapshot(result);
});

test('double level recursion named without parent directory', async (t) => {
  const result = await gatherFileNodes('./[genre]/[title].md', opts);
  t.snapshot(result);
});

test('single level named', async (t) => {
  const result = await gatherFileNodes('./[title].md', opts);
  t.snapshot(result);
});

test('double level first named', async (t) => {
  const result = await gatherFileNodes('./[genre]/*.md', opts);
  t.snapshot(result);
});

test('double level second named', async (t) => {
  const result = await gatherFileNodes('./**/[title].md', opts);
  t.snapshot(result);
});

test('triple level', async (t) => {
  const result = await gatherFileNodes('./[random]/[name]/[title].md', opts);
  t.snapshot(result);
});
