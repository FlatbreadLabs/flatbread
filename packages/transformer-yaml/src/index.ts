import type { VFile } from 'vfile';
import yaml from 'js-yaml';
import slugify from '@sindresorhus/slugify';
import {
  AnyContentNode,
  TransformerPlugin,
  BaseNodeSchema,
  validateContent,
} from '@flatbread/core';

/**
 * YAML transformer – parses YAML front-matter–only files into `AnyContentNode`s.
 * The shape is entirely user-defined; we only validate the required `id` field
 * via `BaseNodeSchema` to guarantee referential integrity.
 */

export const parse = (input: VFile): AnyContentNode => {
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
    } satisfies AnyContentNode;

    const validation = validateContent(node, BaseNodeSchema);
    if (!validation.success) {
      throw new Error(
        `Validation failed for ${input.path}: ${validation.error.message}`
      );
    }

    return validation.data;
  }
  throw new Error(`Could not parse yaml file ${input.path}`);
};

export const transformer: TransformerPlugin = () => ({
  parse,
  inspect: (input: AnyContentNode) => String(input),
  extensions: ['.yml', '.yaml'] as const,
});

export default transformer;
