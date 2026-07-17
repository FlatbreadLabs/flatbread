import {
  GraphQLFieldConfigArgumentMap,
  GraphQLInputType,
  GraphQLSchema,
} from 'graphql';
import { Maybe } from 'graphql/jsutils/Maybe';
import type { VFile } from 'vfile';

// Import CodegenOptions type from the codegen package
// Note: This will be a peer dependency to avoid circular imports
export type CodegenOptions = {
  enabled?: boolean;
  outputDir?: string;
  outputFile?: string;
  plugins?: string[];
  codegenConfig?: Record<string, unknown>;
  pluginConfig?: Record<string, Record<string, unknown>>;
  watch?: boolean;
  cache?: boolean;
  documents?: string[];
  schema?: {
    includeIntrospection?: boolean;
    includeDeprecated?: boolean;
  };
};

export type IdentifierField = string | number;

/**
 * A JSON representation of a content node.
 */
export type BaseContentNode = {
  id: IdentifierField;
};

export type ContentNode<
  TFields extends Record<string, unknown> = Record<string, unknown>
> = BaseContentNode & TFields;

/**
 * Flatbread's configuration interface.
 *
 * @todo This needs to be typed more strictly.
 */
export interface FlatbreadConfig {
  source: Source;
  transformer?: Transformer | Transformer[];
  content: Content;
  fieldNameTransform?: (field: string) => string;
  /**
   * Configuration for GraphQL TypeScript code generation
   */
  codegen?: CodegenOptions;
}

export interface LoadedFlatbreadConfig {
  source: Source;
  transformer: Transformer[];
  content: Content;
  fieldNameTransform: (field: string) => string;
  codegen?: CodegenOptions;
  loaded: {
    extensions: string[];
  };
}

export interface ConfigResult<O> {
  filepath?: string;
  config?: O;
}

/**
 * Converts input to meaningful data.
 * To be used as a helper layer on top of a source that is not directly usable.
 * For example, a markdown file.
 */
export interface Transformer {
  /**
   * Parse a source file into its data. Transformers that want source path
   * captures must spread `input.data`; document data wins conflicts when it is
   * spread after captures. Core overwrites `_path` and `_filename` after parse.
   * @param input Node to transform
   */
  parse?: (input: VFile) => EntryNode;
  /** GraphQL-schema-construction-only fragments; never used by record production or validation. */
  preknownSchemaFragments?: () => Record<string, unknown>;
  inspect: (input: EntryNode) => string;
  /** Parser-routing keys match exact `VFile.extname`; later transformers win duplicates. */
  extensions: string[];
}

export type TransformerPlugin = <Config>(config?: Config) => Transformer;

/**
 * A representation of the content of a flat file.
 */
export type EntryNode = Record<string, unknown>;

export interface ContentEntry<
  TRefs extends Record<string, string> = Record<string, string>
> {
  collection: string;
  path?: string;
  refs?: TRefs;
  overrides?: Override[];
  [key: string]: unknown;
}

/**
 * The result of an invoked `Source` plugin which contains methods on how to retrieve content nodes in
 * their raw (if coupled with a `Transformer` plugin) or processed form.
 */
export interface Source {
  initialize?: (flatbreadConfig: LoadedFlatbreadConfig) => void;
  fetchByType?: (path: string) => Promise<VFile[]>;
  /** Fetch grouped files; fetchPaths fetches flat files. Capture patterns place values in VFile.data. */
  fetchPaths?: (paths: readonly string[]) => Promise<VFile[]>;
  fetch: (allContentTypes: Content) => Promise<Record<string, VFile[]>>;
}

/**
 * Source-context fields on a produced record. Transformers may stamp `_path`
 * and `_filename` provisionally, but record production overwrites both from
 * the source VFile after parse returns — core is authoritative. `_slug` is
 * transformer-derived and is never stamped by core.
 */
export type SourceContextFields = {
  _path?: string;
  _filename?: string;
  _slug?: string;
};

/**
 * A valid snapshot is built from a complete produceRecords→validateRecords
 * pass; generateSchema trusts a supplied graph as already validated.
 */
export interface ContentGraphSnapshot {
  readonly config: LoadedFlatbreadConfig;
  readonly nodesByCollection: Readonly<Record<string, ContentNode[]>>;
  readonly nodeByPath: ReadonlyMap<string, IndexedContentNode>;
  readonly pathByCollectionAndId: ReadonlyMap<string, string>;
  readonly inboundReferences: ReadonlyMap<string, ReadonlySet<string>>;
  readonly outboundReferences: ReadonlyMap<string, readonly string[]>;
}

export interface IndexedContentNode {
  readonly collection: string;
  readonly id: string;
  readonly path: string;
  readonly node: EntryNode;
}

export interface ChangedPaths {
  readonly paths: readonly string[];
  readonly source?: 'watcher' | 'writer';
}

export interface SchemaSnapshot {
  readonly schema: GraphQLSchema;
  readonly graph: ContentGraphSnapshot;
  readonly generation: number;
}

export type ReindexResult =
  | { status: 'committed'; generation: number }
  | { status: 'rejected'; generation: number; error: Error };

export interface ReindexBarrier {
  waitUntilReadable(paths: readonly string[]): Promise<void>;
}

export interface LiveSchemaReloader {
  readonly generation: number;
  getSnapshot(): SchemaSnapshot;
  notifyChanged(change: ChangedPaths): Promise<ReindexResult>;
  replaceConfig(config: LoadedFlatbreadConfig): Promise<ReindexResult>;
  waitForGeneration(minimumGeneration: number): Promise<SchemaSnapshot>;
}

export type SourcePlugin<
  TConfig extends Record<string, unknown> = Record<string, unknown>
> = (sourceConfig?: TConfig) => Source;

/**
 * An override can be used to declare a custom resolve for a field in content
 */
// derived from GraphQLFieldConfig<Source, Context>
export interface Override {
  field: string;
  type: GraphQLInputType | string;
  args?: GraphQLFieldConfigArgumentMap;
  description?: Maybe<string>;
  resolve: (
    data: unknown,
    extended: {
      source: unknown;
      context: unknown;
      args: Record<string, unknown>;
    }
  ) => unknown;
}

/**
 * An array of content descriptions which can be used to retrieve content nodes.
 *
 * This is paired with a `Source` (and, *optionally*, a `Transformer`) plugin.
 */
export type Content = ContentEntry[];
