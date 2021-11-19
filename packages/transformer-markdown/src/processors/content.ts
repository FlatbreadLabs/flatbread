import { createMarkdownProcessor } from './markdown';

import type { MarkdownConfig } from '..';

export default async function transformContent(
  node: any,
  markdownConfig: MarkdownConfig
): Promise<string> {
  const { raw } = node.data.content;
  const markdownProcessor = createMarkdownProcessor(markdownConfig);
  const html = raw ? String(await markdownProcessor.process(raw)) : '';
  return html;
}
