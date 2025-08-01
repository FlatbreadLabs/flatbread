import { generate } from '@graphql-codegen/cli';
import { printSchema, type GraphQLSchema } from 'graphql';
import { join, resolve } from 'path';
import { ensureDir } from 'fs-extra';
import kleur from 'kleur';
import type { LoadedFlatbreadConfig } from '@flatbread/core';
import type { CodegenOptions, CodegenResult, CodegenCache } from './types.js';
import { DEFAULT_CODEGEN_OPTIONS } from './types.js';
import { hashCodegenInputs, hashSchema } from './hash.js';
import { loadCache, saveCache, isCacheValid } from './cache.js';

/**
 * Generate TypeScript types from a GraphQL schema using GraphQL Code Generator
 */
export async function generateTypes(
  schema: GraphQLSchema,
  config: LoadedFlatbreadConfig,
  options: CodegenOptions = {}
): Promise<CodegenResult> {
  // Merge with default options
  const mergedOptions = { ...DEFAULT_CODEGEN_OPTIONS, ...options };
  
  if (!mergedOptions.enabled) {
    return {
      success: true,
      files: [],
      fromCache: false,
      configHash: '',
    };
  }

  const schemaString = printSchema(schema);
  const schemaHash = hashSchema(schemaString);
  const configHash = hashCodegenInputs(config, mergedOptions, schemaString, mergedOptions.documents);

  // Resolve output paths
  const outputDir = resolve(mergedOptions.outputDir);
  const outputFilePath = join(outputDir, mergedOptions.outputFile);

  // Check cache
  const cache = await loadCache(outputDir);
  if (isCacheValid(cache, configHash, schemaHash, mergedOptions)) {
    console.log(kleur.green('✓ Using cached TypeScript types'));
    return {
      success: true,
      files: cache!.files,
      fromCache: true,
      configHash,
    };
  }

  try {
    console.log(kleur.blue('Generating TypeScript types from GraphQL schema...'));

    // Ensure output directory exists
    await ensureDir(outputDir);

    // Build the codegen configuration
    const codegenConfig = {
      schema: schemaString,
      documents: mergedOptions.documents,
      generates: {
        [outputFilePath]: {
          plugins: mergedOptions.plugins,
          config: {
            skipTypename: false,
            enumsAsTypes: true,
            scalars: {
              DateTime: 'string',
              Date: 'string',
              JSON: 'Record<string, any>',
              Upload: 'File',
              ...mergedOptions.pluginConfig?.typescript?.scalars,
            },
            ...mergedOptions.pluginConfig?.typescript,
            ...mergedOptions.pluginConfig?.typescriptOperations,
            ...mergedOptions.pluginConfig?.typedDocumentNode,
          },
        },
      },
      config: {
        skipTypename: false,
        enumsAsTypes: true,
      },
      // Merge any custom codegen configuration
      ...mergedOptions.codegenConfig,
    };

    // Generate types
    await generate(codegenConfig, true);

    const generatedFiles = [outputFilePath];

    // Save cache
    const newCache: CodegenCache = {
      configHash,
      schemaHash,
      timestamp: Date.now(),
      files: generatedFiles,
      options: mergedOptions,
    };
    await saveCache(outputDir, newCache);

    console.log(kleur.green(`✓ Generated TypeScript types: ${outputFilePath}`));

    return {
      success: true,
      files: generatedFiles,
      fromCache: false,
      configHash,
    };
  } catch (error) {
    console.error(kleur.red('✗ Failed to generate TypeScript types:'), error);
    return {
      success: false,
      files: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      fromCache: false,
      configHash,
    };
  }
}

/**
 * Generate TypeScript types with support for document files
 */
export async function generateTypesWithDocuments(
  schema: GraphQLSchema,
  config: LoadedFlatbreadConfig,
  documentPaths: string[] = [],
  options: CodegenOptions = {}
): Promise<CodegenResult> {
  const mergedOptions = {
    ...options,
    documents: [...(options.documents || []), ...documentPaths],
  };

  return generateTypes(schema, config, mergedOptions);
}

/**
 * Watch for changes and regenerate types automatically
 */
export async function watchAndGenerate(
  schema: GraphQLSchema,
  config: LoadedFlatbreadConfig,
  options: CodegenOptions = {}
): Promise<void> {
  if (!options.watch) {
    await generateTypes(schema, config, options);
    return;
  }

  console.log(kleur.blue('Watching for changes...'));
  
  // Initial generation
  await generateTypes(schema, config, options);

  // Note: In a real implementation, you would set up file watchers here
  // For now, we just do the initial generation
  console.log(kleur.yellow('Watch mode not fully implemented yet. Use --no-watch for now.'));
}