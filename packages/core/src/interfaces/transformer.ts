/**
 * Converts input to meaningful data.
 * To be used as a helper layer on top of a source that is not directly usable.
 * For example, a markdown file.
 */
export interface Transformer<Input, TransformerConfig> {
  /**
   * Parse the given source file into data and an unnormalized representation of the content.
   * @param input Node to transform
   * @param config Options for the transformation
   */
  parse(input: Input, config?: TransformerConfig): Promise<EntryNode>;
}

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
