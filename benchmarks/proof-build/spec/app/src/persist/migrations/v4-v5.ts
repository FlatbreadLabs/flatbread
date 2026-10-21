import type { RawFile } from './index.ts';

/** Version 4 stored rotation in degrees. Version 5 stores radians. */
export function v4ToV5(file: RawFile): RawFile {
  const nodes: Record<string, Record<string, unknown>> = {};
  for (const [id, node] of Object.entries(
    file.nodes as Record<string, Record<string, unknown>>
  )) {
    const degrees = typeof node.rotation === 'number' ? node.rotation : 0;
    nodes[id] = { ...node, rotation: (degrees * Math.PI) / 180 };
  }
  return { ...file, version: 5, nodes };
}
