import matter from 'gray-matter';
import slugify from '@sindresorhus/slugify';
import { createMarkdownProcessor } from './processor';
import estimateTimeToRead from './utils/timeToRead';

import type { TransformerConfig } from './types';
import type { OyuJsonNode } from '@oyu/core';
import type { VFile } from 'vfile';

export * from './types';

/**
 * Transforms a markdown file (content node) to JSON.
 * @param {VFile} file - A VFile object representing a content node
 * @param {TransformerConfig} config - A configuration object
 */
export const nodeToJSON = async (
  node: VFile,
  config: TransformerConfig = {}
): Promise<OyuJsonNode> => {
  const markdownProcessor = createMarkdownProcessor(config.markdown);
  const { data, content } = matter(String(node), config.grayMatter);

  const html = await markdownProcessor.process(content);

  return {
    __filename: node.basename,
    slug: slugify(node.stem ?? ''),
    ...data,
    timeToRead: estimateTimeToRead(String(html), 230),
    content: String(html),
  };
};
