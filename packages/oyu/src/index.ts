import getNodesFromDirectory from '@oyu/source-filesystem';
import { nodeToJSON } from '@oyu/transformer-markdown';
// import github from 'remark-github';

import type { TransformerConfig } from '@oyu/transformer-markdown';
import type { VFile } from 'vfile';

const nodes = await getNodesFromDirectory('content/posts');

const defaultConfig: TransformerConfig = {
  markdown: {
    gfm: true,
    externalLinks: true,
    // remarkPlugins: [github],
  },
};

/**
 * Convert an iterable set of content to an array of objects
 *
 * @param nodes array of content files
 * @returns array of JSON-transformed content files
 */
async function convertNodesToJSON(
  nodes: Promise<VFile>[]
): Promise<Record<any, any>> {
  let data = [];
  for (let node of nodes) {
    data.push(await nodeToJSON(await node, defaultConfig));
  }
  return data;
}
const result = await convertNodesToJSON(nodes);
console.log(result);
