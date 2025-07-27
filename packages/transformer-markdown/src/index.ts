import { VFile } from 'vfile';
import matter from 'gray-matter';
import slugify from '@sindresorhus/slugify';
import { EntryNode, TransformerPlugin } from '@flatbread/core';
import { MarkdownTransformerConfig } from './types';
import { html, excerpt, timeToRead } from './graphql/schema-helpers';

export * from './types';

/**
 * Transforms a markdown file (content node) to JSON containing any frontmatter data or content.
 *
 * @param {VFile} input - A VFile object representing a content node.
 * @param {MarkdownTransformerConfig} config - A configuration object.
 */
export const parse = (
  input: VFile,
  config: MarkdownTransformerConfig
): EntryNode => {
  const { data, content } = matter(String(input), config.grayMatter);
  const slug = slugify(input.stem ?? '');

  return {
    id: data.id || slug, // Use explicit id from frontmatter or fall back to slug
    _filename: input.basename,
    _path: input.path,
    _slug: slug,
    ...input.data,
    ...data,
    _content: {
      raw: content,
    },
  };
};

/**
 * Converts markdown files to meaningful data.
 *
 * @param config Markdown transformer configuration.
 * @returns Markdown parser, preknown GraphQL schema fragments, and an EntryNode inspector function.
 */
export const transformer: TransformerPlugin<MarkdownTransformerConfig> = (
  config: MarkdownTransformerConfig = {}
) => {
  const extensions = (config.extensions || ['.md']).map((ext: string) =>
    ext.startsWith('.') ? ext : `.${ext}`
  );

  return {
    parse: (input: VFile): EntryNode => parse(input, config),
    preknownSchemaFragments: () => ({
      html: html(config),
      excerpt: excerpt(config),
      timeToRead: timeToRead(config),
    }),
    inspect: (input: EntryNode) => String(input),
    extensions,
  };
};

export default transformer;
