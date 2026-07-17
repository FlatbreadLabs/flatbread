import type { LoadedFlatbreadConfig } from '@flatbread/core';
import type { CodegenOptions } from './types.js';

export interface FlatbreadWatchPatterns {
  config: readonly string[];
  content: readonly string[];
  documents: readonly string[];
}

export function deriveFlatbreadWatchPatterns(
  config: LoadedFlatbreadConfig,
  options: Pick<CodegenOptions, 'documents'>
): FlatbreadWatchPatterns {
  const rawExtensions = config.loaded?.extensions || [
    '.md',
    '.mdx',
    '.markdown',
  ];
  const extensions = rawExtensions.map((ext) =>
    ext.startsWith('.') ? ext.slice(1) : ext
  );
  const extensionPattern =
    extensions.length > 1 ? `{${extensions.join(',')}}` : extensions[0];
  return {
    config: ['flatbread.config.*'],
    content: config.content
      .filter((entry) => Boolean(entry.path))
      .map((entry) => `${entry.path}/**/*.${extensionPattern}`),
    documents: options.documents ?? [],
  };
}

export function flattenFlatbreadWatchPatterns(
  patterns: FlatbreadWatchPatterns
): string[] {
  return [...patterns.config, ...patterns.content, ...patterns.documents];
}
