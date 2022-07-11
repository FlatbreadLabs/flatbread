import { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

export interface FileNode extends Dirent {
  path: string;
  data: {
    [key: string]: any;
  };
}

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
 * Get filenames from a directory of files that match
 * the expected file extensions.
 *
 * @param path The directory to read from
 * @param extensions File extensions to parse
 * @returns A list of content nodes' filenames
 */
export default async function getValidNodesFilenames(
  path: string,
  extensions?: string[],
  { readDirectory = readDir } = {}
): Promise<FileNode[]> {
  /**
   * Prepend a period to the extension if it doesn't have one.
   * If no extensions are provided, use the default ones.
   * */

  const formatValidExtensions = extensions?.map((ext) =>
    String(ext).charAt(0) === '.' ? ext : `.${ext}`
  ) ?? ['.md', '.mdx', '.markdown'];

  const [pathPrefix, ...rest] = path.split(/\/(?:\[|\*+)/);
  const segments = rest.map((branch) => {
    let index = branch.indexOf(']');
    if (index === -1) return null;
    return {
      name: branch.slice(0, index),
      remove: branch.length - index - 1,
    };
  });

  let nodes = await readDirectory(join(process.cwd(), pathPrefix));
  const leaf = segments.pop();

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

  nodes = nodes.map((node) => {
    if (leaf) {
      node.data[leaf.name] = getSegmentData(node, leaf);
    }
    return node;
  });

  return nodes.filter((n) =>
    formatValidExtensions.includes(extname(n.path).toLowerCase())
  );
}
