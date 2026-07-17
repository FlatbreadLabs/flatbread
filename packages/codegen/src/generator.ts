import { generate } from '@graphql-codegen/cli';
import {
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isEnumType,
  printSchema,
  type GraphQLSchema,
  type GraphQLType,
} from 'graphql';
import { join, resolve } from 'path';
import { ensureDir } from 'fs-extra';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'node:fs/promises';
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
import {
  checkPluginDependencies,
  formatMissingDepsWarning,
} from './dependencyCheck.js';
import {
  deriveFlatbreadWatchPatterns,
  flattenFlatbreadWatchPatterns,
} from './watchPatterns.js';

function emitMissingDepsWarning(missingDeps: string[]) {
  if (missingDeps.length === 0) return;
  const installCommand = generateInstallCommand(missingDeps);
  console.warn(
    kleur.yellow(formatMissingDepsWarning(missingDeps, installCommand))
  );
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
    const missingDeps = checkPluginDependencies(mergedOptions.plugins);
    emitMissingDepsWarning(missingDeps);

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
            // Apply TypeScript plugin config with a safe deep-merge for `scalars`
            // so user-provided scalars extend (not replace) defaults.
            ...((): Record<string, unknown> => {
              const {
                scalars: userScalars,
                defaultScalarType,
                ...typescriptRest
              } = mergedOptions.pluginConfig?.typescript ?? {};
              return {
                // Ensure unmapped scalars become `unknown` instead of `any`
                defaultScalarType: defaultScalarType ?? 'unknown',
                ...typescriptRest,
                scalars: {
                  DateTime: 'string',
                  Date: 'string',
                  JSON: 'Record<string, unknown>',
                  Upload: 'File',
                  ...(userScalars as Record<string, unknown> | undefined),
                },
              };
            })(),
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
    await upsertFlatbreadContentModelTypes(outputFilePath, config, schema);

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

const CONTENT_MODEL_TYPES_START = '/* @flatbread/content-model-types:start */';
const CONTENT_MODEL_TYPES_END = '/* @flatbread/content-model-types:end */';

async function upsertFlatbreadContentModelTypes(
  outputFilePath: string,
  config: LoadedFlatbreadConfig,
  schema: GraphQLSchema
): Promise<void> {
  const contentModelTypes = generateFlatbreadContentModelTypes(config, schema);
  if (!contentModelTypes) return;

  const current = await readFile(outputFilePath, 'utf-8');
  const block = `${CONTENT_MODEL_TYPES_START}\n${contentModelTypes}\n${CONTENT_MODEL_TYPES_END}`;
  const existingBlockPattern = new RegExp(
    `\\n?${escapeRegExp(CONTENT_MODEL_TYPES_START)}[\\s\\S]*?${escapeRegExp(
      CONTENT_MODEL_TYPES_END
    )}`
  );
  const next = existingBlockPattern.test(current)
    ? current.replace(existingBlockPattern, `\n${block}`)
    : `${current.trimEnd()}\n\n${block}\n`;

  await writeFile(outputFilePath, next);
}

function generateFlatbreadContentModelTypes(
  config: LoadedFlatbreadConfig,
  schema: GraphQLSchema
): string {
  const collections = config.content.map((contentType) =>
    String(contentType.collection)
  );

  if (collections.length === 0) {
    return '';
  }

  const recordEntries = collections
    .map(
      (collection) =>
        `  ${JSON.stringify(collection)}: ${toTypeReference(
          collection,
          schema
        )};`
    )
    .join('\n');

  const relationEntries = config.content
    .map((contentType) => {
      const collection = String(contentType.collection);
      const refs = contentType.refs as Record<string, unknown> | undefined;
      const relationFields = refs
        ? Object.entries(refs)
            .map(
              ([field, target]) =>
                `    ${JSON.stringify(field)}: { target: ${JSON.stringify(
                  String(target)
                )}; cardinality: ${JSON.stringify(
                  getRelationCardinality(schema, collection, field)
                )}; };`
            )
            .join('\n')
        : '';

      return `  ${JSON.stringify(collection)}: {${
        relationFields ? `\n${relationFields}\n  ` : ''
      }};`;
    })
    .join('\n');
  const readableCollections = collections.filter((collection) =>
    Boolean(
      getReadQueries(schema, collection) &&
        getDefaultSelection(schema, collection)
    )
  );
  const readApiEntries = readableCollections
    .map((collection) => {
      return `  ${JSON.stringify(collection)}: {
    all(selection?: string): Promise<ReadonlyArray<Partial<FlatbreadRecord<${JSON.stringify(
      collection
    )}>>>>;
    find(id: string | number, selection?: string): Promise<Partial<FlatbreadRecord<${JSON.stringify(
      collection
    )}>> | null>;
  };`;
    })
    .join('\n');
  const readApiRuntimeEntries = readableCollections
    .map((collection) => {
      const queries = getReadQueries(schema, collection);
      const defaultSelection = getDefaultSelection(schema, collection);
      if (!queries || !defaultSelection) {
        return '';
      }

      return `  ${JSON.stringify(collection)}: { all: ${JSON.stringify(
        queries.all
      )}, find: ${JSON.stringify(queries.find)}, idType: ${JSON.stringify(
        queries.idType
      )}, selection: ${JSON.stringify(defaultSelection)} }`;
    })
    .filter(Boolean)
    .join(',\n');

  return `/**
 * Flatbread content model types generated from flatbread.config.*.
 * These describe configured collections and refs before any GraphQL operation documents are required.
 */
export type FlatbreadCollectionName = ${collections
    .map((collection) => JSON.stringify(collection))
    .join(' | ')};

export type FlatbreadRecordByCollection = {
${recordEntries}
};

export type FlatbreadRelationTargetByCollection = {
${relationEntries}
};

export type FlatbreadRecord<
  Collection extends FlatbreadCollectionName,
> = FlatbreadRecordByCollection[Collection];

export type FlatbreadRelationTarget<
  Collection extends FlatbreadCollectionName,
  Field extends keyof FlatbreadRelationTargetByCollection[Collection],
> = FlatbreadRecord<
  Extract<
    FlatbreadRelationTargetCollection<Collection, Field>,
    FlatbreadCollectionName
  >
> extends infer TargetRecord
  ? FlatbreadRelationCardinality<Collection, Field> extends 'many'
    ? ReadonlyArray<TargetRecord | null> | null
    : TargetRecord | null
  : never;

export type FlatbreadRelationTargetCollection<
  Collection extends FlatbreadCollectionName,
  Field extends keyof FlatbreadRelationTargetByCollection[Collection],
> = FlatbreadRelationTargetByCollection[Collection][Field] extends {
  target: infer Target;
}
  ? Target
  : never;

export type FlatbreadRelationCardinality<
  Collection extends FlatbreadCollectionName,
  Field extends keyof FlatbreadRelationTargetByCollection[Collection],
> = FlatbreadRelationTargetByCollection[Collection][Field] extends {
  cardinality: infer Cardinality;
}
  ? Cardinality
  : never;

export type FlatbreadReadableCollectionName = ${
    readableCollections.length > 0
      ? readableCollections
          .map((collection) => JSON.stringify(collection))
          .join(' | ')
      : 'never'
  };

export type FlatbreadGraphQLExecutor = <TData>(
  source: string,
  variables?: Record<string, unknown>,
) => Promise<TData>;

/**
 * Experimental generated read API over the Flatbread content model.
 *
 * The API owns collection names, root query names, IDs, and result typing. The
 * current prototype still accepts a GraphQL selection string for fields; invalid
 * or drifting selections are runtime GraphQL errors, not type errors.
 */
export type FlatbreadReadApi = {
${readApiEntries}
};

const flatbreadReadApiQueries = {
${readApiRuntimeEntries}
} as const;

export function createFlatbreadReadApi(
  execute: FlatbreadGraphQLExecutor,
): FlatbreadReadApi {
  return Object.fromEntries(
    Object.entries(flatbreadReadApiQueries).map(([collection, queries]) => [
      collection,
      {
        all: async (selection = queries.selection) => {
          const readSelection = normalizeFlatbreadReadSelection(selection);
          const operationName = flatbreadReadApiOperationName(collection, 'All');
          const data = await execute<Record<string, ReadonlyArray<unknown>>>(
            \`query \${operationName} { \${queries.all} { \${readSelection} } }\`,
          );
          return data[queries.all] ?? [];
        },
        find: async (id: string | number, selection = queries.selection) => {
          const readSelection = normalizeFlatbreadReadSelection(selection);
          const operationName = flatbreadReadApiOperationName(collection, 'Find');
          const data = await execute<Record<string, unknown | null>>(
            \`query \${operationName}($id: \${queries.idType}) { \${queries.find}(id: $id) { \${readSelection} } }\`,
            { id },
          );
          return data[queries.find] ?? null;
        },
      },
    ]),
  ) as FlatbreadReadApi;
}

function normalizeFlatbreadReadSelection(selection: string): string {
  const normalized = selection.trim();
  if (!normalized) {
    throw new Error('Flatbread read API selection must not be empty.');
  }
  return normalized;
}

function flatbreadReadApiOperationName(
  collection: string,
  action: string,
): string {
  const safeCollection = collection.replace(/[^A-Za-z0-9_]/g, '_');
  const suffix = safeCollection && !/^\\d/.test(safeCollection)
    ? safeCollection
    : \`_\${safeCollection || 'Collection'}\`;
  return \`FlatbreadRead_\${suffix}_\${action}\`;
}`;
}

function toTypeReference(collection: string, schema: GraphQLSchema): string {
  const schemaType = schema.getType(collection);

  return isObjectType(schemaType) &&
    /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(collection)
    ? collection
    : 'Record<string, unknown>';
}

function getRelationCardinality(
  schema: GraphQLSchema,
  collection: string,
  field: string
): 'one' | 'many' {
  const schemaType = schema.getType(collection);
  if (!isObjectType(schemaType)) {
    return 'one';
  }

  const fieldConfig = schemaType.getFields()[field];
  if (!fieldConfig) {
    return 'one';
  }

  return isListLikeType(fieldConfig.type) ? 'many' : 'one';
}

function isListLikeType(type: GraphQLType): boolean {
  if (isListType(type)) {
    return true;
  }

  if (isNonNullType(type)) {
    return isListLikeType(type.ofType);
  }

  return false;
}

function getReadQueries(
  schema: GraphQLSchema,
  collection: string
): { all: string; find: string; idType: string } | undefined {
  const queryType = schema.getQueryType();
  if (!queryType) {
    return undefined;
  }

  const fields = queryType.getFields();
  const find =
    (fields[collection] ? collection : undefined) ??
    Object.keys(fields).find(
      (fieldName) =>
        isNamedType(fields[fieldName].type, collection) &&
        fields[fieldName].args.some((arg) => arg.name === 'id')
    );
  const all = Object.keys(fields).find((fieldName) =>
    isListOfType(fields[fieldName].type, collection)
  );

  return find && all
    ? {
        all,
        find,
        idType:
          fields[find].args.find((arg) => arg.name === 'id')?.type.toString() ??
          'ID!',
      }
    : undefined;
}

function getDefaultSelection(
  schema: GraphQLSchema,
  collection: string,
  depth = 0
): string | undefined {
  const schemaType = schema.getType(collection);
  if (!isObjectType(schemaType)) {
    return undefined;
  }

  const selections = Object.values(schemaType.getFields())
    .map((field) => {
      const namedType = unwrapType(field.type);

      if (isScalarType(namedType) || isEnumType(namedType)) {
        return field.name;
      }

      if (depth === 0 && isObjectType(namedType)) {
        const nestedSelection = getDefaultSelection(
          schema,
          namedType.name,
          depth + 1
        );

        return nestedSelection
          ? `${field.name} { ${nestedSelection} }`
          : undefined;
      }

      return undefined;
    })
    .filter((selection): selection is string => Boolean(selection));

  return selections.length > 0 ? selections.join('\n') : undefined;
}

function unwrapType(type: GraphQLType): GraphQLType {
  if (isNonNullType(type) || isListType(type)) {
    return unwrapType(type.ofType);
  }

  return type;
}

function isListOfType(type: GraphQLType, collection: string): boolean {
  if (isNonNullType(type)) {
    return isListOfType(type.ofType, collection);
  }

  if (isListType(type)) {
    return isNamedType(type.ofType, collection);
  }

  return false;
}

function isNamedType(type: GraphQLType, collection: string): boolean {
  if (isNonNullType(type)) {
    return isNamedType(type.ofType, collection);
  }

  return isObjectType(type) && type.name === collection;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  // Maintain a mutable set of options that can be refreshed when the config changes
  let currentOptions: CodegenOptions = { ...options };

  // Helper to derive effective codegen options from the latest config
  const deriveOptionsFromConfig = (
    loadedConfig: LoadedFlatbreadConfig,
    previous: CodegenOptions
  ): CodegenOptions => {
    const cfg = loadedConfig.codegen || {};
    return {
      // Always enable in watch
      enabled: true,
      // Prefer latest config for dynamic fields changed via config
      outputDir: cfg.outputDir ?? DEFAULT_CODEGEN_OPTIONS.outputDir,
      outputFile: cfg.outputFile ?? DEFAULT_CODEGEN_OPTIONS.outputFile,
      documents: cfg.documents ?? [],
      plugins: cfg.plugins ?? previous.plugins,
      pluginConfig: cfg.pluginConfig ?? previous.pluginConfig,
      schema: cfg.schema ?? previous.schema,
      codegenConfig: cfg.codegenConfig ?? previous.codegenConfig,
      // Preserve runtime flags
      watch: true,
      cache: previous.cache,
      preset: previous.preset,
    };
  };

  // Initial generation using the current options
  await generateTypes(schema, config, currentOptions);

  // Set up file watchers
  const patterns = flattenFlatbreadWatchPatterns(
    deriveFlatbreadWatchPatterns(config, currentOptions)
  );
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
          const configResult = await loadConfig({ cwd: process.cwd() });

          if (configResult.config) {
            currentConfig = configResult.config;
            console.log(kleur.dim('🔧 Configuration reloaded'));
            // Refresh codegen options from the updated config so changes like outputFile/outputDir/documents are applied
            currentOptions = deriveOptionsFromConfig(
              currentConfig,
              currentOptions
            );
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
      const result = await generateTypes(
        newSchema,
        currentConfig,
        currentOptions
      );

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
