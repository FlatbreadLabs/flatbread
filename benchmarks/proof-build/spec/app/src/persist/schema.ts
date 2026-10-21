import type { DocumentData, SceneNode } from '../model/types.ts';
import { NODE_TYPES, isContainer } from '../model/types.ts';
import { fail } from '../util/assert.ts';

/** The version `files.save()` writes. Older files are migrated up to it. */
export const SCHEMA_VERSION = 5;

export interface SavedFile extends DocumentData {
  version: number;
}

const DEFAULTS: Record<string, unknown> = {
  name: '',
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  visible: true,
  locked: false,
  opacity: 1,
};

const STYLED_DEFAULTS: Record<string, unknown> = { fills: [], strokes: [] };

const TEXT_DEFAULTS: Record<string, unknown> = {
  text: '',
  fontSize: 16,
  lineHeight: 1.25,
  align: 'left',
};

/** Fills in fields a valid older file may leave out. */
export function withDefaults(node: Record<string, unknown>): SceneNode {
  const out: Record<string, unknown> = { ...DEFAULTS, ...node };
  if (node.type !== 'group') Object.assign(out, { ...STYLED_DEFAULTS, ...out });
  if (node.type === 'frame') out.clip ??= true;
  if (node.type === 'text') Object.assign(out, { ...TEXT_DEFAULTS, ...out });
  if (node.type === 'frame' || node.type === 'group') out.children ??= [];
  out.parent ??= null;
  return out as unknown as SceneNode;
}

/** Throws a `bad-file` error unless the tree in `data` is consistent. */
export function validateDocument(data: DocumentData): void {
  const bad = (message: string): never => fail('bad-file', message);
  if (typeof data.name !== 'string') bad('the document has no name');
  if (!Array.isArray(data.top)) bad('the document has no top-level list');
  const seen = new Set<string>();
  const visit = (id: string, parent: string | null) => {
    const node = data.nodes[id];
    if (!node) bad(`missing node ${id}`);
    if (seen.has(id)) bad(`node ${id} appears twice`);
    seen.add(id);
    if (node.id !== id) bad(`node ${id} is stored as ${node.id}`);
    if (!NODE_TYPES.includes(node.type))
      bad(`node ${id} has unknown type ${String(node.type)}`);
    if (node.parent !== parent) bad(`node ${id} names the wrong parent`);
    for (const key of [
      'x',
      'y',
      'width',
      'height',
      'rotation',
      'opacity',
    ] as const)
      if (typeof node[key] !== 'number' || !Number.isFinite(node[key]))
        bad(`node ${id} has a bad ${key}`);
    if (isContainer(node)) for (const child of node.children) visit(child, id);
  };
  for (const id of data.top) visit(id, null);
  for (const id of Object.keys(data.nodes))
    if (!seen.has(id)) bad(`node ${id} is not in the tree`);
}
