/**
 * Skip a directory and everything under it.
 * Parcel registers each directory with inotify; a contents-only glob (ending
 * in slash-star-star) matches children, not the directory itself, so both
 * forms are required.
 */
export function directoryIgnore(directoryPattern: string): string[] {
  return [directoryPattern, `${directoryPattern}/**`];
}

/**
 * Glob patterns the `--watch` subscription drops by default.
 * Production noise only — never test-fixture names.
 *
 * Each entry is a directory pair: the bare directory (so parcel never calls
 * `inotify_add_watch` on it) plus a contents glob for everything under it.
 */
export const DEFAULT_WATCH_IGNORE: readonly string[] = [
  ...directoryIgnore('**/node_modules'),
  ...directoryIgnore('**/.git'),
  ...directoryIgnore('**/dist'),
  ...directoryIgnore('**/.journal'),
];

/**
 * Defaults plus any caller-supplied globs, de-duplicated.
 * Defaults stay first; extras keep their relative order.
 * Contents-only globs also get their bare-directory form so parcel skips
 * the directory itself, not only its children.
 */
export function buildWatchIgnore(extra?: readonly string[]): string[] {
  const result: string[] = [...DEFAULT_WATCH_IGNORE];
  const seen = new Set(result);
  if (!extra) return result;
  for (const pattern of extra) {
    for (const expanded of expandIgnorePattern(pattern)) {
      if (seen.has(expanded)) continue;
      seen.add(expanded);
      result.push(expanded);
    }
  }
  return result;
}

/** Prefer bare-then-contents order when a contents-only glob is supplied. */
function expandIgnorePattern(pattern: string): string[] {
  if (!pattern.endsWith('/**')) return [pattern];
  return directoryIgnore(pattern.slice(0, -3));
}
