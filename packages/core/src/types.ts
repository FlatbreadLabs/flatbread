import { GraphQLFieldConfigArgumentMap, GraphQLInputType } from 'graphql';
import { Maybe } from 'graphql/jsutils/Maybe';
import type { VFile } from 'vfile';

export type IdentifierField = string | number;

/**
 * A JSON representation of a content node.
 */
export type BaseContentNode = {
  id: IdentifierField;
};

/**
 * A strongly-typed content node with generic field constraints
 */
export type ContentNode<
  TFields extends Record<string, unknown> = Record<string, unknown>
> = BaseContentNode & {
  readonly [K in keyof TFields]: TFields[K];
};

/**
 * Represents any content node with unknown field structure
 */
export type AnyContentNode = ContentNode<Record<string, unknown>>;

/**
 * Flatbread's configuration interface with improved type safety.
 */
export interface FlatbreadConfig<
  TContentMap extends Record<string, AnyContentNode> = Record<
    string,
    AnyContentNode
  >
> {
  source: Source<TContentMap>;
  transformer?: Transformer | Transformer[];
  content: Content<TContentMap>;
  fieldNameTransform?: (field: string) => string;
}

export interface LoadedFlatbreadConfig<
  TContentMap extends Record<string, AnyContentNode> = Record<
    string,
    AnyContentNode
  >
> {
  source: Source<TContentMap>;
  transformer: Transformer[];
  content: Content<TContentMap>;
  fieldNameTransform: (field: string) => string;
  loaded: {
    extensions: string[];
  };
}

export interface ConfigResult<O> {
  filepath?: string;
  config?: O;
}

/**
 * Enhanced transformer interface with better type constraints
 */
export interface Transformer<
  TInput extends VFile = VFile,
  TOutput extends AnyContentNode = AnyContentNode
> {
  /**
   * Parse a given source file into its contained data fields and an unnormalized representation of the content.
   * @param input Node to transform
   */
  parse?: (input: TInput) => TOutput;
  preknownSchemaFragments?: () => Record<string, SchemaFragment>;
  inspect: (input: TOutput) => string;
  extensions: readonly string[];
}

/**
 * Type-safe schema fragment definition - more flexible for existing usage
 */
export type SchemaFragment = Record<string, any>;

export type TransformerPlugin<TConfig = unknown> = (
  config?: TConfig
) => Transformer;

/**
 * A representation of the content of a flat file with strong typing.
 * Replaces the previous `Record<string, any>` approach.
 */
export type EntryNode<
  TFields extends Record<string, unknown> = Record<string, unknown>
> = ContentNode<TFields>;

/**
 * Enhanced source interface - sources can return raw files or processed content
 */
export interface Source<
  TContentMap extends Record<string, AnyContentNode> = Record<
    string,
    AnyContentNode
  >
> {
  initialize?: (flatbreadConfig: LoadedFlatbreadConfig) => void;
  fetchByType?: (path: string) => Promise<VFile[]>;
  fetch: (
    allContentTypes: Record<string, any>[]
  ) => Promise<Record<string, VFile[]>>;
}

export type SourcePlugin<TConfig = unknown> = (
  sourceConfig?: TConfig
) => Source;

/**
 * Type-safe resolver function interface
 */
export type ResolverFunction<
  TSource,
  TContext,
  TArgs = Record<string, unknown>,
  TReturn = unknown
> = (
  data: TSource,
  extended: {
    source: TSource;
    context: TContext;
    args: TArgs;
  }
) => TReturn | Promise<TReturn>;

/**
 * Strongly typed override interface replacing the previous `any` types
 */
export interface Override<
  TSource = AnyContentNode,
  TContext = unknown,
  TArgs extends Record<string, unknown> = Record<string, unknown>,
  TReturn = unknown
> {
  field: string;
  type: GraphQLInputType | string;
  args?: GraphQLFieldConfigArgumentMap;
  description?: Maybe<string>;
  resolve: ResolverFunction<TSource, TContext, TArgs, TReturn>;
}

/**
 * Enhanced content type configuration with generic constraints
 */
export interface ContentTypeConfig<
  TContentMap extends Record<string, AnyContentNode> = Record<
    string,
    AnyContentNode
  >,
  K extends keyof TContentMap = keyof TContentMap
> {
  collection: K;
  path?: string;
  refs?: {
    readonly [RefField in keyof TContentMap[K]]?: keyof TContentMap;
  };
  overrides?: Override<TContentMap[K]>[];
}

/**
 * An array of content descriptions which can be used to retrieve content nodes.
 * Now with proper generic constraints for type safety.
 */
export type Content<
  TContentMap extends Record<string, AnyContentNode> = Record<
    string,
    AnyContentNode
  >
> = ContentTypeConfig<TContentMap>[];

/**
 * Utility type for extracting field types from content nodes
 */
export type FieldsOf<T extends AnyContentNode> = Omit<T, 'id'>;

/**
 * Utility type for extracting collection names from content configuration
 */
export type CollectionNames<T extends Content> = T extends readonly (infer U)[]
  ? U extends { collection: infer C }
    ? C
    : never
  : never;

/**
 * Type for filtering operations with proper constraints
 */
export type FilterOperation =
  | 'eq'
  | 'ne'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'in'
  | 'nin'
  | 'includes'
  | 'excludes'
  | 'regex'
  | 'wildcard'
  | 'exists'
  | 'strictlyExists';

/**
 * Type-safe filter value based on operation
 */
export type FilterValue<T, Op extends FilterOperation> = Op extends 'in' | 'nin'
  ? T[]
  : Op extends 'regex'
  ? RegExp
  : Op extends 'exists' | 'strictlyExists'
  ? boolean
  : T;

/**
 * Simplified filter type that allows flexible nested object filtering
 */
export type Filter<T = any> = {
  readonly [K in keyof T]?: Filter<T[K]> | FilterOperations<T[K]>;
} & {
  // Allow additional properties for dynamic content structures
  readonly [key: string]: Filter<any> | FilterOperations<any> | undefined;
};

/**
 * Filter operations for a specific field type
 */
export type FilterOperations<T = any> = {
  readonly [Op in FilterOperation]?: FilterValue<T, Op>;
};

/**
 * Enhanced query arguments with type constraints
 */
export interface QueryArgs<T extends AnyContentNode = AnyContentNode> {
  filter?: Filter<T>;
  sortBy?: keyof T;
  order?: 'ASC' | 'DESC';
  skip?: number;
  limit?: number;
}

/**
 * Type for single item queries
 */
export interface SingleItemQueryArgs {
  id: IdentifierField;
}

/**
 * Type for multiple item queries
 */
export interface MultipleItemQueryArgs extends QueryArgs {
  ids?: IdentifierField[];
}
