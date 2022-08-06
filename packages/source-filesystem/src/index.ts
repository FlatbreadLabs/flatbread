import slugify from '@sindresorhus/slugify';
import { defaultsDeep, merge } from 'lodash-es';
import { read, write } from 'to-vfile';
import ownPackage from '../package.json' assert { type: 'json' };
import type {
  CollectionContext,
  CollectionEntry,
  LoadedFlatbreadConfig,
  SourcePlugin,
} from '@flatbread/core';
import { relative, resolve } from 'path';
import type { VFile } from 'vfile';
import type {
  FileNode,
  InitializedSourceFilesystemConfig,
  sourceFilesystemConfig,
} from './types';
import gatherFileNodes from './utils/gatherFileNodes';

/**
 * Get nodes (files) from the directory
 *
 * @param path The directory to read from
 * @param config 'InitializedSourceFileSystemConfig
 * @returns An array of content nodes
 */
async function getNodesFromDirectory(
  collectionEntry: CollectionEntry,
  config: InitializedSourceFilesystemConfig
): Promise<VFile[]> {
  const { extensions } = config;
  const nodes: FileNode[] = await gatherFileNodes(collectionEntry.path, {
    extensions,
  });

  return Promise.all(
    nodes.map(async (node: FileNode): Promise<VFile> => {
      const file = await read(node.path);
      file.data = merge(node.data, {
        _flatbread: {
          referenceField: collectionEntry.referenceField,
          collection: collectionEntry.collection,
          filename: file.basename,
          path: relative(process.cwd(), file.path),
          slug: slugify(file.stem ?? ''),
          sourcedBy: ownPackage.name,
        },
      });

      return file;
    })
  );
}

/**
 * Returns all nodes from the directory
 *
 * @param paths array of directories to read from
 * @returns
 */
async function getAllNodes(
  allCollectionEntries: CollectionEntry[],
  config: InitializedSourceFilesystemConfig
): Promise<Record<string, VFile[]>> {
  const nodeEntries = await Promise.all(
    allCollectionEntries.map(
      async (contentType): Promise<Record<string, any>> =>
        new Promise(async (res) =>
          res([
            contentType.collection,
            await getNodesFromDirectory(contentType, config),
          ])
        )
    )
  );

  const nodes = Object.fromEntries(
    nodeEntries as Iterable<readonly [PropertyKey, any]>
  );

  return nodes;
}

// TODO: _flatbread data should be extracted from plugins
// plugin should return a context object and be given the same context object back when saving,
// this context object will be saved internally under _flatbread[collectionId]

async function put(source: VFile, ctx: CollectionContext) {
  (source.basename = ctx.filename),
    (source.path = resolve(process.cwd(), ctx.path));

  await write(source);
}

/**
 * Source filesystem plugin for fetching flat-file content nodes from directories on disk.
 *
 * @param sourceConfig content types config
 * @returns A function that returns functions which fetch lists of nodes
 */
export const source: SourcePlugin = (sourceConfig?: sourceFilesystemConfig) => {
  let config: InitializedSourceFilesystemConfig;

  return {
    initialize: (flatbreadConfig: LoadedFlatbreadConfig) => {
      const { extensions } = flatbreadConfig.loaded;
      config = defaultsDeep(sourceConfig ?? {}, { extensions });
    },
    fetch: (content: CollectionEntry[]) => getAllNodes(content, config),
    put,
  };
};

export default source;
