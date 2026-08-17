import { describe, expect, it } from 'vitest';

import { collectParityProblems, compareIds } from './check-content-parity.mjs';

describe('compareIds', () => {
  it('accepts the same ids in any order', () => {
    expect(
      compareIds(
        'allDocs',
        ['start', 'glossary'],
        [{ id: 'glossary' }, { id: 'start' }]
      )
    ).toEqual([]);
  });

  it('reports missing and unexpected graph ids', () => {
    expect(
      compareIds(
        'allDocs',
        ['start', 'glossary'],
        [{ id: 'start' }, { id: 'extra' }]
      )
    ).toEqual([
      'allDocs missed files: glossary',
      'allDocs returned ids with no file: extra',
    ]);
  });

  it('reports invalid and duplicate graph ids', () => {
    expect(
      compareIds(
        'allPackages',
        ['core'],
        [{ id: 'core' }, { id: 'core' }, { id: null }]
      )
    ).toEqual([
      'allPackages returned a row without an id',
      'allPackages returned duplicate ids: core',
    ]);
  });
});

describe('collectParityProblems', () => {
  it('keeps GraphQL errors from a non-OK response', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        errors: [
          { message: 'Cannot query field' },
          { message: 'Schema is stale' },
        ],
      }),
    });

    await expect(
      collectParityProblems({ fetchImpl, collections: [] })
    ).rejects.toThrow(
      'Flatbread answered 400 during parity check:\nCannot query field\nSchema is stale'
    );
  });

  it('reports a non-JSON HTTP failure by status', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 503,
      json: async () => {
        throw new SyntaxError('not JSON');
      },
    });

    await expect(
      collectParityProblems({ fetchImpl, collections: [] })
    ).rejects.toThrow('Flatbread answered 503 during parity check.');
  });
});
