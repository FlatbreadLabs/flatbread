import { readLength } from '../../units/parse.ts';
import type { RawFile } from './index.ts';

const LENGTH_KEYS = ['x', 'y', 'width', 'height', 'strokeWidth', 'fontSize'];

/** Version 1 wrote lengths as strings such as "12px". Version 2 stores numbers. */
export function v1ToV2(file: RawFile): RawFile {
  const nodes = (file.nodes as Record<string, unknown>[]).map((node) => {
    const out = { ...node };
    for (const key of LENGTH_KEYS)
      if (key in out) out[key] = readLength(out[key]);
    return out;
  });
  return { ...file, version: 2, nodes };
}
