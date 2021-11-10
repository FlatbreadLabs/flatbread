import { unified } from 'unified';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import rehypeRaw from 'rehype-raw';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSanitize from 'rehype-sanitize';
import external from 'remark-external-links';
import gfm from 'remark-gfm';

import type { MarkdownConfig, Processor, UnifiedTuple, Plugin } from './types';
import type { Options as ExternalLinksOptions } from 'remark-external-links';

/**
 * Add plugins with optional config to the processor via mutation.
 * @param plugins Tuples of plugin and config
 * @param processor UnifiedJS processor
 * @returns the processor
 */
const applyPlugins = (
  plugins: UnifiedTuple[],
  processor: Processor
): Processor => {
  plugins.forEach((plugin) => {
    if (Array.isArray(plugin)) {
      if (plugin[1] && plugin[1]) processor.use(plugin[0] as Plugin, plugin[1]);
      else processor.use(plugin[0] as Plugin);
    } else {
      processor.use(plugin as Plugin);
    }
  });

  return processor;
};

/**
 * Factory function to create a processor for markdown files.
 * @param options Markdown config
 * @returns [Unified](https://github.com/unifiedjs/unified) markdown processor
 */
export function createMarkdownProcessor(
  options: MarkdownConfig = {}
): Processor {
  const toMDAST = unified().use(remarkParse).use(remarkFrontmatter);

  if (options.remarkPlugins) {
    applyPlugins(options.remarkPlugins, toMDAST);
  }
  if (options.gfm) {
    toMDAST.use(gfm);
  }
  if (options.externalLinks) {
    const externalLinksConfig = {
      target: options?.externalLinksTarget ?? '_blank',
      rel: options?.externalLinksRel ?? ['nofollow', 'noopener', 'noreferrer'],
    };
    toMDAST.use(external, externalLinksConfig as ExternalLinksOptions);
  }

  const toHAST = toMDAST
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize);

  if (options.rehypePlugins) {
    applyPlugins(options.rehypePlugins, toHAST);
  }

  const processor = toHAST.use(rehypeStringify);
  return processor;
}
