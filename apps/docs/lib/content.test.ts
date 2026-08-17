import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { query } from './graphql';
import {
  getDoc,
  getDocs,
  getPackage,
  getPackages,
  getSearchEntries,
  getSections,
} from './content';

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
        _content: { raw: 'Getting started content.' },
      },
    ],
  };
}

function docPagePayload() {
  return {
    Doc: {
      id: 'getting-started',
      title: 'Getting started',
      summary: 'Start here',
      section: { id: 'start', title: 'Start' },
      related: [
        {
          id: 'next-steps',
          title: 'Next steps',
          summary: 'Keep going',
        },
      ],
      _content: { html: '<p>Read me</p>', timeToRead: 3 },
    },
  };
}

function packagePagePayload() {
  return {
    Package: {
      id: 'core',
      _content: { html: '<p>Core reference</p>', timeToRead: 4 },
    },
  };
}

function packagesPayload(excerpt: string) {
  return {
    allPackages: [
      {
        id: 'core',
        _content: { excerpt, timeToRead: 4 },
      },
    ],
  };
}

function searchPayload(packageBody: string) {
  return {
    allDocs: docsPayload('Getting started').allDocs,
    allPackages: [
      {
        id: 'core',
        _content: { raw: packageBody },
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

  it('returns a complete doc page with valid related entries', async () => {
    vi.mocked(query).mockResolvedValueOnce(docPagePayload() as never);

    await expect(getDoc('getting-started')).resolves.toEqual({
      id: 'getting-started',
      title: 'Getting started',
      summary: 'Start here',
      sectionId: 'start',
      sectionTitle: 'Start',
      related: [
        {
          id: 'next-steps',
          title: 'Next steps',
          summary: 'Keep going',
        },
      ],
      html: '<p>Read me</p>',
      timeToRead: 3,
    });
  });

  it('returns a complete package page', async () => {
    vi.mocked(query).mockResolvedValueOnce(packagePagePayload() as never);

    await expect(getPackage('core')).resolves.toEqual({
      id: 'core',
      html: '<p>Core reference</p>',
      timeToRead: 4,
    });
  });

  it.each([
    ['id', { title: 'Related doc' }],
    ['title', { id: 'related-doc' }],
  ])('rejects a related row without %s', async (field, related) => {
    const payload = docPagePayload();
    vi.mocked(query).mockResolvedValueOnce({
      Doc: { ...payload.Doc, related: [related] },
    } as never);

    await expect(getDoc('getting-started')).rejects.toThrow(
      new RegExp(`Doc\\.related.*${field}`)
    );
  });

  it('rejects a related row with a whitespace-only id', async () => {
    const payload = docPagePayload();
    vi.mocked(query).mockResolvedValueOnce({
      Doc: {
        ...payload.Doc,
        related: [{ id: '   ', title: 'Related doc' }],
      },
    } as never);

    await expect(getDoc('getting-started')).rejects.toThrow(/Doc\.related.*id/);
  });

  it('rejects a null related row', async () => {
    const payload = docPagePayload();
    vi.mocked(query).mockResolvedValueOnce({
      Doc: { ...payload.Doc, related: [null] },
    } as never);

    await expect(getDoc('getting-started')).rejects.toThrow(/Doc\.related.*id/);
  });

  it('preserves an empty related array', async () => {
    const payload = docPagePayload();
    vi.mocked(query).mockResolvedValueOnce({
      Doc: { ...payload.Doc, related: [] },
    } as never);

    await expect(getDoc('getting-started')).resolves.toMatchObject({
      related: [],
    });
  });

  it('returns undefined when a doc is missing', async () => {
    vi.mocked(query).mockResolvedValueOnce({ Doc: null } as never);

    await expect(getDoc('missing')).resolves.toBeUndefined();
  });

  it('returns undefined when a package is missing', async () => {
    vi.mocked(query).mockResolvedValueOnce({ Package: null } as never);

    await expect(getPackage('missing')).resolves.toBeUndefined();
  });

  it('rejects whitespace-only required text', async () => {
    const payload = docPagePayload();
    vi.mocked(query).mockResolvedValueOnce({
      Doc: { ...payload.Doc, title: '   ' },
    } as never);

    await expect(getDoc('getting-started')).rejects.toThrow(/Doc.*title/);
  });

  it('rejects when allDocs is empty', async () => {
    vi.mocked(query).mockResolvedValueOnce({ allDocs: [] } as never);

    await expect(getDocs()).rejects.toThrow(/allDocs/);
  });

  it('rejects when allSections is empty', async () => {
    vi.mocked(query).mockResolvedValueOnce({ allSections: [] } as never);

    await expect(getSections()).rejects.toThrow(/allSections/);
  });

  it('rejects when allPackages is empty', async () => {
    vi.mocked(query).mockResolvedValueOnce({ allPackages: [] } as never);

    await expect(getPackages()).rejects.toThrow(/allPackages/);
  });

  it('rejects when every doc is missing a required field', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      allDocs: [{ id: null, title: null }, { id: 'missing-title' }],
    } as never);

    await expect(getDocs()).rejects.toThrow(/allDocs/);
  });

  it('rejects a search corpus with no valid package rows', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      allDocs: docsPayload('Getting started').allDocs,
      allPackages: [{ id: null }],
    } as never);

    await expect(getSearchEntries()).rejects.toThrow(/allPackages/);
  });

  it('rejects a search corpus with an empty package collection', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      allDocs: docsPayload('Getting started').allDocs,
      allPackages: [],
    } as never);

    await expect(getSearchEntries()).rejects.toThrow(/allPackages/);
  });

  it('keeps searchable text from the end of a long README', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      allDocs: docsPayload('Getting started').allDocs,
      allPackages: [
        {
          id: 'flatbread',
          _content: {
            raw: `${'early words '.repeat(
              500
            )}fieldNameTransform\n\n\`\`\`sh\nnext dev --turbopack\n\`\`\``,
          },
        },
      ],
    } as never);

    const entries = await getSearchEntries();
    expect(entries.find((entry) => entry.id === 'flatbread')?.body).toContain(
      'fieldNameTransform'
    );
    expect(entries.find((entry) => entry.id === 'flatbread')?.body).toContain(
      'turbopack'
    );
  });

  it('removes raw HTML noise and caps package summaries', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      allDocs: docsPayload('Getting started').allDocs,
      allPackages: [
        {
          id: 'flatbread',
          _content: {
            raw: `${'<p><img src="https://example.test/badge.svg"></p>'.repeat(
              20
            )}\n\nFlatbread builds a typed content graph. ${'More detail '.repeat(
              30
            )}`,
          },
        },
      ],
    } as never);

    const entries = await getSearchEntries();
    const flatbread = entries.find((entry) => entry.id === 'flatbread');

    expect(flatbread?.summary).toBe('Flatbread builds a typed content graph.');
    expect(flatbread?.summary.length).toBeLessThanOrEqual(160);
    expect(flatbread?.body).not.toContain('<img');
    expect(flatbread?.body).not.toContain('example.test');
  });

  it('rejects a mixed collection when one doc is missing a required field', async () => {
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

    await expect(getDocs()).rejects.toThrow(/allDocs.*id/);
  });

  it('rejects a doc page without rendered content', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      Doc: {
        id: 'getting-started',
        title: 'Getting started',
        section: { id: 'start', title: 'Start' },
        _content: { html: null },
      },
    } as never);

    await expect(getDoc('getting-started')).rejects.toThrow(/_content\.html/);
  });

  it('rejects a package page without rendered content', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      Package: { id: 'core', _content: { html: '' } },
    } as never);

    await expect(getPackage('core')).rejects.toThrow(/_content\.html/);
  });
});

