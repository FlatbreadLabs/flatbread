import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { parse } from 'graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';

const ping = parse('query { __typename }') as TypedDocumentNode<
  { __typename: string },
  Record<string, never>
>;

describe('query cache key', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns data from a successful response', async () => {
    const data = { __typename: 'Query' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data }) })
    );

    const { query } = await import('./graphql');
    await expect(query(ping)).resolves.toEqual(data);
  });

  it.each([
    ['production', 'force-cache'],
    ['development', 'no-store'],
    ['test', 'no-store'],
  ])('uses %s cache policy %s', async (nodeEnv, expectedCache) => {
    vi.stubEnv('NODE_ENV', nodeEnv);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { __typename: 'Query' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { query } = await import('./graphql');
    await query(ping);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ cache: expectedCache })
    );
  });

  it('uses one URL stamp within a module load and a new stamp after reload', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { __typename: 'Query' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { query } = await import('./graphql');
    await query(ping);
    await query(ping);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = String(fetchMock.mock.calls[0]?.[0]);
    const second = String(fetchMock.mock.calls[1]?.[0]);
    expect(first).toBe(second);
    expect(new URL(first).searchParams.get('build')).toMatch(/^[0-9a-z]+$/);

    now.mockReturnValue(2_000);
    vi.resetModules();

    const { query: queryAgain } = await import('./graphql');
    await queryAgain(ping);

    const third = String(fetchMock.mock.calls[2]?.[0]);
    expect(third).not.toBe(first);
    expect(new URL(third).searchParams.get('build')).not.toBe(
      new URL(first).searchParams.get('build')
    );
  });
});

describe('query failures', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('reports a non-JSON HTTP failure with the status and endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => {
          throw new SyntaxError('not JSON');
        },
      })
    );

    const { query } = await import('./graphql');
    await expect(query(ping)).rejects.toThrow(
      /Flatbread answered 503.*localhost:5057\/graphql/
    );
  });

  it('reports every GraphQL error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          errors: [{ message: 'Bad field' }, { message: 'Bad variable' }],
        }),
      })
    );

    const { query } = await import('./graphql');
    await expect(query(ping)).rejects.toThrow('Bad field\nBad variable');
  });

  it('keeps GraphQL errors from a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          errors: [{ message: 'Unknown field' }, { message: 'Invalid query' }],
        }),
      })
    );

    const { query } = await import('./graphql');
    await expect(query(ping)).rejects.toThrow(
      'Flatbread answered 400 for a query:\nUnknown field\nInvalid query'
    );
  });

  it('rejects a successful response with no data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    );

    const { query } = await import('./graphql');
    await expect(query(ping)).rejects.toThrow('Flatbread returned no data.');
  });

  it('rejects a successful non-JSON response as missing data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError('not JSON');
        },
      })
    );

    const { query } = await import('./graphql');
    await expect(query(ping)).rejects.toThrow('Flatbread returned no data.');
  });
});
