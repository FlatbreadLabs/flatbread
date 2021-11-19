import matter from 'gray-matter';
import slugify from '@sindresorhus/slugify';
import { html, excerpt, timeToRead } from './graphql/schema-helpers';

import type { MarkdownTransformerConfig } from './types';
import type { EntryNode, Transformer } from '@oyu/core';
import type { VFile } from 'vfile';

export * from './types';

/**
 * Transforms a markdown file (content node) to JSON containing any frontmatter data or content.
 *
 * @param {VFile} file - A VFile object representing a content node.
 * @param {MarkdownTransformerConfig} config - A configuration object.
 */
export const parse = (
  input: VFile,
  config: MarkdownTransformerConfig
): EntryNode => {
  const { data, content } = matter(String(input), config.grayMatter);

  return {
    internals: {
      __filename: input.basename,
      path: input.path,
    },
    fields: {
      slug: slugify(input.stem ?? ''),
      ...data,
      content: {
        raw: content,
      },
    },
  };
};

/**
 * Converts markdown files to meaningful data.
 *
 * @param config Markdown transformer configuration.
 * @returns Markdown parser, preknown GraphQL schema fragments, and an EntryNode inspector function.
 */
const transformer: Transformer = (config: MarkdownTransformerConfig) => {
  return {
    parse: (input: VFile): EntryNode => parse(input, config),
    preknownSchemaFragments: () => ({ html, excerpt, timeToRead }),
    inspect: (input: EntryNode) => String(input),
  };
};

export default transformer;
