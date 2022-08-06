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

export type ContentNode = BaseContentNode & {
  [key: string]: unknown;
};

/**
 * Flatbread's configuration interface.
 *
 * @todo This needs to be typed more strictly.
 */
export interface FlatbreadConfig {
  source: Source<any>;
  transformer?: Transformer | Transformer[];
  content: CollectionEntry[];
}

export interface LoadedFlatbreadConfig {
  source: Source<any>;
  transformer: Transformer[];
  content: LoadedCollectionEntry[];
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
  id?: string;
  preknownSchemaFragments?: () => Record<string, any>;
  inspect: (input: EntryNode) => string;
  serialize: (input: EntryNode, ctx: CollectionContext) => VFile;
  extensions: string[];
}

export type TransformerPlugin = <Config>(config?: Config) => Transformer;

/**
 * A representation of the content of a flat file.
 */
export type EntryNode = Record<string, any>;

/**
 * The result of an invoked `Source` plugin which contains methods on how to retrieve content nodes in
 * their raw (if coupled with a `Transformer` plugin) or processed form.
 */

export interface FlatbreadArgs<Context> {
  addRecord(
    collection: LoadedCollectionEntry,
    record: EntryNode,
    context: Context
  ): void;
}

export interface Source<Context> {
  initialize?: (flatbreadConfig: LoadedFlatbreadConfig) => void;
  id?: string;
  put: (source: VFile, ctx: Context) => Promise<Context>;
  fetch: (
    allContentTypes: LoadedCollectionEntry[],
    flatbread: FlatbreadArgs<Context>
  ) => Promise<void>;
}

export type SourcePlugin<Context> = (
  sourceConfig?: Record<string, any>
) => Source<Context>;

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
    data: any,
    extended: { source: any; context: any; args: any }
  ) => any;
}

export interface CollectionContext {
  referenceField: string;
  collection: string;
  filename: string;
  path: string;
  slug: string;
  sourcedBy: string;
  transformedBy: string;
  reference: string;
}

/**
 * A collection entry which can be used to retrieve content nodes.
 *
 * This is paired with a `Source` (and, *optionally*, a `Transformer`) plugin.
 */

export interface CollectionEntry {
  name: string;
  path: string;
  overrides?: Override[];
  refs?: Record<string, string>;
  referenceField?: string;
}

export interface LoadedCollectionEntry extends CollectionEntry {
  referenceField: string;
}
