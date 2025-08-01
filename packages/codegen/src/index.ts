/**
 * @flatbread/codegen
 *
 * Automatic TypeScript type generation for Flatbread GraphQL schemas
 */

export type {
  CodegenOptions,
  CodegenResult,
  CodegenCache,
  CodegenStrategy,
} from './types.js';

export { DEFAULT_CODEGEN_OPTIONS } from './types.js';

export {
  generateTypes,
  generateTypesWithDocuments,
  watchAndGenerate,
} from './generator.js';

export {
  hashConfig,
  hashSchema,
  hashDocuments,
  hashCodegenInputs,
} from './hash.js';

export { loadCache, saveCache, isCacheValid, clearCache } from './cache.js';

export { createCodegenCommand } from './cli.js';
