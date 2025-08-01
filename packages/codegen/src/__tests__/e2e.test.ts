import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { generateTypes } from '../generator.js';
import { clearCache } from '../cache.js';
import type { LoadedFlatbreadConfig } from '@flatbread/core';
import type { CodegenOptions } from '../types.js';
import { buildSchema } from 'graphql';

/**
 * End-to-end tests for the codegen package
 * Tests the full workflow from configuration to generated TypeScript files
 */
describe('codegen end-to-end', () => {
  let tempDir: string;
  let testOutputDir: string;
  let mockConfig: LoadedFlatbreadConfig;

  // Mock schema for testing
  const testSchema = buildSchema(`
    scalar Date
    scalar JSON
    
    type Query {
      hello: String
      posts: [Post!]!
      post(id: String!): Post
    }
    
    type Post {
      id: String!
      title: String!
      content: String
      publishedAt: Date
      metadata: JSON
      author: Author
    }
    
    type Author {
      id: String!
      name: String!
      email: String
    }
  `);

  beforeEach(async () => {
    // Create unique temporary directory for each test
    const uniqueId = randomBytes(8).toString('hex');
    tempDir = join(tmpdir(), `flatbread-codegen-test-${uniqueId}`);
    testOutputDir = join(tempDir, 'generated');

    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(testOutputDir, { recursive: true });

    // Create mock configuration
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
          path: join(tempDir, 'content/posts'),
        },
      ],
      fieldNameTransform: (field: string) => field,
      loaded: {
        extensions: ['.md'],
      },
    };

    // Create content directory structure
    await fs.mkdir(join(tempDir, 'content/posts'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('basic generation', () => {
    it('should generate TypeScript types from GraphQL schema', async () => {
      const options: CodegenOptions = {
        enabled: true,
        outputDir: testOutputDir,
        outputFile: 'graphql.ts',
        plugins: ['typescript'],
        cache: false, // Disable cache for predictable testing
      };

      const result = await generateTypes(testSchema, mockConfig, options);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toMatch(/graphql\.ts$/);

      // Verify the generated file exists and contains expected types
      const generatedFile = join(testOutputDir, 'graphql.ts');
      const fileExists = await fs
        .access(generatedFile)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      const content = await fs.readFile(generatedFile, 'utf-8');
      expect(content).toContain('Post');
      expect(content).toContain('Author');
      expect(content).toContain('Query');
    });

    it('should generate types with operations when documents are provided', async () => {
      // Create a test GraphQL query file
      const queryFile = join(tempDir, 'test.graphql');
      const queryContent = `
        query GetPosts {
          posts {
            id
            title
            author {
              name
            }
          }
        }
        
        query GetPost($id: String!) {
          post(id: $id) {
            id
            title
            content
          }
        }
      `;
      await fs.writeFile(queryFile, queryContent);

      const options: CodegenOptions = {
        enabled: true,
        outputDir: testOutputDir,
        outputFile: 'graphql.ts',
        plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
        documents: [queryFile],
        cache: false,
      };

      const result = await generateTypes(testSchema, mockConfig, options);

      expect(result.success).toBe(true);

      const content = await fs.readFile(
        join(testOutputDir, 'graphql.ts'),
        'utf-8'
      );
      expect(content).toContain('GetPostsQuery');
      expect(content).toContain('GetPostQuery');
      expect(content).toContain('GetPostQueryVariables');
      expect(content).toContain('TypedDocumentNode');
    });

    it('should respect cache when inputs are unchanged', async () => {
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
    });

    it('should invalidate cache when configuration changes', async () => {
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

      // Change configuration
      const modifiedOptions = { ...options, outputFile: 'types.ts' };
      const result2 = await generateTypes(
        testSchema,
        mockConfig,
        modifiedOptions
      );
      expect(result2.fromCache).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should clear cache and force regeneration', async () => {
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

      // Second call should use cache
      const result2 = await generateTypes(testSchema, mockConfig, options);
      expect(result2.fromCache).toBe(true);

      // Clear cache
      await clearCache(testOutputDir);

      // Third call should regenerate
      const result3 = await generateTypes(testSchema, mockConfig, options);
      expect(result3.fromCache).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle invalid plugin configuration gracefully', async () => {
      const options: CodegenOptions = {
        enabled: true,
        outputDir: testOutputDir,
        outputFile: 'graphql.ts',
        plugins: ['nonexistent-plugin' as any], // Invalid plugin
        cache: false,
      };

      const result = await generateTypes(testSchema, mockConfig, options);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing output directory', async () => {
      const nonExistentDir = join(tempDir, 'non-existent');

      const options: CodegenOptions = {
        enabled: true,
        outputDir: nonExistentDir,
        outputFile: 'graphql.ts',
        plugins: ['typescript'],
        cache: false,
      };

      // Should create directory and succeed
      const result = await generateTypes(testSchema, mockConfig, options);
      expect(result.success).toBe(true);

      // Verify directory was created
      const dirExists = await fs
        .access(nonExistentDir)
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(true);
    });
  });

  describe('plugin configuration', () => {
    it('should apply custom plugin configuration', async () => {
      const options: CodegenOptions = {
        enabled: true,
        outputDir: testOutputDir,
        outputFile: 'graphql.ts',
        plugins: ['typescript'],
        pluginConfig: {
          typescript: {
            enumsAsTypes: true,
            scalars: {
              Date: 'Date',
              JSON: 'Record<string, unknown>',
            },
          },
        },
        cache: false,
      };

      const result = await generateTypes(testSchema, mockConfig, options);
      expect(result.success).toBe(true);

      const content = await fs.readFile(
        join(testOutputDir, 'graphql.ts'),
        'utf-8'
      );
      expect(content).toContain('Date: { input: Date; output: Date; }');
      expect(content).toContain(
        'JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }'
      );
    });
  });
});
