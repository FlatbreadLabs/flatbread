/**
 *  Content type declaration & references
 */
export type ContentConfig = {
  path: string;
  typeName: string;
  refs?: ContentRefs;
  identifier?: NodeIdentifier;
};
export type ContentRefs = Record<string, string>;
/**
 * How to identify an individual entry of content as unique.
 * This is used to relate content to other content.
 */
export type NodeIdentifier = {
  method: 'field' | 'slug';
  field?: string;
};

/**
 * The main config for declaring your content schema & mdsvex settings.
 */
export interface OyuConfig {
  identifier?: NodeIdentifier;
  content: ContentConfig[];
  // TODO: figure out how to better type this
  mdsvex?: {
    extensions?: string[];
    smartypants?: Record<string, unknown>;
    remarkPlugins?: unknown[];
    rehypePlugins?: unknown[];
  };
}
