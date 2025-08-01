import { generateSchema, type LoadedFlatbreadConfig } from '@flatbread/core';
import { loadConfig } from '@flatbread/config';
import kleur from 'kleur';
import type { CodegenOptions } from './types.js';
import { generateTypes, watchAndGenerate } from './generator.js';
import { clearCache } from './cache.js';

/**
 * CLI options for the codegen command
 */
export interface CodegenCliOptions {
  /**
   * Path to the Flatbread config file
   */
  config?: string;

  /**
   * Output directory for generated types
   */
  outputDir?: string;

  /**
   * Output filename for generated types
   */
  outputFile?: string;

  /**
   * Watch for changes and regenerate automatically
   */
  watch?: boolean;

  /**
   * Clear the cache and force regeneration
   */
  clearCache?: boolean;

  /**
   * Document paths to include in type generation
   */
  documents?: string[];

  /**
   * Whether to enable verbose logging
   */
  verbose?: boolean;
}

/**
 * Create a codegen command function that can be used by CLI tools
 */
export function createCodegenCommand() {
  return async (options: CodegenCliOptions = {}) => {
    try {
      console.log(kleur.blue('🥯 Flatbread TypeScript Code Generator'));

      if (options.verbose) {
        console.log('Loading Flatbread configuration...');
      }

      // Load Flatbread configuration
      const { dirname } = await import('path');
      const configResult = await loadConfig({
        cwd: options.config ? dirname(options.config) : process.cwd(),
      });

      if (!configResult.config) {
        console.error(kleur.red('✗ Failed to load Flatbread configuration'));
        process.exit(1);
      }

      // Initialize the configuration first
      const { initializeConfig } = await import('@flatbread/core');
      const loadedConfig = initializeConfig(configResult.config);

      // Generate GraphQL schema
      if (options.verbose) {
        console.log('Generating GraphQL schema...');
      }

      const schema = await generateSchema({ config: loadedConfig });

      // Prepare codegen options
      const codegenOptions: CodegenOptions = {
        enabled: true,
        outputDir: options.outputDir || './src/generated',
        outputFile: options.outputFile || 'graphql.ts',
        watch: options.watch || false,
        documents: options.documents || [],
        cache: !options.clearCache,
      };

      // Clear cache if requested
      if (options.clearCache && codegenOptions.outputDir) {
        if (options.verbose) {
          console.log('Clearing cache...');
        }
        await clearCache(codegenOptions.outputDir);
      }

      // Generate types
      if (options.watch) {
        await watchAndGenerate(schema, loadedConfig, codegenOptions);
      } else {
        const result = await generateTypes(
          schema,
          loadedConfig,
          codegenOptions
        );

        if (result.success) {
          console.log(kleur.green('✓ TypeScript types generated successfully'));

          if (options.verbose) {
            console.log(`Files generated: ${result.files.join(', ')}`);
            console.log(`From cache: ${result.fromCache}`);
            console.log(`Config hash: ${result.configHash}`);
          }

          process.exit(0);
        } else {
          console.error(kleur.red('✗ Failed to generate TypeScript types'));
          if (result.error) {
            console.error(kleur.red(result.error));
          }
          process.exit(1);
        }
      }
    } catch (error) {
      console.error(kleur.red('✗ Unexpected error:'), error);
      process.exit(1);
    }
  };
}

/**
 * Run the codegen command directly
 */
export async function runCodegen(
  options: CodegenCliOptions = {}
): Promise<void> {
  const command = createCodegenCommand();
  await command(options);
}
