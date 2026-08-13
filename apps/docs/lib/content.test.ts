import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { query } from './graphql';
import { getDocs, getSections } from './content';

vi.mock('./graphql', () => ({ query: vi.fn() }));

function docsPayload(title: string) {
  return {
    allDocs: [
      {
        id: 'getting-started',
        title,
        summary: 'Start here',
        order: 1,
        section: { id: 'start', title: 'Start' },
      },
    ],
  };
}

describe('content readers', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('re-queries getDocs outside production when the corpus changes', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce(docsPayload('Old title') as never)
      .mockResolvedValueOnce(docsPayload('New title') as never);

    const first = await getDocs();
    const second = await getDocs();

    expect(query).toHaveBeenCalledTimes(2);
    expect(first[0]?.title).toBe('Old title');
    expect(second[0]?.title).toBe('New title');
  });

  it('rejects when allDocs is empty', async () => {
    vi.mocked(query).mockResolvedValueOnce({ allDocs: [] } as never);

    await expect(getDocs()).rejects.toThrow(/allDocs/);
  });

  it('rejects when allSections is empty', async () => {
    vi.mocked(query).mockResolvedValueOnce({ allSections: [] } as never);

    await expect(getSections()).rejects.toThrow(/allSections/);
  });

  it('drops a doc that is missing a required field', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      allDocs: [
        {
          id: 'getting-started',
          title: 'Getting started',
          summary: 'Start here',
          order: 1,
          section: { id: 'start' },
        },
        { id: null },
      ],
    } as never);

    await expect(getDocs()).resolves.toEqual([
      {
        id: 'getting-started',
        title: 'Getting started',
        summary: 'Start here',
        order: 1,
        sectionId: 'start',
      },
    ]);
  });
});

describe('getDocs in production', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('holds the first answer across calls', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();

    const { query: prodQuery } = await import('./graphql');
    const { getDocs: getDocsProd } = await import('./content');

    vi.mocked(prodQuery).mockReset();
    vi.mocked(prodQuery).mockResolvedValue(docsPayload('Frozen') as never);

    const first = await getDocsProd();
    const second = await getDocsProd();

    expect(prodQuery).toHaveBeenCalledTimes(1);
    expect(first[0]?.title).toBe('Frozen');
    expect(second[0]?.title).toBe('Frozen');
  });
});
