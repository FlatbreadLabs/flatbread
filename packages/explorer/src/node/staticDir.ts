import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** HTTP path Flatbread serves for explorer bootstrap JSON. */
export const EXPLORER_BOOTSTRAP_PATH = '/__flatbread/explorer.json';

/**
 * Absolute path to the prebuilt SPA assets shipped in this package.
 * Flatbread mounts these with `express.static` when a preset matches.
 */
export function getExplorerStaticDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // Works from both `src/node` (tests) and `dist/node` (published).
  const packageRoot = path.resolve(here, '../..');
  return path.join(packageRoot, 'dist', 'static');
}
