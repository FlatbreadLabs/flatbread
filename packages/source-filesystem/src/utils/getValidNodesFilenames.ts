import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { FileNode, GatherFileNodesOptions } from '../types';

type Segment = { name: string; remove: number } | null;

async function readDir(path: string): Promise<FileNode[]> {
  const files = (await readdir(path, { withFileTypes: true })) as FileNode[];

  return files.map((file) => {
    file.path = join(path, file.name);
    file.data = {};
    return file;
  });
}

function getSegmentData(node: { name: string }, segment: { remove: number }) {
  return node.name.slice(0, node.name.length - segment.remove);
}

function processFile(segment: Segment, node: FileNode) {
  return (file: FileNode) => {
    if (!segment) return file;
    file.data = {
      ...node.data,
      [segment.name]: getSegmentData(node, segment),
    };
    return file;
  };
}

/**
 * gather FileNodes in directories and sub-directories
 * according to glob patterns that match the allowed file extensions.
 *
 * @param path The directory to read from
 * @param options `GatherFileNodesOptions`
 * @returns FileNodes[]
 */
export default async function gatherFileNodes(
  path: string,
  { readDirectory = readDir, extensions }: GatherFileNodesOptions = {}
): Promise<FileNode[]> {
  /**
   * Prepend a period to the extension if it doesn't have one.
   * If no extensions are provided, use the default ones.
   * */

  const formatValidExtensions = extensions?.map((ext) =>
    String(ext).charAt(0) === '.' ? ext : `.${ext}`
  ) ?? ['.md', '.mdx', '.markdown'];

  // gather all the globs in the path ( [capture-groups], **, *)
  const [pathPrefix, ...globs] = path.split(/\/(?:\[|\*+)/);

  // for each segment - gather names for capture groups
  // and calculate what to remove from matches ex: [name].md => remove .md from match
  const segments = globs.map((branch) => {
    let index = branch.indexOf(']');
    if (index === -1) return null;
    return {
      name: branch.slice(0, index),
      remove: branch.length - index - 1,
    };
  });

  let nodes = await readDirectory(join(process.cwd(), pathPrefix));
  const leaf = segments.pop();

  
  /**
   * For each directory segment
   * 1. step into the next level of each directory node
   * 2. collect the segment matches
   * 3. scan the new directories to create the nodes for the next segment
   */
  for await (const segment of segments) {
    nodes = await Promise.all(
      nodes
        .filter((f) => f.isDirectory())
        .map((node) =>
          readDirectory(node.path).then((file) =>
            file.map(processFile(segment, node)).flat()
          )
        )
    ).then((nodes) => nodes.flat());
  }

  // now that all the nodes are files at the proper depth we can match the filenames
  // if they're [captured]
  if (leaf) {
    nodes = nodes.map((node) => {
      node.data[leaf.name] = getSegmentData(node, leaf);
      return node;
    });
  }


  // throw away any node that doesn't match our extension whitelist
  return nodes.filter((n) =>
    formatValidExtensions.includes(extname(n.path).toLowerCase())
  );
}
