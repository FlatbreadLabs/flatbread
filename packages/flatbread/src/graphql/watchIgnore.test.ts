import test from 'ava';
import picomatch from 'picomatch';
import { DEFAULT_WATCH_IGNORE, buildWatchIgnore } from './watchIgnore.js';

/** True when any glob matches the path (dotfiles included). */
function matchesAny(patterns: readonly string[], path: string): boolean {
  return patterns.some((pattern) => picomatch(pattern, { dot: true })(path));
}

test('DEFAULT_WATCH_IGNORE is exactly the four production globs', (t) => {
  t.deepEqual(DEFAULT_WATCH_IGNORE, [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/.journal/**',
  ]);
});

test('DEFAULT_WATCH_IGNORE leaves live-server test fixtures visible', (t) => {
  t.false(
    matchesAny(DEFAULT_WATCH_IGNORE, '.tmp-live-server-test-abc/posts/a.md')
  );
});

test('DEFAULT_WATCH_IGNORE does not hide effort or explorer test fixtures', (t) => {
  t.false(matchesAny(DEFAULT_WATCH_IGNORE, '.tmp-effort-live-x/graph/a.md'));
  t.false(matchesAny(DEFAULT_WATCH_IGNORE, '.tmp-explorer-watch-x/graph/a.md'));
});

test('buildWatchIgnore extras drop concurrent effort and explorer fixtures', (t) => {
  const ignore = buildWatchIgnore([
    '**/.tmp-effort-*/**',
    '**/.tmp-explorer-*/**',
  ]);
  t.true(matchesAny(ignore, '.tmp-effort-live-x/posts/a.md'));
  t.true(matchesAny(ignore, '.tmp-explorer-watch-x/content/b.md'));
  t.false(matchesAny(ignore, '.tmp-live-server-test-abc/posts/a.md'));
});

test('DEFAULT_WATCH_IGNORE matches journal, node_modules, .git, and dist', (t) => {
  t.true(matchesAny(DEFAULT_WATCH_IGNORE, 'content/.journal/entry.json'));
  t.true(
    matchesAny(DEFAULT_WATCH_IGNORE, 'packages/foo/node_modules/x/index.js')
  );
  t.true(matchesAny(DEFAULT_WATCH_IGNORE, '.git/objects/ab/cd'));
  t.true(matchesAny(DEFAULT_WATCH_IGNORE, 'packages/flatbread/dist/index.js'));
});

test('buildWatchIgnore de-duplicates extras and keeps defaults first', (t) => {
  const ignore = buildWatchIgnore([
    '**/dist/**',
    '**/.tmp-effort-*/**',
    '**/.tmp-effort-*/**',
    '**/custom/**',
  ]);
  t.deepEqual(ignore, [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/.journal/**',
    '**/.tmp-effort-*/**',
    '**/custom/**',
  ]);
  t.is(ignore.filter((pattern) => pattern === '**/dist/**').length, 1);
  t.is(ignore.filter((pattern) => pattern === '**/.tmp-effort-*/**').length, 1);
});
