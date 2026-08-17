import { describe, expect, it } from 'vitest';

import { createMarkdownProcessor } from '../../../packages/transformer-markdown/src/processors/markdown';
import { rehypeHeadingAnchors } from './rehype-heading-anchors.mjs';
import { rehypeShiki } from './rehype-shiki.mjs';
import { rehypeTableScroll } from './rehype-table-scroll.mjs';
import { remarkCodeMeta } from './remark-code-meta.mjs';
import { remarkStripFirstHeading } from './remark-strip-first-heading.mjs';

function processor({ reservedIds = [] }: { reservedIds?: string[] } = {}) {
  return createMarkdownProcessor({
    gfm: true,
    remarkPlugins: [remarkStripFirstHeading, remarkCodeMeta],
    rehypePlugins: [
      [rehypeHeadingAnchors, { reservedIds }],
      rehypeShiki,
      rehypeTableScroll,
    ],
  });
}

describe('docs Markdown pipeline', () => {
  it('keeps code language and title metadata through sanitizing and highlighting', async () => {
    const result = await processor().process(
      '```ts title="demo.ts"\nconst answer = 42;\n```'
    );
    const html = String(result);

    expect(html).toContain('data-language="ts"');
    expect(html).toContain('data-title="demo.ts"');
    expect(html).toContain('--shiki-light');
  });

  it('gives headings plain names and unique permalink labels', async () => {
    const html = String(await processor().process('## Quick start'));

    expect(html).toContain('aria-label="Quick start"');
    expect(html).toContain('aria-label="Link to Quick start"');
    expect(html).toContain('class="heading-marker" aria-hidden="true"');
  });

  it('preserves inline heading order and numbers duplicates in document order', async () => {
    const html = String(
      await processor().process(
        [
          '## Tag `facet` vs *tag collection*',
          '',
          '## Same',
          '',
          '## Same',
        ].join('\n')
      )
    );

    expect(html).toContain('id="tag-facet-vs-tag-collection"');
    expect(html).toContain('aria-label="Tag facet vs tag collection"');
    expect(html.indexOf('id="same"')).toBeLessThan(html.indexOf('id="same-1"'));
  });

  it('does not reuse an id reserved by the surrounding page', async () => {
    const html = String(
      await processor({ reservedIds: ['search-overlay'] }).process(
        [
          '## Main content',
          '',
          '## Main content-1',
          '',
          '## Doc prose',
          '',
          '## Search overlay',
        ].join('\n')
      )
    );

    expect(html).toContain('id="main-content-1"');
    expect(html).toContain('id="main-content-1-1"');
    expect(html).toContain('id="doc-prose-1"');
    expect(html).toContain('id="search-overlay-1"');
  });

  it('does not duplicate an id already allocated as a suffix', async () => {
    const html = String(
      await processor().process(
        ['## Same', '', '## Same', '', '## Same-1'].join('\n')
      )
    );

    expect(html).toContain('id="same"');
    expect(html).toContain('id="same-1"');
    expect(html).toContain('id="same-1-1"');
  });

  it('removes a raw HTML H1 and wraps a wide table', async () => {
    const source = [
      '<p><img src="logo.png" alt="Logo"></p>',
      '',
      '<h1>Package name</h1>',
      '',
      '| A | B |',
      '| - | - |',
      '| one | two |',
    ].join('\n');
    const html = String(await processor().process(source));

    expect(html).not.toContain('<h1>');
    expect(html).toContain('class="table-scroll"');
    expect(html).toContain('aria-label="Scrollable table"');
  });
});
