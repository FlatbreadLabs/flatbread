/**
 * Drop the first H1 from a document.
 *
 * Every guide keeps its H1 so the file reads properly on GitHub. The site
 * renders the `title` from frontmatter as the page heading instead, so leaving
 * the H1 in place would print the title twice.
 */
export function remarkStripFirstHeading() {
  return (tree) => {
    const children = tree.children ?? [];
    const first = children.findIndex(
      (node) =>
        (node.type === 'heading' && node.depth === 1) ||
        (node.type === 'html' && /^\s*<h1\b[\s\S]*<\/h1>\s*$/i.test(node.value))
    );
    if (first === -1) return;
    children.splice(first, 1);
  };
}

export default remarkStripFirstHeading;
