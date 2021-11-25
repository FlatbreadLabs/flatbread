import { join, extname } from 'path';
import fs from 'fs/promises';
import process from 'process';
import { read } from 'to-vfile';

import type { VFile } from 'vfile';
import type { SourcePlugin } from '@flatbread/core';
import type { sourceFilesystemConfig } from './types';

/**
 * Get filenames from a directory of files that match
 * the expected file extensions.
 *
 * @param path The directory to read from
 * @param extensions File extensions to parse
 * @returns A list of content nodes' filenames
 */
async function getValidNodesFilenames(
  path: string,
  extensions?: string[]
): Promise<string[]> {
  /**
   * Prepend a period to the extension if it doesn't have one.
   * If no extensions are provided, use the default ones.
   * */
  const formatValidExtensions = extensions?.map((ext) =>
    String(ext).charAt(0) === '.' ? ext : `.${ext}`
  ) ?? ['.md', '.mdx', '.markdown'];

  const files = await fs.readdir(join(process.cwd(), path));
  return files.filter((f) =>
    formatValidExtensions.includes(extname(f).toLowerCase())
  );
}

/**
 * Get nodes (files) from the directory
 *
 * @param path The directory to read from
 * @returns An array of content nodes
 */
async function getNodesFromDirectory(
  path: string,
  config: sourceFilesystemConfig
): Promise<VFile[]> {
  const slugs: string[] = await getValidNodesFilenames(
    path,
    config?.extensions
  );

  return Promise.all(
    slugs.map(
      async (slug: string): Promise<VFile> => await read(join(path, slug))
    )
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
  config: sourceFilesystemConfig
): Promise<Record<string, VFile[]>> {
  const nodeEntries = await Promise.all(
    allContentTypes.map(
      async (contentType): Promise<Record<string, any>> =>
        new Promise(async (res) =>
          res([
            contentType.typeName,
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
const source: SourcePlugin = (sourceConfig?: sourceFilesystemConfig) => ({
  fetchByType: (path: string) =>
    getNodesFromDirectory(path, sourceConfig ?? {}),
  fetch: (allContentTypes: Record<string, any>[]) =>
    getAllNodes(allContentTypes, sourceConfig ?? {}),
});

export default source;
