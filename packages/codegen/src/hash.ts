import { createHash } from 'crypto';
import type { LoadedFlatbreadConfig } from '@flatbread/core';
import type { CodegenOptions } from './types.js';

/**
 * Generate a hash for the Flatbread configuration
 * This is used to determine if types need to be regenerated
 */
export function hashConfig(config: LoadedFlatbreadConfig, options: CodegenOptions): string {
  const configString = JSON.stringify({
    content: config.content,
    source: {
      // Only include non-function properties from source
      ...(typeof config.source.fetchByType === 'function' ? { fetchByType: 'function' } : {}),
      ...(typeof config.source.fetch === 'function' ? { fetch: 'function' } : {}),
      ...(typeof config.source.initialize === 'function' ? { initialize: 'function' } : {}),
    },
    transformer: config.transformer.map(t => ({
      extensions: t.extensions,
      inspect: 'function',
      ...(typeof t.parse === 'function' ? { parse: 'function' } : {}),
      ...(typeof t.preknownSchemaFragments === 'function' ? { preknownSchemaFragments: 'function' } : {}),
    })),
    fieldNameTransform: 'function',
    loaded: config.loaded,
    codegen: options,
  }, null, 2);

  return createHash('sha256').update(configString).digest('hex');
}

/**
 * Generate a hash for a GraphQL schema string
 */
export function hashSchema(schemaString: string): string {
  return createHash('sha256').update(schemaString).digest('hex');
}

/**
 * Generate a hash for an array of document strings
 */
export function hashDocuments(documents: string[]): string {
  const documentsString = documents.sort().join('\n');
  return createHash('sha256').update(documentsString).digest('hex');
}

/**
 * Generate a combined hash for all codegen inputs
 */
export function hashCodegenInputs(
  config: LoadedFlatbreadConfig,
  options: CodegenOptions,
  schemaString: string,
  documents: string[] = []
): string {
  const configHash = hashConfig(config, options);
  const schemaHash = hashSchema(schemaString);
  const documentsHash = hashDocuments(documents);

  const combinedString = `${configHash}:${schemaHash}:${documentsHash}`;
  return createHash('sha256').update(combinedString).digest('hex');
}