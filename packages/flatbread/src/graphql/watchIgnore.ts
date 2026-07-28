/**
 * Glob patterns the `--watch` subscription drops by default.
 * Production noise only — never test-fixture names.
 */
export const DEFAULT_WATCH_IGNORE: readonly string[] = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/.journal/**',
];

/**
 * Defaults plus any caller-supplied globs, de-duplicated.
 * Defaults stay first; extras keep their relative order.
 */
export function buildWatchIgnore(extra?: readonly string[]): string[] {
  const result: string[] = [...DEFAULT_WATCH_IGNORE];
  const seen = new Set(result);
  if (!extra) return result;
  for (const pattern of extra) {
    if (seen.has(pattern)) continue;
    seen.add(pattern);
    result.push(pattern);
  }
  return result;
}
