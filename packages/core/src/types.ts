import { GraphQLFieldConfigArgumentMap, GraphQLInputType } from 'graphql';
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
   * Parse a given source file into its contained data fields and an unnormalized representation of the content.
   * @param input Node to transform
   */
  parse?: (input: VFile) => EntryNode;
  preknownSchemaFragments?: () => Record<string, unknown>;
  inspect: (input: EntryNode) => string;
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
  fetch: (allContentTypes: Content) => Promise<Record<string, VFile[]>>;
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
