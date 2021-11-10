import matter from 'gray-matter';
import slugify from '@sindresorhus/slugify';
import { createProcessor } from './processor';
import estimateTimeToRead from './utils/timeToRead';

import type { VFile } from 'vfile';
import type { TransformerConfig } from './types';
import type { OyuJsonNode } from '@oyu/core';

/**
 * @param {VFile} file - A VFile object representing a content node.
 */
export const nodeToJSON = async (
  node: VFile,
  config: TransformerConfig = {}
): Promise<OyuJsonNode> => {
  const markdownProcessor = createProcessor();
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
