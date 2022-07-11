export function readDirectory(dirStructure: any) {
  return async (path: string) => {
    const relativePath = path.replace(process.cwd(), '').replace(/^\//, '');
    const nodes = relativePath.split('/');
    let node = nodes.reduce((cur: any, next) => cur?.[next], dirStructure);
    if (relativePath === '') node = dirStructure;

    if (!node) return [];
    if (Array.isArray(node)) {
      return node.map((file: string) => ({
        isDirectory: () => false,
        path: `${relativePath}/${file}`,
        name: file,
        data: {},
      }));
    }

    if (typeof node === 'boolean') {
      console.error('tried read directory on file');
      return [];
    }

    return Object.entries(node).map(([name, value]) => {
      return {
        isDirectory: () => typeof value !== 'boolean',
        path: `${relativePath}/${name}`,
        name,
        data: {},
      };
    });
  };
}
