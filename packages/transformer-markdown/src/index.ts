import matter from 'gray-matter';
import slugify from '@sindresorhus/slugify';

import type { MarkdownTransformerConfig } from './types';
import type { EntryNode, Transformer } from '@oyu/core';
import type { VFile } from 'vfile';

export * from './types';

/**
 * Transforms a markdown file (content node) to JSON containing any frontmatter data or content.
 * @param {VFile} file - A VFile object representing a content node
 * @param {MarkdownTransformerConfig} config - A configuration object
 */
export const parse = async (
  input: VFile,
  config: MarkdownTransformerConfig
): Promise<EntryNode> => {
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

// const useTransformer = (config): Transformer<VFile, MarkdownTransformerConfig> => {
//   parse,
// };
// export default useTransformer;
