import type { RawFile } from './index.ts';

/** Version 2 had one `fill` and one `stroke` per node. Version 3 has lists. */
export function v2ToV3(file: RawFile): RawFile {
  const nodes = (file.nodes as Record<string, unknown>[]).map((node) => {
    const { fill, stroke, strokeWidth, ...rest } = node;
    if (rest.type === 'group') return rest;
    return {
      ...rest,
      fills:
        typeof fill === 'string' ? [{ color: String(fill).toUpperCase() }] : [],
      strokes:
        typeof stroke === 'string'
          ? [
              {
                color: String(stroke).toUpperCase(),
                width: Number(strokeWidth ?? 1),
                align: 'inside',
              },
            ]
          : [],
    };
  });
  return { ...file, version: 3, nodes };
}
