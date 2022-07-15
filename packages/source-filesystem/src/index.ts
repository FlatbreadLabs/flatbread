import { defaultsDeep } from 'lodash-es';
import { read } from 'to-vfile';

import type { LoadedFlatbreadConfig, SourcePlugin } from '@flatbread/core';
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
  path: string,
  config: InitializedSourceFilesystemConfig
): Promise<VFile[]> {
  const { extensions } = config;
  const nodes: FileNode[] = await gatherFileNodes(path, { extensions });

  return Promise.all(
    nodes.map(async (node: FileNode): Promise<VFile> => {
      const file = await read(node.path);
      file.data = node.data;
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
  allContentTypes: Record<string, any>[],
  config: InitializedSourceFilesystemConfig
): Promise<Record<string, VFile[]>> {
  const nodeEntries = await Promise.all(
    allContentTypes.map(
      async (contentType): Promise<Record<string, any>> =>
        new Promise(async (res) =>
          res([
            contentType.collection,
            await getNodesFromDirectory(contentType.path, config),
          ])
        )
    )
  );

  const nodes = Object.fromEntries(
    nodeEntries as Iterable<readonly [PropertyKey, any]>
  );

  return nodes;
}

/**
 * Source filesystem plugin for fetching flat-file content nodes from directories on disk.
 *
 * @param sourceConfig content types config
 * @returns A function that returns functions which fetch lists of nodes
 */
const source: SourcePlugin = (sourceConfig?: sourceFilesystemConfig) => {
  let config: InitializedSourceFilesystemConfig;

  return {
    initialize: (flatbreadConfig: LoadedFlatbreadConfig) => {
      const { extensions } = flatbreadConfig.loaded;
      config = defaultsDeep(sourceConfig ?? {}, { extensions });
    },
    fetchByType: (path: string) => getNodesFromDirectory(path, config),
    fetch: (allContentTypes: Record<string, any>[]) =>
      getAllNodes(allContentTypes, config),
  };
};

export default source;
