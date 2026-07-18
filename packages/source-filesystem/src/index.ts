import { defaultsDeep } from 'lodash-es';
import { resolve, extname } from 'node:path';
import { read } from 'to-vfile';

import type { LoadedFlatbreadConfig, SourcePlugin } from '@flatbread/core';
import type { VFile } from 'vfile';
import type {
  FileNode,
  InitializedSourceFilesystemConfig,
  sourceFilesystemConfig,
} from './types';
import gatherFileNodes, { getCaptureData } from './utils/gatherFileNodes';

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

async function getNodesFromPaths(
  paths: readonly string[],
  content: LoadedFlatbreadConfig['content'],
  config: InitializedSourceFilesystemConfig
): Promise<VFile[]> {
  const extensions = config.extensions.map((extension) =>
    extension.startsWith('.')
      ? extension.toLowerCase()
      : `.${extension.toLowerCase()}`
  );
  const files = await Promise.all(
    paths
      .filter((path) => extensions.includes(extname(path).toLowerCase()))
      .map(async (path) => {
        try {
          const file = await read(path);
          const entry = content.find((candidate) => {
            if (!candidate.path) return false;
            const patternParts = resolve(candidate.path)
              .split('/')
              .filter(Boolean);
            const pathParts = resolve(path).split('/').filter(Boolean);
            if (patternParts.length !== pathParts.length) return false;
            return patternParts.every((part, index) => {
              if (/^\[[^\]]+\].*$/.test(part) || part.includes('*'))
                return true;
              return part === pathParts[index];
            });
          });
          if (entry?.path) {
            file.data = getCaptureData(resolve(path), resolve(entry.path));
          }
          return file;
        } catch {
          return undefined;
        }
      })
  );
  return files.filter((file): file is VFile => Boolean(file));
}

/**
 * Source filesystem plugin for fetching flat-file content nodes from directories on disk.
 *
 * @param sourceConfig content types config
 * @returns A function that returns functions which fetch lists of nodes
 */
export const source: SourcePlugin = (sourceConfig?: sourceFilesystemConfig) => {
  let config: InitializedSourceFilesystemConfig;
  let content: LoadedFlatbreadConfig['content'] = [];

  return {
    initialize: (flatbreadConfig: LoadedFlatbreadConfig) => {
      const { extensions } = flatbreadConfig.loaded;
      config = defaultsDeep(sourceConfig ?? {}, { extensions });
      content = flatbreadConfig.content;
    },
    fetchByType: (path: string) => getNodesFromDirectory(path, config),
    fetch: (allContentTypes: Record<string, any>[]) =>
      getAllNodes(allContentTypes, config),
    fetchPaths: (paths: readonly string[]) =>
      getNodesFromPaths(paths, content, config),
  };
};

export default source;
