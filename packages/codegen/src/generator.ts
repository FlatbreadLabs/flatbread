import { generate } from '@graphql-codegen/cli';
import { printSchema, type GraphQLSchema } from 'graphql';
import { join, resolve } from 'path';
import { ensureDir } from 'fs-extra';
import kleur from 'kleur';
// @ts-ignore - chokidar types will be available after npm install
import chokidar from 'chokidar';
import { generateSchema } from '@flatbread/core';
import type { LoadedFlatbreadConfig } from '@flatbread/core';
import { generateInstallCommand } from '@flatbread/utils';
import type { CodegenOptions, CodegenResult, CodegenCache } from './types.js';
import { DEFAULT_CODEGEN_OPTIONS, PLUGIN_PRESETS } from './types.js';
import { hashCodegenInputs, hashSchema } from './hash.js';
import { loadCache, saveCache, isCacheValid } from './cache.js';

/**
 * Map of plugins to their required peer dependencies
 */
const PLUGIN_DEPENDENCIES: Record<string, string[]> = {
  'typed-document-node': ['@graphql-typed-document-node/core'],
  'typescript-operations': ['@graphql-typed-document-node/core'],
};

/**
 * Check if required dependencies are available for the given plugins.
 * Logs warnings for missing dependencies but doesn't fail the build.
 *
 * @param plugins Array of plugin names
 */
function checkPluginDependencies(plugins: string[]): void {
  const missingDeps = new Set<string>();

  for (const plugin of plugins) {
    const requiredDeps = PLUGIN_DEPENDENCIES[plugin];
    if (!requiredDeps) continue;

    for (const dep of requiredDeps) {
      try {
        require.resolve(dep);
      } catch {
        missingDeps.add(dep);
      }
    }
  }

  if (missingDeps.size > 0) {
    const missingDepsArray = Array.from(missingDeps);
    const installCommand = generateInstallCommand(missingDepsArray);
    console.warn(
      kleur.yellow(
        `⚠️  Warning: Some GraphQL codegen plugins require dependencies that aren't installed:\n` +
          `   Missing: ${missingDepsArray.join(', ')}\n` +
          `   Install them with: ${installCommand}\n` +
          `   Or remove the corresponding plugins from your codegen config.`
      )
    );
  }
}

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

  // Apply preset if specified (overrides plugins option)
  if (mergedOptions.preset) {
    mergedOptions.plugins = [...PLUGIN_PRESETS[mergedOptions.preset]];
  }

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
  const configHash = hashCodegenInputs(
    config,
    mergedOptions,
    schemaString,
    mergedOptions.documents
  );

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
    // Check for missing plugin dependencies
    checkPluginDependencies(mergedOptions.plugins);

    console.log(
      kleur.blue('Generating TypeScript types from GraphQL schema...')
    );

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
 * Get file patterns to watch based on the Flatbread configuration.
 *
 * Builds a list of glob patterns that includes:
 * - Flatbread config files (flatbread.config.*)
 * - Content directories with supported file extensions
 * - GraphQL document files if specified in options
 *
 * @param config Loaded Flatbread configuration
 * @param options Codegen options that may include document paths
 * @returns Array of glob patterns to watch
 */
function getWatchPatterns(
  config: LoadedFlatbreadConfig,
  options: CodegenOptions
): string[] {
  const patterns: string[] = [];

  // Watch Flatbread config files
  patterns.push('flatbread.config.*');

  // Watch content directories from the configuration
  if (config.content) {
    for (const contentType of config.content) {
      if (contentType.path) {
        // Watch for all supported file extensions in content directories
        const rawExtensions = config.loaded?.extensions || [
          '.md',
          '.mdx',
          '.markdown',
        ];
        // Remove dots from extensions since we'll add one in the pattern
        const extensions = rawExtensions.map((ext) =>
          ext.startsWith('.') ? ext.slice(1) : ext
        );
        const extensionPattern =
          extensions.length > 1 ? `{${extensions.join(',')}}` : extensions[0];
        patterns.push(`${contentType.path}/**/*.${extensionPattern}`);
      }
    }
  }

  // Watch GraphQL document files if provided
  if (options.documents && options.documents.length > 0) {
    patterns.push(...options.documents);
  }

  return patterns;
}

/**
 * Watch for changes and regenerate types automatically.
 *
 * Monitors Flatbread config files, content directories, and GraphQL documents
 * for changes and automatically regenerates the schema and TypeScript types
 * when modifications are detected. The watcher runs indefinitely until
 * interrupted with SIGINT (Ctrl+C) or SIGTERM.
 *
 * @param schema Initial GraphQL schema to use
 * @param config Loaded Flatbread configuration
 * @param options Codegen options including watch settings
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

  console.log(kleur.blue('🔍 Watching for changes...'));

  // Initial generation
  await generateTypes(schema, config, options);

  // Set up file watchers
  const patterns = getWatchPatterns(config, options);
  console.log(kleur.dim(`Watching patterns: ${patterns.join(', ')}`));

  const ignored = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/generated/**',
    '**/.flatbread-codegen-cache.json',
  ];
  if (options.outputDir) {
    ignored.push(`${options.outputDir}/**`);
  }

  const watcher = chokidar.watch(patterns, {
    ignored,
    ignoreInitial: true,
    persistent: true,
  });

  let regenerating = false;

  const regenerateTypes = async (path: string, event: string) => {
    if (regenerating) {
      return; // Avoid concurrent regenerations
    }

    regenerating = true;

    try {
      console.log(kleur.yellow(`\n📝 ${event}: ${path}`));
      console.log(kleur.blue('🔄 Regenerating schema and types...'));

      let currentConfig = config;

      // If a config file changed, reload the configuration
      if (path.includes('flatbread.config.')) {
        try {
          const { loadConfig } = await import('@flatbread/config');
          const { initializeConfig } = await import('@flatbread/core');
          const configResult = await loadConfig({ cwd: process.cwd() });

          if (configResult.config) {
            currentConfig = initializeConfig(configResult.config);
            console.log(kleur.dim('🔧 Configuration reloaded'));
          }
        } catch (error) {
          console.warn(
            kleur.yellow(
              `⚠️  Failed to reload config, using existing: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`
            )
          );
        }
      }

      // Regenerate the schema first since the source files may have changed
      const newSchema = await generateSchema({ config: currentConfig });

      // Generate types with the new schema
      const result = await generateTypes(newSchema, currentConfig, options);

      if (result.success) {
        console.log(kleur.green('✅ Types regenerated successfully'));
      } else {
        console.error(
          kleur.red('❌ Failed to regenerate types:'),
          result.error
        );
      }
    } catch (error) {
      console.error(kleur.red('❌ Error during regeneration:'), error);
    } finally {
      regenerating = false;
    }
  };

  // Set up event handlers
  watcher
    .on('add', (path: string) => regenerateTypes(path, 'File added'))
    .on('change', (path: string) => regenerateTypes(path, 'File changed'))
    .on('unlink', (path: string) => regenerateTypes(path, 'File removed'))
    .on('addDir', (path: string) => regenerateTypes(path, 'Directory added'))
    .on('unlinkDir', (path: string) =>
      regenerateTypes(path, 'Directory removed')
    )
    .on('error', (error: Error) =>
      console.error(kleur.red('Watcher error:'), error)
    )
    .on('ready', () => console.log(kleur.green('👀 Ready for changes')));

  // Handle graceful shutdown
  const shutdown = () => {
    console.log(kleur.yellow('\n🛑 Shutting down watcher...'));
    watcher.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep the process alive
  return new Promise(() => {
    // This promise never resolves, keeping the watch process running
  });
}
