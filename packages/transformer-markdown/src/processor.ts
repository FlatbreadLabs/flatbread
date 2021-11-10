import { unified } from 'unified';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import rehypeRaw from 'rehype-raw';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSanitize from 'rehype-sanitize';

import type { MarkdownConfig } from './types';
import type { Processor } from 'unified';

export function createMarkdownProcessor(
  options: MarkdownConfig = {}
): Processor {
  const processor = unified();
  //   const plugins = createPlugins(options, options);
  // const config = options?. || {};

  return processor
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize)
    .use(rehypeStringify);
}
