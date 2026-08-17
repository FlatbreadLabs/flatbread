import { textOf, walk } from './walk.mjs';

const PAGE_IDS = ['doc-prose', 'main-content'];

/**
 * Give every heading below H1 a stable `id` and a link to itself.
 *
 * This plugin is the only place a heading id is made. `lib/toc.ts` reads
 * those ids back out of the rendered HTML.
 */
export function rehypeHeadingAnchors(options = {}) {
  const depths = options.depths ?? ['h2', 'h3', 'h4'];
  const reservedIds = [...PAGE_IDS, ...(options.reservedIds ?? [])];

  return (tree) => {
    const used = new Set(reservedIds.map(String));

    walk(tree, (node) => {
      if (node.type !== 'element' || !depths.includes(node.tagName)) return;

      node.properties = node.properties ?? {};
      const text = textOf(node).trim();
      const id = unique(String(node.properties.id ?? slug(text)), used);
      if (!id) return;
      node.properties.id = id;
      node.properties['aria-label'] = text;

      node.children = [
        {
          type: 'element',
          tagName: 'a',
          properties: {
            href: `#${id}`,
            className: ['heading-anchor'],
            'aria-label': `Link to ${text}`,
          },
          children: [{ type: 'text', value: '#' }],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['heading-marker'],
            ariaHidden: 'true',
          },
          children: [
            {
              type: 'text',
              value: '#'.repeat(Number(node.tagName.slice(1))),
            },
          ],
        },
        ...node.children,
      ];
    });
  };
}

/** Turn heading text into the `id` that `lib/toc.ts` later reads from the HTML. */
function slug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function unique(base, used) {
  if (!base) return '';
  let candidate = base;
  let suffix = 1;
  while (used.has(candidate)) candidate = `${base}-${suffix++}`;
  used.add(candidate);
  return candidate;
}

export default rehypeHeadingAnchors;
