import { VFile } from 'vfile';
import matter from 'gray-matter';
import slugify from '@sindresorhus/slugify';
import {
  EntryNode,
  TransformerPlugin,
  BaseNodeSchema,
  validateContent,
} from '@flatbread/core';
import { MarkdownTransformerConfig } from './types';
import { html, excerpt, timeToRead } from './graphql/schema-helpers';

/**
 * Markdown transformer – converts front-matter & body into a flat `EntryNode`.
 *
 * It also exposes `_content` schema fragments (`html`, `excerpt`, `timeToRead`)
 * so downstream code can attach custom resolvers.
 */
export * from './types';

export const parse = (
  input: VFile,
  config: MarkdownTransformerConfig
): EntryNode => {
  const { data, content } = matter(String(input), config.grayMatter);
  const slug = slugify(input.stem ?? '');

  const node = {
    id: data.id || slug,
    _filename: input.basename,
    _path: input.path,
    _slug: slug,
    ...input.data,
    ...data,
    _content: {
      raw: content,
    },
  } as EntryNode;

  validateContent(node, BaseNodeSchema);
  return node;
};

export const transformer: TransformerPlugin<MarkdownTransformerConfig> = (
  config: MarkdownTransformerConfig = {}
) => {
  const extensions = (config.extensions || ['.md']).map((ext) =>
    ext.startsWith('.') ? ext : `.${ext}`
  );
  return {
    parse: (input: VFile): EntryNode => parse(input, config),
    preknownSchemaFragments: () => ({
      _content: {
        html: html(config)(),
        excerpt: excerpt(config)(),
        timeToRead: timeToRead(config)(),
      },
    }),
    inspect: (input: EntryNode) => String(input),
    extensions,
    contentSchema: BaseNodeSchema,
  };
};

export default transformer;
