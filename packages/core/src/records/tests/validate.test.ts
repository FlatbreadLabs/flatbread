import test from 'ava';
import { validateRecords } from '../validate';
import type { LoadedFlatbreadConfig } from '../../types';

const config = (
  content: LoadedFlatbreadConfig['content']
): LoadedFlatbreadConfig => ({ content } as LoadedFlatbreadConfig);

test('reports duplicate normalized IDs with the existing sorted message', (t) => {
  const error = t.throws(() =>
    validateRecords(
      {
        Author: [
          { id: ' 123 ', _path: 'b.md' },
          { id: 123, _path: 'a.md' },
        ],
      },
      config([{ collection: 'Author' }])
    )
  );
  t.is(
    error?.message,
    'Flatbread found 1 invalid record ID:\n- Author record id "123" is duplicated after normalization (b.md) (a.md)'
  );
});

test('reports invalid IDs with the existing aggregate text', (t) => {
  const error = t.throws(() =>
    validateRecords(
      { Author: [{ id: false }, { id: '' }, { id: 'valid' }] },
      config([{ collection: 'Author' }])
    )
  );
  t.is(
    error?.message,
    'Flatbread found 2 invalid record IDs:\n- Author record id must be a non-empty string or finite number identifier.\n- Author record id must be a non-empty string or finite number identifier.'
  );
});

test('delegates reference validation without changing diagnostics', (t) => {
  const error = t.throws(() =>
    validateRecords(
      {
        Author: [{ id: 'known' }],
        Post: [
          {
            id: 'post',
            author: 'missing',
            authors: ['missing', false],
            ghost: 'nobody',
          },
        ],
      },
      config([
        {
          collection: 'Post',
          refs: { author: 'Author', authors: 'Author', ghost: 'Missing' },
        },
      ])
    )
  );
  t.is(
    error?.message,
    'Flatbread found 4 broken references:\n' +
      '- Post.author (in record id "post") references "missing" but no record with that id exists in collection Author\n' +
      '- Post.authors[0] (in record id "post") references "missing" but no record with that id exists in collection Author\n' +
      '- Post.authors[1] (in record id "post") has an invalid reference value for collection Author: reference value must be a non-empty string or finite number identifier.\n' +
      '- Post.ghost (in record id "post") declares a reference to collection Missing, but no such collection is configured'
  );
});

test('checks identifiers before references', (t) => {
  const error = t.throws(() =>
    validateRecords(
      { Post: [{ id: '', author: 'missing' }] },
      config([{ collection: 'Post', refs: { author: 'Author' } }])
    )
  );
  t.regex(error?.message ?? '', /^Flatbread found 1 invalid record ID/);
  t.false((error?.message ?? '').includes('broken reference'));
});
