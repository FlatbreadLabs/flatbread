import { join, extname } from 'path';
import fs from 'fs/promises';
import process from 'process';
import { read } from 'to-vfile';

import type { VFile } from 'vfile';

/**
 * Get filenames from a directory of files that match
 * the expected file extensions.
 *
 * @param dir The directory to read from
 * @param extensions File extensions to parse
 * @returns A list of content nodes' filenames
 */
export async function getValidNodesFilenames(
  dir: string,
  extensions?: string[]
): Promise<string[]> {
  // If no extensions are provided, use the default ones
  const validExtensions = extensions ?? ['.md', '.mdx', '.markdown'];

  const files = await fs.readdir(join(process.cwd(), dir));
  return files.filter((f) =>
    validExtensions.includes(extname(f).toLowerCase())
  );
}

/**
 * Get nodes (files) from the directory
 *
 * @param dir The directory to read from
 * @returns An array of content nodes
 */
export default async function getNodesFromDirectory(
  dir: string
): Promise<Promise<VFile>[]> {
  const slugs: string[] = await getValidNodesFilenames(dir);

  return slugs.map(
    async (slug: string): Promise<VFile> => await read(join(dir, slug))
  );
}
