export interface TocEntry {
  id: string;
  text: string;
  depth: 2 | 3;
}

const HEADING = /<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/g;
const ID = /\bid="([^"]*)"/;
const ELEMENT_WITH_BODY = /<(a|span)\b([^>]*)>[\s\S]*?<\/\1>/gi;
const CLASS = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const ARIA_HIDDEN = /\baria-hidden\s*=\s*(?:"true"|'true'|true)(?:\s|$)/i;
const ENTITY = /&(#(?:x[\da-f]+|\d+)|[a-z][a-z\d]+);/gi;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  hellip: '…',
  lt: '<',
  mdash: '—',
  nbsp: '\u00a0',
  ndash: '–',
  quot: '"',
};

/**
 * Read the contents list out of rendered HTML.
 *
 * `plugins/rehype-heading-anchors.mjs` puts the ids there while Flatbread
 * renders the page, so nothing has to parse Markdown twice.
 */
export function tableOfContents(html: string): TocEntry[] {
  const entries: TocEntry[] = [];

  for (const match of html.matchAll(HEADING)) {
    const id = match[2]?.match(ID)?.[1];
    if (!id) continue;
    const text = stripTags(match[3]).trim();
    if (!text) continue;
    entries.push({
      id,
      text,
      depth: match[1] === '2' ? 2 : 3,
    });
  }

  return entries;
}

function stripTags(value: string): string {
  const text = value
    .replace(ELEMENT_WITH_BODY, (element, _tag, attributes: string) => {
      const classes = CLASS.exec(attributes)
        ?.slice(1)
        .find(Boolean)
        ?.split(/\s+/);
      const marker = classes?.some((name) =>
        ['heading-anchor', 'heading-marker'].includes(name)
      );
      return marker || ARIA_HIDDEN.test(attributes) ? '' : element;
    })
    .replace(/<[^>]+>/g, '');

  return decodeEntities(text);
}

function decodeEntities(value: string): string {
  return value.replace(ENTITY, (entity, body: string) => {
    if (!body.startsWith('#')) {
      return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
    }

    const hexadecimal = body[1]?.toLowerCase() === 'x';
    const digits = body.slice(hexadecimal ? 2 : 1);
    const codePoint = Number.parseInt(digits, hexadecimal ? 16 : 10);
    const valid =
      Number.isInteger(codePoint) &&
      codePoint > 0 &&
      codePoint <= 0x10ffff &&
      !(codePoint >= 0xd800 && codePoint <= 0xdfff);

    return valid ? String.fromCodePoint(codePoint) : '\ufffd';
  });
}
