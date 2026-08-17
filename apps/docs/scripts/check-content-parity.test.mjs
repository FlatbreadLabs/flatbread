import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
  it('matches GraphQL ids against files in a real directory', async () => {
    await withDiskCollection(['start', 'glossary'], async (collections) => {
      const fetchImpl = graphResponse({
        allDocs: [{ id: 'glossary' }, { id: 'start' }],
      });

      await expect(
        collectParityProblems({ fetchImpl, collections })
      ).resolves.toEqual([]);
    });
  });

  it('reports graph ids missing from and extra to a real directory', async () => {
    await withDiskCollection(['start', 'glossary'], async (collections) => {
      const fetchImpl = graphResponse({
        allDocs: [{ id: 'start' }, { id: 'extra' }],
      });

      await expect(
        collectParityProblems({ fetchImpl, collections })
      ).resolves.toEqual([
        'allDocs missed files: glossary',
        'allDocs returned ids with no file: extra',
      ]);
    });
  });

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

  it.each([
    [
      'non-JSON response',
      async () => {
        throw new SyntaxError('not JSON');
      },
    ],
    ['null data', async () => ({ data: null })],
  ])('rejects a successful %s', async (_label, json) => {
    const fetchImpl = async () => ({ ok: true, status: 200, json });

    await expect(
      collectParityProblems({ fetchImpl, collections: [] })
    ).rejects.toThrow('Flatbread returned no parity data.');
  });
});

function graphResponse(data) {
  return async () => ({
    ok: true,
    status: 200,
    json: async () => ({ data }),
  });
}

async function withDiskCollection(ids, run) {
  const root = mkdtempSync(join(tmpdir(), 'docs-parity-'));
  const directory = join(root, 'docs');
  mkdirSync(directory, { recursive: true });

  try {
    for (const id of ids) {
      writeFileSync(join(directory, `${id}.md`), `# ${id}\n`);
    }
    return await run([['allDocs', directory, '.md']]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
