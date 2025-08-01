import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * Configuration options for GraphQL code generation
 */
export interface CodegenOptions {
  /**
   * Whether to enable code generation
   * @default false
   */
  enabled?: boolean;

  /**
   * Output directory for generated types
   * @default './src/generated'
   */
  outputDir?: string;

  /**
   * Output filename for generated types
   * @default 'graphql.ts'
   */
  outputFile?: string;

  /**
   * GraphQL Code Generator plugins to use
   * @default ['typescript', 'typescript-operations', 'typed-document-node']
   */
  plugins?: string[];

  /**
   * Custom configuration for GraphQL Code Generator
   * This allows users to override any codegen options
   */
  codegenConfig?: Partial<CodegenConfig>;

  /**
   * Plugin-specific configuration
   */
  pluginConfig?: {
    typescript?: Record<string, any>;
    typescriptOperations?: Record<string, any>;
    typedDocumentNode?: Record<string, any>;
    [pluginName: string]: Record<string, any> | undefined;
  };

  /**
   * Whether to watch for changes and regenerate types automatically
   * @default false
   */
  watch?: boolean;

  /**
   * Whether to skip type generation if schema hasn't changed
   * @default true
   */
  cache?: boolean;

  /**
   * Additional GraphQL documents to include in type generation
   * Useful for including query/mutation files from your application
   */
  documents?: string[];

  /**
   * Schema transformation options
   */
  schema?: {
    /**
     * Whether to include introspection types
     * @default false
     */
    includeIntrospection?: boolean;

    /**
     * Whether to include deprecated fields
     * @default true
     */
    includeDeprecated?: boolean;
  };
}

/**
 * Default codegen configuration
 */
export const DEFAULT_CODEGEN_OPTIONS: Required<Omit<CodegenOptions, 'codegenConfig' | 'pluginConfig'>> = {
  enabled: false,
  outputDir: './src/generated',
  outputFile: 'graphql.ts',
  plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
  watch: false,
  cache: true,
  documents: [],
  schema: {
    includeIntrospection: false,
    includeDeprecated: true,
  },
};

/**
 * Supported codegen strategies
 */
export type CodegenStrategy = 'graphql-codegen' | 'gql-tada' | 'custom';

/**
 * Result of the code generation process
 */
export interface CodegenResult {
  /**
   * Whether generation was successful
   */
  success: boolean;

  /**
   * Generated files
   */
  files: string[];

  /**
   * Error message if generation failed
   */
  error?: string;

  /**
   * Whether types were regenerated or served from cache
   */
  fromCache: boolean;

  /**
   * Hash of the configuration used for generation
   */
  configHash: string;
}

/**
 * Cache metadata for tracking when to regenerate types
 */
export interface CodegenCache {
  /**
   * Hash of the Flatbread configuration
   */
  configHash: string;

  /**
   * Hash of the generated GraphQL schema
   */
  schemaHash: string;

  /**
   * Timestamp of last generation
   */
  timestamp: number;

  /**
   * Generated files
   */
  files: string[];

  /**
   * Codegen options used for generation
   */
  options: CodegenOptions;
}