import type { Document } from '../model/document.ts';
import type { SceneNode } from '../model/types.ts';
import { walk } from '../model/query.ts';
import { SCHEMA_VERSION } from './schema.ts';

/** Node keys in a fixed order, so the same document always saves the same text. */
function sortedNode(node: SceneNode): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(node).sort())
    out[key] = (node as unknown as Record<string, unknown>)[key];
  return out;
}

/** The document as a file: version, name, top-level ids and nodes in paint order. */
export function serializeDocument(doc: Document): string {
  const data = doc.toJSON();
  const nodes: Record<string, unknown> = {};
  walk(doc, (node) => {
    nodes[node.id] = sortedNode(data.nodes[node.id]);
  });
  return JSON.stringify(
    { version: SCHEMA_VERSION, name: data.name, top: data.top, nodes },
    null,
    2
  );
}
