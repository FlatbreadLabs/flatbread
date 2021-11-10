import { join } from 'path';
import fs from 'fs/promises';
import process from 'process';
import { read } from 'to-vfile';

import type { VFile } from 'vfile';

// Form slugs from the markdown names
export async function getSlugsFromDirectory(dir: string): Promise<string[]> {
  return await fs.readdir(join(process.cwd(), dir));
}

/**
 * Get nodes (files) from the directory
 * @param dir The directory to read from
 * @returns A list of content nodes
 */
export default async function getNodesFromDirectory(
  dir: string
): Promise<Promise<VFile>[]> {
  const slugs: string[] = await getSlugsFromDirectory(dir);

  return slugs.map(
    async (slug: string): Promise<VFile> => await read(join(dir, slug))
  );
}
