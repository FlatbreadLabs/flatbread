/**
 * Drop the leading `# Heading` from a document.
 *
 * Every guide keeps its H1 so the file reads properly on GitHub. The site
 * renders the `title` from frontmatter as the page heading instead, so leaving
 * the H1 in place would print the title twice.
 */
export function remarkStripFirstHeading() {
  return (tree) => {
    const children = tree.children ?? [];
    const first = children.findIndex((node) => node.type !== 'yaml');
    if (first === -1) return;

    const node = children[first];
    if (node.type === 'heading' && node.depth === 1) {
      children.splice(first, 1);
    }
  };
}

export default remarkStripFirstHeading;
