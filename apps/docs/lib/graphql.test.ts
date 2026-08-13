import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { parse } from 'graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';

const ping = parse('query { __typename }') as TypedDocumentNode<
  { __typename: string },
  Record<string, never>
>;

describe('query cache key', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('uses one URL stamp within a module load and a new stamp after reload', async () => {
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

    await new Promise((resolve) => setTimeout(resolve, 2));
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
