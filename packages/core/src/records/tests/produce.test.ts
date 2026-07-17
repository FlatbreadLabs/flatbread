import test from 'ava';
import { VFile } from 'vfile';
import { produceRecords } from '../produce';
import type { LoadedFlatbreadConfig, Transformer } from '../../types';

function config(transformer: Transformer[]): LoadedFlatbreadConfig {
  return { transformer } as LoadedFlatbreadConfig;
}

test('routes each VFile to the transformer registered for its extension', (t) => {
  const calls: string[] = [];
  const markdown: Transformer = {
    extensions: ['.md'],
    inspect: String,
    parse: (file) => {
      calls.push(`md:${file.path}`);
      return { id: 'md' };
    },
  };
  const yaml: Transformer = {
    extensions: ['.yaml'],
    inspect: String,
    parse: (file) => {
      calls.push(`yaml:${file.path}`);
      return { id: 'yaml' };
    },
  };
  const result = produceRecords(
    {
      First: [new VFile({ path: 'a.md', value: '' })],
      Second: [new VFile({ path: 'b.yaml', value: '' })],
    },
    config([markdown, yaml])
  );
  t.deepEqual(calls, ['md:a.md', 'yaml:b.yaml']);
  t.deepEqual(Object.keys(result), ['First', 'Second']);
  t.deepEqual(
    result.First.map((node) => node.id),
    ['md']
  );
  t.deepEqual(
    result.Second.map((node) => node.id),
    ['yaml']
  );
});

test('rejects a VFile without a matching transformer', (t) => {
  const error = t.throws(() =>
    produceRecords(
      { Missing: [new VFile({ path: 'virtual/missing.txt', value: '' })] },
      config([{ extensions: ['.md'], inspect: String }])
    )
  );
  t.is(error?.message, 'no transformer found for virtual/missing.txt');
});

test('core source context overwrites transformer path and filename', (t) => {
  const file = new VFile({ path: 'virtual/real.md', value: '' });
  const result = produceRecords(
    { Docs: [file] },
    config([
      {
        extensions: ['.md'],
        inspect: String,
        parse: () => ({
          _path: 'wrong',
          _filename: 'wrong.md',
          _slug: 'real',
        }),
      },
    ])
  );
  t.deepEqual(result.Docs[0], {
    _path: file.path,
    _filename: file.basename,
    _slug: 'real',
  });
});

test('preserves capture data spread by the transformer', (t) => {
  const file = new VFile({ path: 'virtual/hello.md', value: '' });
  file.data = { category: 'news', slug: 'hello' };
  const result = produceRecords(
    { Docs: [file] },
    config([
      {
        extensions: ['.md'],
        inspect: String,
        parse: (input) => ({
          ...input.data,
          category: 'document',
          id: 'hello',
        }),
      },
    ])
  );
  t.deepEqual(result.Docs[0], {
    category: 'document',
    slug: 'hello',
    id: 'hello',
    _path: file.path,
    _filename: file.basename,
  });
  t.deepEqual(file.data, { category: 'news', slug: 'hello' });
});
