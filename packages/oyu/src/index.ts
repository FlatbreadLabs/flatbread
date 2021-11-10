import getNodesFromDirectory from '@oyu/source-filesystem';
import { nodeToJSON } from '@oyu/transformer-markdown';

const nodes = await getNodesFromDirectory('content/authors');

async function convertNodesToJSON(nodes: any[]): Promise<Record<any, any>> {
  let data = [];
  for (let node of nodes) {
    data.push(await nodeToJSON(await node));
  }
  return data;
}
const result = await convertNodesToJSON(nodes);
console.log(result);
