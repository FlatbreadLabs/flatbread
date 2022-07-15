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
  source: Source;
  transformer?: Transformer;
  content: Content;
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
export type TransformerPlugin = <Config>(config: Config) => {
  /**
   * Parse a given source file into its contained data fields and an unnormalized representation of the content.
   * @param input Node to transform
   * @param config Options for the transformation
   */
  parse?: (input: VFile) => EntryNode;
  preknownSchemaFragments?: () => Record<string, any>;
  inspect: (input: EntryNode) => string;
};

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
  preknownSchemaFragments?: () => Record<string, any>;
  inspect: (input: EntryNode) => string;
}

/**
 * A representation of the content of a flat file.
 */
export type EntryNode = Record<string, any>;

/**
 * A `Source` plugin which contains methods on how to retrieve content nodes in
 * their raw (if coupled with a `Transformer` plugin) or processed form.
 */
export type SourcePlugin = (sourceConfig?: Record<string, any>) => {
  fetchByType?: (path: string) => Promise<any[]>;
  fetch: (
    allContentTypes: Record<string, any>[]
  ) => Promise<Record<string, VFile[]>>;
};

/**
 * The result of an invoked `Source` plugin which contains methods on how to retrieve content nodes in
 * their raw (if coupled with a `Transformer` plugin) or processed form.
 */
export interface Source {
  fetchByType?: (path: string) => Promise<any[]>;
  fetch: (
    allContentTypes: Record<string, any>[]
  ) => Promise<Record<string, VFile[]>>;
}

/**
 * An array of content descriptions which can be used to retrieve content nodes.
 *
 * This is paired with a `Source` (and, *optionally*, a `Transformer`) plugin.
 */
export type Content = {
  collection: string;
  [key: string]: any;
}[];
