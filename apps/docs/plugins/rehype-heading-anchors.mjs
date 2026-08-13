import { walk } from './walk.mjs';

/**
 * Give every heading below H1 a stable `id` and a link to itself.
 *
 * This plugin is the only place a heading id is made. `lib/toc.ts` reads
 * those ids back out of the rendered HTML.
 */
export function rehypeHeadingAnchors(options = {}) {
  const depths = options.depths ?? ['h2', 'h3', 'h4'];

  return (tree) => {
    const used = new Map();

    walk(tree, (node) => {
      if (node.type !== 'element' || !depths.includes(node.tagName)) return;

      node.properties = node.properties ?? {};
      const id = node.properties.id ?? unique(slug(textOf(node)), used);
      if (!id) return;
      node.properties.id = id;

      node.children = [
        {
          type: 'element',
          tagName: 'a',
          properties: {
            href: `#${id}`,
            className: ['heading-anchor'],
            'aria-label': 'Link to this section',
          },
          children: [{ type: 'text', value: '#' }],
        },
        ...node.children,
      ];
    });
  };
}

function textOf(node) {
  let text = '';
  walk(node, (child) => {
    if (child.type === 'text') text += child.value ?? '';
  });
  return text;
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
  const seen = used.get(base) ?? 0;
  used.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen}`;
}

export default rehypeHeadingAnchors;
