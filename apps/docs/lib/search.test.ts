import { describe, expect, it } from 'vitest';
import type { SearchEntry } from './content';
import { search } from './search';

function entry(
  overrides: Partial<SearchEntry> & Pick<SearchEntry, 'id' | 'title'>
): SearchEntry {
  return {
    href: `/${overrides.id}/`,
    kind: 'guide',
    group: 'Guides',
    summary: '',
    body: '',
    ...overrides,
  };
}

describe('search', () => {
  it('returns no hits for a query shorter than two characters', () => {
    const entries = [entry({ id: 'a', title: 'Alpha', body: 'alpha' })];

    expect(search(entries, '')).toEqual([]);
    expect(search(entries, 'a')).toEqual([]);
  });

  it('returns no hits for a whitespace-only query', () => {
    const entries = [entry({ id: 'a', title: 'Alpha', body: 'alpha' })];

    expect(search(entries, '   ')).toEqual([]);
    expect(search(entries, '\t\n')).toEqual([]);
  });

  it('returns no hits unless every term matches', () => {
    const entries = [
      entry({ id: 'a', title: 'Alpha', summary: 'one', body: 'one' }),
    ];

    expect(search(entries, 'alpha beta')).toEqual([]);
  });

  it('ranks title-prefix above title, summary, and body', () => {
    const prefix = entry({
      id: 'prefix',
      title: 'alpha guide',
      summary: 'other',
      body: 'other',
    });
    const title = entry({
      id: 'title',
      title: 'the alpha page',
      summary: 'other',
      body: 'other',
    });
    const summary = entry({
      id: 'summary',
      title: 'elsewhere',
      summary: 'talks about alpha',
      body: 'other',
    });
    const body = entry({
      id: 'body',
      title: 'elsewhere too',
      summary: 'nope',
      body: 'the word alpha appears here',
    });

    const hits = search([body, summary, title, prefix], 'alpha');

    expect(hits.map((hit) => hit.entry.id)).toEqual([
      'prefix',
      'title',
      'summary',
      'body',
    ]);
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
    expect(hits[1].score).toBeGreaterThan(hits[2].score);
    expect(hits[2].score).toBeGreaterThan(hits[3].score);
  });

  it('caps hits at the given limit and defaults to 8', () => {
    const entries = Array.from({ length: 10 }, (_, index) =>
      entry({
        id: `hit-${index}`,
        title: `match ${index}`,
        body: 'match',
      })
    );

    expect(search(entries, 'match')).toHaveLength(8);
    expect(search(entries, 'match', 3)).toHaveLength(3);
  });

  it('quotes the body around the first term', () => {
    const body = `${'x'.repeat(50)}needle${'y'.repeat(50)}`;
    const [hit] = search(
      [entry({ id: 's', title: 's', body, summary: 'sum' })],
      'needle'
    );

    expect(hit.snippet.includes('needle')).toBe(true);
    expect(hit.snippet.endsWith('…')).toBe(true);
  });

  it('adds a leading ellipsis only when the quote does not start at the beginning', () => {
    const deep = `${'x'.repeat(50)}needle${'y'.repeat(50)}`;
    const atStart = `needle${'y'.repeat(50)}`;

    const [deepHit] = search(
      [entry({ id: 'deep', title: 'deep', body: deep, summary: 'sum' })],
      'needle'
    );
    const [startHit] = search(
      [entry({ id: 'start', title: 'start', body: atStart, summary: 'sum' })],
      'needle'
    );

    expect(deepHit.snippet.startsWith('…')).toBe(true);
    expect(startHit.snippet.startsWith('…')).toBe(false);
    expect(startHit.snippet.startsWith('needle')).toBe(true);
  });

  it('falls back to the summary when the term is absent from the body', () => {
    const summary = 'A short summary of the page.';
    const [hit] = search(
      [
        entry({
          id: 's',
          title: 'needle in title',
          body: 'nothing here',
          summary,
        }),
      ],
      'needle'
    );

    expect(hit.snippet).toBe(summary);
  });

  it('matches without regard to case', () => {
    const entries = [
      entry({ id: 'g', title: 'GraphQL', summary: 'API', body: 'schema' }),
    ];

    expect(search(entries, 'graphql')).toHaveLength(1);
    expect(search(entries, 'GRAPHQL')).toHaveLength(1);
  });

  it('normalizes punctuation in queries the same way as the corpus', () => {
    const entries = [
      entry({
        id: 'g',
        title: 'Runtime flags',
        body: 'Inspect content or start Next with turbopack.',
      }),
    ];

    expect(search(entries, '_content')).toHaveLength(1);
    expect(search(entries, '--turbopack')).toHaveLength(1);
  });
});
