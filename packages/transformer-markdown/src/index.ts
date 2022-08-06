import matter from 'gray-matter';
import { excerpt, html, timeToRead } from './graphql/schema-helpers';
import ownPackage from '../package.json' assert { type: 'json' };

import type {
  CollectionContext,
  EntryNode,
  TransformerPlugin,
} from '@flatbread/core';
import { VFile } from 'vfile';
import type { MarkdownTransformerConfig } from './types';

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
    ...input.data,
    ...data,
    _content: {
      raw: content,
    },
  };
};

function serialize(
  data: EntryNode,
  ctx: CollectionContext,
  config: MarkdownTransformerConfig
) {
  const { _content, ...rest } = data;
  const doc = matter.stringify(_content.raw, rest, config.grayMatter);

  return new VFile(doc);
}

/**
 * Converts markdown files to meaningful data.
 *
 * @param config Markdown transformer configuration.
 * @returns Markdown parser, preknown GraphQL schema fragments, and an EntryNode inspector function.
 */
export const transformer: TransformerPlugin = (
  config: MarkdownTransformerConfig = {}
) => {
  const extensions = (config.extensions || ['.md']).map((ext: string) =>
    ext.startsWith('.') ? ext : `.${ext}`
  );
  return {
    parse: (input: VFile): EntryNode => parse(input, config),
    id: ownPackage.name,
    preknownSchemaFragments: () => ({
      _content: {
        html: html(config),
        excerpt: excerpt(config),
        timeToRead: timeToRead(config),
      },
    }),
    inspect: (input: EntryNode) => String(input),
    serialize: (input: EntryNode, ctx: CollectionContext) =>
      serialize(input, ctx, config),
    extensions,
  };
};

export default transformer;
