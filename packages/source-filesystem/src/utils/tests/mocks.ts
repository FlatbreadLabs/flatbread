import type { FileNode } from '../../types';

interface DirStructure {
  [key: string]: boolean | string[] | DirStructure;
}

export function readDirectory(dirStructure: DirStructure) {
  return (path: string): FileNode[] => {
    const relativePath = path.replace(process.cwd(), ``).replace(/^\//, ``);
    const nodes = relativePath.split(`/`);
    let node = nodes.reduce((cur: any, next) => cur?.[next], dirStructure);
    if (relativePath === ``) node = dirStructure;

    if (!node) return [];
    if (Array.isArray(node)) {
      return node.map((file: string) => ({
        isDirectory: () => false,
        path: `${relativePath}/${file}`,
        name: file,
        data: {},
      })) as unknown as FileNode[];
    }

    if (typeof node === `boolean`) {
      console.error(`tried read directory on file`);
      return [];
    }

    return Object.entries(node).map(([name, value]) => {
      return {
        isDirectory: () => typeof value !== `boolean`,
        path: `${relativePath}/${name}`,
        name,
        data: {},
      };
    }) as unknown as FileNode[];
  };
}
