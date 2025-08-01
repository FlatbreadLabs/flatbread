import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { generateTypes } from '../generator.js';
import { clearCache, loadCache, saveCache } from '../cache.js';
import type { LoadedFlatbreadConfig } from '@flatbread/core';
import type { CodegenOptions, CodegenCache } from '../types.js';
import { buildSchema } from 'graphql';

/**
 * Tests for cache invalidation and regeneration scenarios
 * Verifies that caching works correctly and invalidates when it should
 */
describe('cache invalidation', () => {
  let tempDir: string;
  let testOutputDir: string;
  let mockConfig: LoadedFlatbreadConfig;

  const testSchema = buildSchema(`
    type Query {
      posts: [Post!]!
      authors: [Author!]!
    }
    
    type Post {
      id: String!
      title: String!
      content: String
    }
    
    type Author {
      id: String!
      name: String!
      bio: String
    }
  `);

  beforeEach(async () => {
    const uniqueId = randomBytes(8).toString('hex');
    tempDir = join(tmpdir(), `flatbread-cache-test-${uniqueId}`);
    testOutputDir = join(tempDir, 'generated');

    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(testOutputDir, { recursive: true });

    mockConfig = {
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
          path: join(tempDir, 'content'),
        },
      ],
      fieldNameTransform: (field: string) => field,
      loaded: {
        extensions: ['.md'],
      },
    };
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  it('should create valid cache on first generation', async () => {
    const options: CodegenOptions = {
      enabled: true,
      outputDir: testOutputDir,
      outputFile: 'graphql.ts',
      plugins: ['typescript'],
      cache: true,
    };

    const result = await generateTypes(testSchema, mockConfig, options);
    expect(result.success).toBe(true);
    expect(result.fromCache).toBe(false);

    // Verify cache file was created
    const cacheFile = join(testOutputDir, '.flatbread-codegen-cache.json');
    const cacheExists = await fs
      .access(cacheFile)
      .then(() => true)
      .catch(() => false);
    expect(cacheExists).toBe(true);

    // Verify cache content structure
    const cache = await loadCache(testOutputDir);
    expect(cache).toBeDefined();
    expect(cache?.configHash).toBeDefined();
    expect(cache?.schemaHash).toBeDefined();
    expect(cache?.timestamp).toBeDefined();
    expect(cache?.files).toBeDefined();
    expect(Array.isArray(cache?.files)).toBe(true);
  });

  it('should use cache when inputs are unchanged', async () => {
    const options: CodegenOptions = {
      enabled: true,
      outputDir: testOutputDir,
      outputFile: 'graphql.ts',
      plugins: ['typescript'],
      cache: true,
    };

    // First generation
    const result1 = await generateTypes(testSchema, mockConfig, options);
    expect(result1.success).toBe(true);
    expect(result1.fromCache).toBe(false);

    // Second generation with same inputs
    const result2 = await generateTypes(testSchema, mockConfig, options);
    expect(result2.success).toBe(true);
    expect(result2.fromCache).toBe(true);
    expect(result2.configHash).toBe(result1.configHash);
  });

  it('should invalidate cache when schema changes', async () => {
    const options: CodegenOptions = {
      enabled: true,
      outputDir: testOutputDir,
      outputFile: 'graphql.ts',
      plugins: ['typescript'],
      cache: true,
    };

    // First generation
    const result1 = await generateTypes(testSchema, mockConfig, options);
    expect(result1.fromCache).toBe(false);

    // Generate with different schema
    const modifiedSchema = buildSchema(`
      type Query {
        posts: [Post!]!
        authors: [Author!]!
        categories: [Category!]!
      }
      
      type Post {
        id: String!
        title: String!
        content: String
        category: Category
      }
      
      type Author {
        id: String!
        name: String!
        bio: String
      }
      
      type Category {
        id: String!
        name: String!
      }
    `);

    const result2 = await generateTypes(modifiedSchema, mockConfig, options);
    expect(result2.fromCache).toBe(false);
    expect(result2.configHash).not.toBe(result1.configHash);
  });

  it('should invalidate cache when config changes', async () => {
    const options1: CodegenOptions = {
      enabled: true,
      outputDir: testOutputDir,
      outputFile: 'graphql.ts',
      plugins: ['typescript'],
      cache: true,
    };

    // First generation
    const result1 = await generateTypes(testSchema, mockConfig, options1);
    expect(result1.fromCache).toBe(false);

    // Generate with different options
    const options2: CodegenOptions = {
      ...options1,
      plugins: ['typescript', 'typescript-operations'],
    };

    const result2 = await generateTypes(testSchema, mockConfig, options2);
    expect(result2.fromCache).toBe(false);
    expect(result2.configHash).not.toBe(result1.configHash);
  });

  it('should invalidate cache when plugin config changes', async () => {
    const options1: CodegenOptions = {
      enabled: true,
      outputDir: testOutputDir,
      outputFile: 'graphql.ts',
      plugins: ['typescript'],
      cache: true,
      pluginConfig: {
        typescript: {
          enumsAsTypes: true,
        },
      },
    };

    const result1 = await generateTypes(testSchema, mockConfig, options1);
    expect(result1.fromCache).toBe(false);

    // Generate with different plugin config
    const options2: CodegenOptions = {
      ...options1,
      pluginConfig: {
        typescript: {
          enumsAsTypes: false, // Changed value
        },
      },
    };

    const result2 = await generateTypes(testSchema, mockConfig, options2);
    expect(result2.fromCache).toBe(false);
    expect(result2.configHash).not.toBe(result1.configHash);
  });

  it('should invalidate cache when documents change', async () => {
    // Create initial document
    const queryFile1 = join(tempDir, 'query1.graphql');
    await fs.writeFile(
      queryFile1,
      `
      query GetPosts {
        posts {
          id
          title
        }
      }
    `
    );

    const options: CodegenOptions = {
      enabled: true,
      outputDir: testOutputDir,
      outputFile: 'graphql.ts',
      plugins: ['typescript', 'typescript-operations'],
      documents: [queryFile1],
      cache: true,
    };

    const result1 = await generateTypes(testSchema, mockConfig, options);
    expect(result1.fromCache).toBe(false);

    // Create additional document
    const queryFile2 = join(tempDir, 'query2.graphql');
    await fs.writeFile(
      queryFile2,
      `
      query GetAuthors {
        authors {
          id
          name
        }
      }
    `
    );

    const optionsWithNewDoc: CodegenOptions = {
      ...options,
      documents: [queryFile1, queryFile2],
    };

    const result2 = await generateTypes(
      testSchema,
      mockConfig,
      optionsWithNewDoc
    );
    expect(result2.fromCache).toBe(false);
    expect(result2.configHash).not.toBe(result1.configHash);
  });

  it('should handle document path changes correctly', async () => {
    const queryFile1 = join(tempDir, 'query1.graphql');
    await fs.writeFile(
      queryFile1,
      `
      query GetPosts {
        posts {
          id
          title
        }
      }
    `
    );

    const options1: CodegenOptions = {
      enabled: true,
      outputDir: testOutputDir,
      outputFile: 'graphql.ts',
      plugins: ['typescript', 'typescript-operations'],
      documents: [queryFile1],
      cache: true,
    };

    const result1 = await generateTypes(testSchema, mockConfig, options1);
    expect(result1.fromCache).toBe(false);

    // Second generation with same file should use cache
    const result2 = await generateTypes(testSchema, mockConfig, options1);
    expect(result2.fromCache).toBe(true);

    // Create a different file and change the documents array
    const queryFile2 = join(tempDir, 'query2.graphql');
    await fs.writeFile(
      queryFile2,
      `
      query GetAuthors {
        authors {
          id
          name
        }
      }
    `
    );

    const options2: CodegenOptions = {
      ...options1,
      documents: [queryFile1, queryFile2], // Changed documents array
    };

    const result3 = await generateTypes(testSchema, mockConfig, options2);
    expect(result3.fromCache).toBe(false); // Should invalidate cache due to document changes
  });

  it('should handle corrupted cache gracefully', async () => {
    const options: CodegenOptions = {
      enabled: true,
      outputDir: testOutputDir,
      outputFile: 'graphql.ts',
      plugins: ['typescript'],
      cache: true,
    };

    // Create corrupted cache file
    const cacheFile = join(testOutputDir, '.flatbread-codegen-cache.json');
    await fs.writeFile(cacheFile, 'invalid json content');

    // Should still generate successfully and create new cache
    const result = await generateTypes(testSchema, mockConfig, options);
    expect(result.success).toBe(true);
    expect(result.fromCache).toBe(false);

    // Verify cache was recreated with valid content
    const cache = await loadCache(testOutputDir);
    expect(cache).toBeDefined();
    expect(cache?.configHash).toBeDefined();
  });

  it('should handle missing cache file gracefully', async () => {
    const options: CodegenOptions = {
      enabled: true,
      outputDir: testOutputDir,
      outputFile: 'graphql.ts',
      plugins: ['typescript'],
      cache: true,
    };

    // Delete cache file if it exists
    const cacheFile = join(testOutputDir, '.flatbread-codegen-cache.json');
    try {
      await fs.unlink(cacheFile);
    } catch {
      // File might not exist
    }

    // Should generate successfully without cache
    const result = await generateTypes(testSchema, mockConfig, options);
    expect(result.success).toBe(true);
    expect(result.fromCache).toBe(false);

    // Verify cache was created
    const cacheExists = await fs
      .access(cacheFile)
      .then(() => true)
      .catch(() => false);
    expect(cacheExists).toBe(true);
  });

  it('should clear cache completely', async () => {
    const options: CodegenOptions = {
      enabled: true,
      outputDir: testOutputDir,
      outputFile: 'graphql.ts',
      plugins: ['typescript'],
      cache: true,
    };

    // Generate with cache
    const result1 = await generateTypes(testSchema, mockConfig, options);
    expect(result1.fromCache).toBe(false);

    // Verify cache exists
    const cacheFile = join(testOutputDir, '.flatbread-codegen-cache.json');
    const cacheExistsBefore = await fs
      .access(cacheFile)
      .then(() => true)
      .catch(() => false);
    expect(cacheExistsBefore).toBe(true);

    // Clear cache
    await clearCache(testOutputDir);

    // Verify cache is gone
    const cacheExistsAfter = await fs
      .access(cacheFile)
      .then(() => true)
      .catch(() => false);
    expect(cacheExistsAfter).toBe(false);

    // Next generation should not use cache
    const result2 = await generateTypes(testSchema, mockConfig, options);
    expect(result2.fromCache).toBe(false);
  });

  it('should save and load cache correctly', async () => {
    const testCache: CodegenCache = {
      configHash: 'test-config-hash',
      schemaHash: 'test-schema-hash',
      timestamp: Date.now(),
      files: ['graphql.ts'],
      options: {
        enabled: true,
        outputDir: testOutputDir,
        outputFile: 'graphql.ts',
        plugins: ['typescript'],
        cache: true,
      },
    };

    // Save cache
    await saveCache(testOutputDir, testCache);

    // Load cache
    const loadedCache = await loadCache(testOutputDir);

    expect(loadedCache).toEqual(testCache);
  });

  it('should maintain cache consistency across multiple generations', async () => {
    const options: CodegenOptions = {
      enabled: true,
      outputDir: testOutputDir,
      outputFile: 'graphql.ts',
      plugins: ['typescript'],
      cache: true,
    };

    // Multiple generations with same inputs
    const results = [];
    for (let i = 0; i < 5; i++) {
      const result = await generateTypes(testSchema, mockConfig, options);
      results.push(result);
    }

    // First should be from generation, rest from cache
    expect(results[0].fromCache).toBe(false);

    for (let i = 1; i < results.length; i++) {
      expect(results[i].fromCache).toBe(true);
      expect(results[i].configHash).toBe(results[0].configHash);
    }
  });
});
