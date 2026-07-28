import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** HTTP path Flatbread serves for explorer bootstrap JSON. */
export const EXPLORER_BOOTSTRAP_PATH = '/__flatbread/explorer.json';

let staticDirOverride: string | undefined;

/**
 * Test-only: force `getExplorerStaticDir()` to `dir`.
 * Pass `undefined` to clear. Not for production callers.
 */
export function setExplorerStaticDirOverride(dir: string | undefined): void {
  staticDirOverride = dir;
}

/**
 * Absolute path to the prebuilt SPA assets shipped in this package.
 * Flatbread mounts these with `express.static` when a preset matches.
 * Honors `setExplorerStaticDirOverride` when set (tests only).
 */
export function getExplorerStaticDir(): string {
  if (staticDirOverride !== undefined) {
    return staticDirOverride;
  }
  const here = path.dirname(fileURLToPath(import.meta.url));
  // Works from both `src/node` (tests) and `dist/node` (published).
  const packageRoot = path.resolve(here, '../..');
  return path.join(packageRoot, 'dist', 'static');
}

/**
 * True when prebuilt SPA `index.html` exists under `getExplorerStaticDir()`.
 * Flatbread uses this with `matchExplorerPreset` before mounting or advertising
 * explorer.
 */
export function explorerAssetsPresent(): boolean {
  return fs.existsSync(path.join(getExplorerStaticDir(), 'index.html'));
}
