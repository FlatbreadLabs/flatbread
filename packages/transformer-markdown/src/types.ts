export interface TransformerConfig {
  grayMatter?: GrayMatterConfig;
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

export interface MarkdownConfig {
  gfm?: boolean;
  squeezeParagraphs?: boolean;
  externalLinks?: boolean;
  externalLinksTarget?: string;
  externalLinksRel?: string;
  remarkPlugins?: Function[];
}
