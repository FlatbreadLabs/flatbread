/**
 * Walk every node in a unist tree, deepest last, calling `visit` with the node,
 * its index in its parent, and the parent itself.
 *
 * The docs site ships its own walker so the plugins below stay free of the
 * `unist-util-visit` major version that Flatbread's markdown transformer
 * happens to depend on.
 */
export function walk(tree, visit) {
  const step = (node, index, parent) => {
    visit(node, index, parent);
    const children = node.children;
    if (!Array.isArray(children)) return;
    for (let i = children.length - 1; i >= 0; i -= 1) {
      step(children[i], i, node);
    }
  };

  step(tree, undefined, undefined);
}

/** Collect the plain text held under a node. */
export function textOf(node) {
  let text = '';
  walk(node, (child) => {
    if (child.type === 'text' || child.type === 'inlineCode') {
      text += child.value ?? '';
    }
  });
  return text;
}
