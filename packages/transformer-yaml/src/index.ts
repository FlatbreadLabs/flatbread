import { VFile } from 'vfile';
import yaml from 'js-yaml';
import slugify from '@sindresorhus/slugify';
import {
  EntryNode,
  TransformerPlugin,
  BaseNodeSchema,
  validateContent,
} from '@flatbread/core';

/**
 * YAML transformer – parses YAML front-matter–only files into `EntryNode`s.
 * The shape is entirely user-defined; we only validate the required `id` field
 * via `BaseNodeSchema` to guarantee referential integrity.
 */

export const parse = (input: VFile): EntryNode => {
  const doc = yaml.load(String(input));
  if (typeof doc === 'object' && doc !== null) {
    const slug = slugify(input.stem ?? '');
    const node = {
      id: (doc as any).id || slug,
      _filename: input.basename,
      _path: input.path,
      _slug: slug,
      ...input.data,
      ...doc,
    } as EntryNode;
    validateContent(node, BaseNodeSchema);
    return node;
  }
  throw new Error(`Could not parse yaml file ${input.path}`);
};

export const transformer: TransformerPlugin = () => ({
  parse,
  inspect: (input: EntryNode) => String(input),
  extensions: ['.yml', '.yaml'] as const,
  contentSchema: BaseNodeSchema,
});

export default transformer;
