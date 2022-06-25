import matter from 'gray-matter';
import slugify from '@sindresorhus/slugify';
import { html, excerpt, timeToRead } from './graphql/schema-helpers';

import type { MarkdownTransformerConfig } from './types';
import type { EntryNode, TransformerPlugin } from '@flatbread/core';
import type { VFile } from 'vfile';

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
  return {
    _filename: input.basename,
    _path: input.path,
    _slug: slugify(input.stem ?? ''),
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
const transformer: TransformerPlugin = (config: MarkdownTransformerConfig) => {
  return {
    parse: (input: VFile): EntryNode => parse(input, config),
    preknownSchemaFragments: () => ({
      _content: {
        html: html(config),
        excerpt: excerpt(config),
        timeToRead: timeToRead(config),
      },
    }),
    inspect: (input: EntryNode) => String(input),
  };
};

export default transformer;
