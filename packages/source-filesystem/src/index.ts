import { join, extname } from 'path';
import fs from 'fs/promises';
import process from 'process';
import { read } from 'to-vfile';

import type { VFile } from 'vfile';
import { SourcePlugin } from '@oyu/core';

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
  // If no extensions are provided, use the default ones
  const validExtensions = extensions ?? ['.md', '.mdx', '.markdown'];

  const files = await fs.readdir(join(process.cwd(), path));
  return files.filter((f) =>
    validExtensions.includes(extname(f).toLowerCase())
  );
}

/**
 * Get nodes (files) from the directory
 *
 * @param path The directory to read from
 * @returns An array of content nodes
 */
async function getNodesFromDirectory(path: string): Promise<Promise<VFile>[]> {
  const slugs: string[] = await getValidNodesFilenames(path);

  return slugs.map(
    async (slug: string): Promise<VFile> => await read(join(path, slug))
  );
}

/**
 * Returns all nodes from the directory
 *
 * @param paths array of directories to read from
 * @returns
 */
function getAllNodes(
  allContentTypes: Record<string, any>[]
): Record<string, []> {
  return Object.fromEntries(
    allContentTypes.map((contentType) => [
      contentType.typeName,
      getNodesFromDirectory(contentType.path),
    ])
  );
}

/**
 * Source filesystem plugin for fetching flat-file content nodes from directories on disk.
 *
 * @param sourceConfig content types config
 * @returns A function that returns functions which fetch lists of nodes
 */
const source: SourcePlugin = (sourceConfig?: Record<string, any>) => ({
  fetchByType: (path: string) => getNodesFromDirectory(path),
  fetch: (allContentTypes: Record<string, any>[]) =>
    getAllNodes(allContentTypes),
});

export default source;
