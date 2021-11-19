import type { VFile } from 'vfile';

/**
 * Converts input to meaningful data.
 * To be used as a helper layer on top of a source that is not directly usable.
 * For example, a markdown file.
 */
export type Transformer = <Config>(config: Config) => {
  /**
   * Parse the given source file into data and an unnormalized representation of the content.
   * @param input Node to transform
   * @param config Options for the transformation
   */
  parse?: (input: VFile) => EntryNode;
  preknownSchemaFragments: () => Record<string, any>;
  inspect: (input: EntryNode) => string;
};

/**
 * A representation of the content of a file.
 */
export interface EntryNode {
  internals: {
    path: string;
    [key: string]: any;
  };
  fields: Record<string, any>;
}
