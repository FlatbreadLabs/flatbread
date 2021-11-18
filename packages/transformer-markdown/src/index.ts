import matter from 'gray-matter';
import slugify from '@sindresorhus/slugify';
import sanitizeHtml from 'sanitize-html';
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

  const html = content ? await markdownProcessor.process(content) : '';
  const plaintext = content
    ? sanitizeHtml(html, {
        allowedAttributes: {},
        allowedTags: [],
      })
    : '';

  return {
    __filename: node.basename,
    slug: slugify(node.stem ?? ''),
    ...data,
    timeToRead: content ? estimateTimeToRead(plaintext, 230) : 0,
    content: String(html),
  };
};
