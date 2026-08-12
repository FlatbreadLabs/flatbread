export interface TocEntry {
  id: string;
  text: string;
  depth: 2 | 3;
}

const HEADING = /<h([23])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;

/**
 * Read the contents list out of rendered HTML.
 *
 * `plugins/rehype-heading-anchors.mjs` puts the ids there while Flatbread
 * renders the page, so nothing has to parse Markdown twice.
 */
export function tableOfContents(html: string): TocEntry[] {
  const entries: TocEntry[] = [];

  for (const match of html.matchAll(HEADING)) {
    const text = stripTags(match[3]).trim();
    if (!text) continue;
    entries.push({
      id: match[2],
      text,
      depth: match[1] === '2' ? 2 : 3,
    });
  }

  return entries;
}

function stripTags(value: string): string {
  return value
    .replace(/<a\s[^>]*class="heading-anchor"[^>]*>[\s\S]*?<\/a>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
