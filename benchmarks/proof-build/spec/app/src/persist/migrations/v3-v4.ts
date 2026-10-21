import type { RawFile } from './index.ts';

/**
 * Version 3 kept nodes in a list, with `hidden` flags. Version 4 keys nodes
 * by id, lists the top-level ids in `top`, and stores `visible` and `locked`.
 */
export function v3ToV4(file: RawFile): RawFile {
  const list = file.nodes as Record<string, unknown>[];
  const nodes: Record<string, Record<string, unknown>> = {};
  const top: string[] = [];
  for (const node of list) {
    const { hidden, ...rest } = node;
    const id = String(rest.id);
    nodes[id] = {
      ...rest,
      parent: rest.parent ?? null,
      visible: hidden !== true,
      locked: rest.locked === true,
    };
    if (nodes[id].parent === null) top.push(id);
  }
  return { ...file, version: 4, top, nodes };
}