describe('memoized readers in production', () => {
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

  it('memoizes getPackages across calls', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();

    const { query: prodQuery } = await import('./graphql');
    const { getPackages: getPackagesProd } = await import('./content');

    vi.mocked(prodQuery).mockReset();
    vi.mocked(prodQuery)
      .mockResolvedValueOnce(packagesPayload('Frozen excerpt') as never)
      .mockResolvedValueOnce(packagesPayload('Changed excerpt') as never);

    const first = await getPackagesProd();
    const second = await getPackagesProd();

    expect(prodQuery).toHaveBeenCalledTimes(1);
    expect(first[0]?.excerpt).toBe('Frozen excerpt');
    expect(second[0]?.excerpt).toBe('Frozen excerpt');
  });

  it('memoizes getSearchEntries across calls', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();

    const { query: prodQuery } = await import('./graphql');
    const { getSearchEntries: getSearchEntriesProd } = await import(
      './content'
    );

    vi.mocked(prodQuery).mockReset();
    vi.mocked(prodQuery)
      .mockResolvedValueOnce(
        searchPayload('Frozen package. First build.') as never
      )
      .mockResolvedValueOnce(
        searchPayload('Changed package. Second build.') as never
      );

    const first = await getSearchEntriesProd();
    const second = await getSearchEntriesProd();

    expect(prodQuery).toHaveBeenCalledTimes(1);
    expect(first.find((entry) => entry.id === 'core')?.summary).toBe(
      'Frozen package.'
    );
    expect(second.find((entry) => entry.id === 'core')?.summary).toBe(
      'Frozen package.'
    );
  });
});
