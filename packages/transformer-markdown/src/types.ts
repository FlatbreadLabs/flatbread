import type { PluginTuple, Plugin, Processor } from 'unified';
export { PluginTuple, Plugin, Processor };

/**
 * Markdown transformer configuration.
 */
export interface TransformerConfig {
  /**
   * User-configurable options for the [gray-matter](https://www.npmjs.com/package/gray-matter) frontmatter parser.
   */
  grayMatter?: GrayMatterConfig;
  /**
   * User-configurable options for the [unified](https://github.com/unifiedjs/unified) processor.
   */
  markdown?: MarkdownConfig;
}

/**
 * An engine may either be an object with parse and
 * (optionally) stringify methods, or a function that will
 * be used for parsing only.
 */
export type LanguageEngine =
  | {
      parse: (input: string) => object;
      stringify?: (data: object) => string;
    }
  | ((input: string) => object);

/**
 * User-configurable options for the [gray-matter](https://www.npmjs.com/package/gray-matter) frontmatter parser.
 */
export interface GrayMatterConfig {
  /**
   * Extract an excerpt that directly follows front-matter,
   * or is the first thing in the string if no front-matter
   * exists.
   *
   * If set to excerpt: true, it will look for the frontmatter
   * delimiter, `---` by default and grab everything leading up
   * to it.
   **/
  excerpt?: boolean | ((input: string, options: GrayMatterConfig) => string);

  /** Define a custom separator to use for excerpts.
   **/
  excerpt_separator?: string;
  /**
   * Define custom engines for parsing and/or stringifying
   * front-matter.
   *
   * JSON, YAML and JavaScript are already
   * handled by default.
   **/
  engines?: Record<string, LanguageEngine>;
  /**
   * Define the engine to use for parsing front-matter.
   * Defaults to `yaml`.
   */
  language?: string;
  /**
   * Open and close delimiters can be passed in as an array
   * of strings.
   *
   * Defaults to `---`.
   */
  delimiters?: string;
}

/**
 * User plugins can be added to the [unified](https://github.com/unifiedjs/unified) processor.
 */
export interface MarkdownConfig {
  /**
   * Files with these extensions will be parsed.
   *
   * Defaults to `['.md', '.mdx', '.markdown']`.
   */
  extensions?: string[];
  /**
   * Github-flavored markdown.
   */
  gfm?: boolean;
  /**
   * Remove empty (or white-space only) paragraphs.
   */
  squeezeParagraphs?: boolean;
  /**
   * Add target and rel attributes to external links.
   */
  externalLinks?: boolean;
  /**
   * Target attribute value for external links.
   * Default: `_blank`
   */
  externalLinksTarget?: string;
  /**
   * Rel attribute value for external links.
   * Default: ['nofollow', 'noopener', 'noreferrer']
   */
  externalLinksRel?: string[] | string;
  /**
   * Plugins to add to the [remark](https://github.com/remarkjs/remark) processor.
   */
  remarkPlugins?: UnifiedTuple[];
  /**
   * Plugins to add to the [rehype](https://github.com/rehypejs/rehype) processor.
   */
  rehypePlugins?: UnifiedTuple[];
}

/**
 * A [unified](https://github.com/unifiedjs/unified) plugin tuple is a tuple of a [unified](https://github.com/unifiedjs/unified) plugin and its settings, or just a plugin.
 *
 * @todo type this in a stricter way that's compatible with unified & the UX of registering plugins such that TypeScript will please calm down please
 */
export type UnifiedTuple = Function | [Function, any];
