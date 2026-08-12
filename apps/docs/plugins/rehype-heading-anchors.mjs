import { walk } from './walk.mjs';

/**
 * Give every heading below H1 a stable `id` and a link to itself.
 *
 * The table of contents in the sidebar reads these ids straight out of the
 * rendered HTML, so the slug rule here and the one in `lib/toc.ts` must agree.
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

/** Kept in step with `slug()` in `lib/toc.ts`. */
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
