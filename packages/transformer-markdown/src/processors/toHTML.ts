import { createMarkdownProcessor } from './markdown';

import type { MarkdownConfig } from '..';

export default async function transformContentToHTML(
  content: string,
  markdownConfig: MarkdownConfig
): Promise<string> {
  const markdownProcessor = createMarkdownProcessor(markdownConfig);
  const html = content ? String(await markdownProcessor.process(content)) : ``;
  return html;
}
