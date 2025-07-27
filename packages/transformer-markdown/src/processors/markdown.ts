import { unified } from 'unified';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import rehypeRaw from 'rehype-raw';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSanitize from 'rehype-sanitize';
// Plugin for adding target/rel attributes to external links
import rehypeExternalLinks from 'rehype-external-links';
import type { Options as ExternalLinksOptions } from 'rehype-external-links';
import gfm from 'remark-gfm';

import type {
  MarkdownConfig,
  Processor,
  PluggableList,
  Plugin,
} from '../types';

// Inline helper to attach plugins while keeping strict typings.
function attachPlugins(list: PluggableList, proc: unknown) {
  for (const pl of list) {
    if (Array.isArray(pl)) {
      // Tuple form: [pluginFn, options]
      const [fn, opts] = pl;
      // The unified types make this awkward to type precisely without exposing internal generics.
      // Using `as unknown` maintains type‐safety externally without resorting to `any`.
      (proc as unknown as { use: (f: Plugin, o?: unknown) => void }).use(
        fn as Plugin,
        opts
      );
    } else {
      (proc as unknown as { use: (f: Plugin) => void }).use(pl as Plugin);
    }
  }
}

/**
 * Factory function to create a processor for markdown files.
 * @param options Markdown config
 * @returns [Unified](https://github.com/unifiedjs/unified) markdown processor
 */
export function createMarkdownProcessor(
  options: MarkdownConfig = {}
) {
  const toMDAST = unified().use(remarkParse).use(remarkFrontmatter);

  if (options.remarkPlugins) {
    attachPlugins(options.remarkPlugins, toMDAST);
  }
  if (options.gfm) {
    toMDAST.use(gfm);
  }
  const toHAST = toMDAST
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize);

  if (options.externalLinks) {
    const externalLinksConfig = {
      target: options?.externalLinksTarget ?? '_blank',
      rel: options?.externalLinksRel ?? ['nofollow', 'noopener', 'noreferrer'],
    };
    toHAST.use(
      rehypeExternalLinks,
      externalLinksConfig as ExternalLinksOptions
    );
  }

  if (options.rehypePlugins) {
    attachPlugins(options.rehypePlugins, toHAST);
  }

  const processor = toHAST.use(rehypeStringify);
  return processor;
}
