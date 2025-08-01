import { describe, it, expect } from 'vitest';
import { DEFAULT_CODEGEN_OPTIONS } from '../types.js';

describe('types', () => {
  it('should have correct default options', () => {
    expect(DEFAULT_CODEGEN_OPTIONS).toEqual({
      enabled: false,
      outputDir: './generated',
      outputFile: 'graphql.ts',
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      watch: false,
      cache: true,
      documents: [],
      schema: {
        includeIntrospection: false,
        includeDeprecated: true,
      },
    });
  });

  it('should have all required properties in default options', () => {
    const options = DEFAULT_CODEGEN_OPTIONS;

    expect(typeof options.enabled).toBe('boolean');
    expect(typeof options.outputDir).toBe('string');
    expect(typeof options.outputFile).toBe('string');
    expect(Array.isArray(options.plugins)).toBe(true);
    expect(typeof options.watch).toBe('boolean');
    expect(typeof options.cache).toBe('boolean');
    expect(Array.isArray(options.documents)).toBe(true);
    expect(typeof options.schema).toBe('object');
    expect(typeof options.schema.includeIntrospection).toBe('boolean');
    expect(typeof options.schema.includeDeprecated).toBe('boolean');
  });

  it('should include expected default plugins', () => {
    const expectedPlugins = [
      'typescript',
      'typescript-operations',
      'typed-document-node',
    ];

    expect(DEFAULT_CODEGEN_OPTIONS.plugins).toEqual(expectedPlugins);
  });
});
