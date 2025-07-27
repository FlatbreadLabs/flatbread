import type {
  CollectionContext,
  EntryNode,
  TransformerPlugin,
} from '@flatbread/core';
import type { YAMLException } from 'js-yaml';
import yaml from 'js-yaml';
import { VFile } from 'vfile';
import ownPackage from '../package.json' assert { type: 'json' };

/**
 * Transforms a yaml file (content node) to JSON.
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
      record: {
        ...input.data,
        ...doc,
      },
    };
  }
  throw new Error(
    `Parsing ${
      input.path
    } yielded a '${typeof doc}' when an 'object' was expected.`
  );
};

function serialize(node: EntryNode, ctx: CollectionContext): VFile {
  const doc = yaml.dump(node);
  return new VFile(doc);
}

/**
 * Converts yaml files to meaningful data.
 *
 * @returns yaml parser, preknown GraphQL schema fragments, and an EntryNode inspector function.
 */
export const transformer: TransformerPlugin = () => {
  return {
    parse: (input: VFile): EntryNode => parse(input),
    inspect: (input: EntryNode) => String(input),
    id: ownPackage.name,
    serialize,
    extensions: ['.yaml', '.yml'],
  };
};

export default transformer;
