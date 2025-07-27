import { VFile } from 'vfile';
import yaml from 'js-yaml';
import slugify from '@sindresorhus/slugify';
import { EntryNode, TransformerPlugin } from '@flatbread/core';

/**
 * Parse a YAML file into an EntryNode.
 *
 * @param input VFile
 * @returns EntryNode
 */
export const parse = (input: VFile): EntryNode => {
  const doc = yaml.load(String(input));

  if (typeof doc === 'object' && doc !== null) {
    const slug = slugify(input.stem ?? '');
    return {
      id: (doc as any).id || slug, // Use explicit id from YAML or fall back to slug
      _filename: input.basename,
      _path: input.path,
      _slug: slug,
      ...input.data,
      ...doc,
    };
  }

  throw new Error(`Could not parse yaml file ${input.path}`);
};

/**
 * Plugin for parsing YAML data.
 *
 * @returns Transformer
 */
export const transformer: TransformerPlugin = () => {
  return {
    parse,
    inspect: (input: EntryNode) => String(input),
    extensions: ['.yml', '.yaml'] as const,
  };
};
