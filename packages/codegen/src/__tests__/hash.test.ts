import { describe, it, expect } from 'vitest';
import {
  hashConfig,
  hashSchema,
  hashDocuments,
  hashCodegenInputs,
} from '../hash.js';
import type { LoadedFlatbreadConfig } from '@flatbread/core';
import type { CodegenOptions } from '../types.js';

describe('hash functions', () => {
  const mockConfig: LoadedFlatbreadConfig = {
    source: {
      fetch: async () => ({}),
    },
    transformer: [
      {
        extensions: ['.md'],
        inspect: () => 'markdown',
      },
    ],
    content: [
      {
        collection: 'Post',
        path: 'content/posts',
      },
    ],
    fieldNameTransform: (field: string) => field,
    loaded: {
      extensions: ['.md'],
    },
  };

  const mockOptions: CodegenOptions = {
    enabled: true,
    outputDir: './src/generated',
    outputFile: 'graphql.ts',
  };

  it('should generate consistent hashes for the same configuration', () => {
    const hash1 = hashConfig(mockConfig, mockOptions);
    const hash2 = hashConfig(mockConfig, mockOptions);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA256 hex length
  });

  it('should generate different hashes for different configurations', () => {
    const options2 = { ...mockOptions, outputDir: './dist' };

    const hash1 = hashConfig(mockConfig, mockOptions);
    const hash2 = hashConfig(mockConfig, options2);

    expect(hash1).not.toBe(hash2);
  });

  it('should generate consistent hashes for the same schema', () => {
    const schema = 'type Query { hello: String }';

    const hash1 = hashSchema(schema);
    const hash2 = hashSchema(schema);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should generate different hashes for different schemas', () => {
    const schema1 = 'type Query { hello: String }';
    const schema2 = 'type Query { goodbye: String }';

    const hash1 = hashSchema(schema1);
    const hash2 = hashSchema(schema2);

    expect(hash1).not.toBe(hash2);
  });

  it('should generate consistent hashes for the same documents', () => {
    const documents = [
      'query GetPosts { posts { id } }',
      'query GetAuthors { authors { id } }',
    ];

    const hash1 = hashDocuments(documents);
    const hash2 = hashDocuments(documents);

    expect(hash1).toBe(hash2);
  });

  it('should generate same hash regardless of document order', () => {
    const documents1 = ['query A { a }', 'query B { b }'];
    const documents2 = ['query B { b }', 'query A { a }'];

    const hash1 = hashDocuments(documents1);
    const hash2 = hashDocuments(documents2);

    expect(hash1).toBe(hash2);
  });

  it('should generate comprehensive hash for all codegen inputs', () => {
    const schema = 'type Query { hello: String }';
    const documents = ['query Test { hello }'];

    const hash1 = hashCodegenInputs(mockConfig, mockOptions, schema, documents);
    const hash2 = hashCodegenInputs(mockConfig, mockOptions, schema, documents);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should generate different hashes when any input changes', () => {
    const schema = 'type Query { hello: String }';
    const documents = ['query Test { hello }'];
    const options2 = { ...mockOptions, cache: false };

    const hash1 = hashCodegenInputs(mockConfig, mockOptions, schema, documents);
    const hash2 = hashCodegenInputs(mockConfig, options2, schema, documents);

    expect(hash1).not.toBe(hash2);
  });
});
