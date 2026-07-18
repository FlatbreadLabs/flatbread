import { describe, expect, it } from 'vitest';
import type { LoadedFlatbreadConfig } from '@flatbread/core';
import {
  deriveFlatbreadWatchPatterns,
  flattenFlatbreadWatchPatterns,
} from '../watchPatterns.js';

function makeConfig(
  overrides: Partial<{
    content: Array<Record<string, unknown>>;
    extensions: string[];
  }> = {}
): LoadedFlatbreadConfig {
  return {
    source: { fetch: async () => ({}) },
    transformer: [],
    fieldNameTransform: (field: string) => field,
    content: overrides.content ?? [
      { path: 'content/posts', collection: 'Post' },
    ],
    loaded: {
      extensions: overrides.extensions ?? ['.md'],
    },
  } as unknown as LoadedFlatbreadConfig;
}

describe('deriveFlatbreadWatchPatterns', () => {
  it('always includes the flatbread config glob', () => {
    const patterns = deriveFlatbreadWatchPatterns(makeConfig(), {});
    expect(patterns.config).toEqual(['flatbread.config.*']);
  });

  it('derives a content glob for a single extension', () => {
    const patterns = deriveFlatbreadWatchPatterns(
      makeConfig({ extensions: ['.md'] }),
      {}
    );
    expect(patterns.content).toEqual(['content/posts/**/*.md']);
  });

  it('derives a brace-expansion content glob for multiple extensions and normalizes leading dots', () => {
    const patterns = deriveFlatbreadWatchPatterns(
      makeConfig({ extensions: ['.md', 'mdx', '.markdown'] }),
      {}
    );
    expect(patterns.content).toEqual(['content/posts/**/*.{md,mdx,markdown}']);
  });

  it('derives one content glob per configured content entry and skips entries without a path', () => {
    const patterns = deriveFlatbreadWatchPatterns(
      makeConfig({
        content: [
          { path: 'content/posts', collection: 'Post' },
          { path: 'content/authors', collection: 'Author' },
          { collection: 'Virtual' },
        ],
        extensions: ['.md'],
      }),
      {}
    );
    expect(patterns.content).toEqual([
      'content/posts/**/*.md',
      'content/authors/**/*.md',
    ]);
  });

  it('passes documents through untouched and defaults to empty', () => {
    const withDocuments = deriveFlatbreadWatchPatterns(makeConfig(), {
      documents: ['src/**/*.graphql', 'queries/*.gql'],
    });
    expect(withDocuments.documents).toEqual([
      'src/**/*.graphql',
      'queries/*.gql',
    ]);

    const withoutDocuments = deriveFlatbreadWatchPatterns(makeConfig(), {});
    expect(withoutDocuments.documents).toEqual([]);
  });
});

describe('flattenFlatbreadWatchPatterns', () => {
  it('concatenates config, content, and documents patterns in order', () => {
    const flattened = flattenFlatbreadWatchPatterns({
      config: ['flatbread.config.*'],
      content: ['content/posts/**/*.md'],
      documents: ['src/**/*.graphql'],
    });
    expect(flattened).toEqual([
      'flatbread.config.*',
      'content/posts/**/*.md',
      'src/**/*.graphql',
    ]);
  });
});
