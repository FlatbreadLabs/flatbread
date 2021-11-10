import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';

import type { MarkdownConfig } from './types';

export function createProcessor(options: MarkdownConfig = {}) {
  const processor = unified();
  //   const plugins = createPlugins(options, options);
  // const config = options?. || {};

  return processor.use(remarkParse).use(remarkHtml);
}
