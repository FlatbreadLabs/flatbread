import yaml from 'js-yaml';
import type { YAMLException } from 'js-yaml';
import slugify from '@sindresorhus/slugify';
import type { EntryNode, TransformerPlugin } from '@flatbread/core';
import type { VFile } from 'vfile';

/**
 * Transforms a YAML file (content node) to JSON.
 *
 * @param {VFile} input - A VFile object representing a content node.
 */
export const parse = (input: VFile): EntryNode => {
  const doc = yaml.load(String(input), {
    filename: input.path,
    onWarning: (warning: YAMLException) =>
      console.log(console.warn(warning.toString())),
  });

  if (typeof doc === 'object') {
    return {
      _filename: input.basename,
      _path: input.path,
      _slug: slugify(input.stem ?? ''),
      ...input.data,
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
 * Converts YAML files to meaningful data.
 *
 * @returns YAML parser, preknown GraphQL schema fragments, and an EntryNode inspector function.
 */
export const transformYaml: TransformerPlugin = () => {
  return {
    parse: (input: VFile): EntryNode => parse(input),
    inspect: (input: EntryNode) => String(input),
    extensions: ['.yaml', '.yml'],
  };
};
