import { describe, expect, it } from 'vitest';
import { rehypeHeadingAnchors } from '../plugins/rehype-heading-anchors.mjs';
import { tableOfContents } from './toc';

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: { id?: string };
  children?: HastNode[];
};

describe('tableOfContents', () => {
  it('returns h2 and h3 entries in document order with the right depths', () => {
    const html = '<h2 id="one">One</h2><p>body</p><h3 id="two">Two</h3>';

    expect(tableOfContents(html)).toEqual([
      { id: 'one', text: 'One', depth: 2 },
      { id: 'two', text: 'Two', depth: 3 },
    ]);
  });

  it('reads id when it sits after another attribute', () => {
    const html = '<h2 class="x" id="one">One</h2>';

    expect(tableOfContents(html)).toEqual([
      { id: 'one', text: 'One', depth: 2 },
    ]);
  });

  it('skips a heading with no id', () => {
    const html =
      '<h2>Nope</h2><h2 class="x">Still nope</h2><h2 id="yes">Yes</h2>';

    expect(tableOfContents(html)).toEqual([
      { id: 'yes', text: 'Yes', depth: 2 },
    ]);
  });

  it('ignores h1 and h4', () => {
    const html =
      '<h1 id="top">Top</h1><h2 id="mid">Mid</h2><h4 id="low">Low</h4>';

    expect(tableOfContents(html)).toEqual([
      { id: 'mid', text: 'Mid', depth: 2 },
    ]);
  });

  it('strips the self link and other inline tags from the text', () => {
    const html =
      '<h2 id="one"><a href="#one" class="heading-anchor" aria-label="Link to this section">#</a>Use <code>tableOfContents</code></h2>';

    expect(tableOfContents(html)).toEqual([
      { id: 'one', text: 'Use tableOfContents', depth: 2 },
    ]);
  });

  it('excludes heading markers and hidden text from a label', () => {
    const html =
      '<h2 id="one"><span class="extra heading-marker" aria-hidden="true">##</span><a class="heading-anchor extra" href="#one">#</a>Visible <span aria-hidden=true>detail</span> title</h2>';

    expect(tableOfContents(html)).toEqual([
      { id: 'one', text: 'Visible  title', depth: 2 },
    ]);
  });

  it('decodes HTML entities in the heading text', () => {
    const html =
      '<h2 id="ents">A &amp; B &lt;C&gt; &quot;D&quot; &#39;E&#39;</h2>';

    expect(tableOfContents(html)).toEqual([
      { id: 'ents', text: 'A & B <C> "D" \'E\'', depth: 2 },
    ]);
  });

  it('decodes named, decimal, and hexadecimal entities without throwing', () => {
    const html =
      '<h2 id="ents">Go&#32;now&nbsp;&#x1f680; &unknown; &#x110000;</h2>';

    expect(tableOfContents(html)).toEqual([
      { id: 'ents', text: 'Go now\u00a0🚀 &unknown; �', depth: 2 },
    ]);
  });

  it('skips a heading whose text is empty after stripping', () => {
    const html =
      '<h2 id="empty"><a href="#empty" class="heading-anchor" aria-label="Link to this section">#</a></h2><h2 id="spaces">   </h2><h2 id="kept">Kept</h2>';

    expect(tableOfContents(html)).toEqual([
      { id: 'kept', text: 'Kept', depth: 2 },
    ]);
  });

  it('reads the ids the heading plugin writes', () => {
    const h2: HastNode = {
      type: 'element',
      tagName: 'h2',
      properties: {},
      children: [{ type: 'text', value: 'Hello World' }],
    };
    const h3: HastNode = {
      type: 'element',
      tagName: 'h3',
      properties: {},
      children: [{ type: 'text', value: 'Nested' }],
    };
    const tree: HastNode = { type: 'root', children: [h2, h3] };

    rehypeHeadingAnchors()(tree);

    const html = `<h2 id="${h2.properties?.id}">Hello World</h2><h3 id="${h3.properties?.id}">Nested</h3>`;

    expect(h2.properties?.id).toBe('hello-world');
    expect(h3.properties?.id).toBe('nested');
    expect(tableOfContents(html)).toEqual([
      { id: 'hello-world', text: 'Hello World', depth: 2 },
      { id: 'nested', text: 'Nested', depth: 3 },
    ]);
  });
});
