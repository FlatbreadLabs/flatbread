import yaml from 'js-yaml';
import type { YAMLException } from 'js-yaml';
import slugify from '@sindresorhus/slugify';
import type { EntryNode, TransformerPlugin } from '@flatbread/core';
import type { VFile } from 'vfile';

/**
 * Transforms a yaml file (content node) to JSON.
 *
 * @param {VFile} file - A VFile object representing a content node.
 */
export const parse = (input: VFile): EntryNode => {
  const doc = yaml.load(String(input), {
    filename: input.path,
    onWarning: (warning: YAMLException) =>
      console.log(console.warn(warning.toString())),
  });

  if (typeof doc === 'object') {
    return {
      filename: input.basename,
      path: input.path,
      slug: slugify(input.stem ?? ''),
      ...doc,
    };
  }
  throw new Error(
    `Parsing ${
      input.path
    } yielded a '${typeof doc}' when an 'object' was expected.`
  );
};

/**
 * Converts markdown files to meaningful data.
 *
 * @param config Markdown transformer configuration.
 * @returns Markdown parser, preknown GraphQL schema fragments, and an EntryNode inspector function.
 */
const transformer: TransformerPlugin = () => {
  return {
    parse: (input: VFile): EntryNode => parse(input),
    inspect: (input: EntryNode) => String(input),
  };
};

export default transformer;
