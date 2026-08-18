import { walk } from './walk.mjs';

/** Keep wide Markdown tables inside a labelled horizontal scroll region. */
export function rehypeTableScroll() {
  return (tree) => {
    const tables = [];
    walk(tree, (node, index, parent) => {
      if (
        node.type === 'element' &&
        node.tagName === 'table' &&
        index !== undefined &&
        parent
      ) {
        tables.push({ node, index, parent });
      }
    });

    for (const { node, index, parent } of tables) {
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['table-scroll'],
          role: 'region',
          ariaLabel: 'Scrollable table',
          tabIndex: 0,
        },
        children: [node],
      };
    }
  };
}

export default rehypeTableScroll;
