import test from 'ava';
import picomatch from 'picomatch';
import {
  DEFAULT_WATCH_IGNORE,
  buildWatchIgnore,
  directoryIgnore,
} from './watchIgnore.js';

/** True when any glob matches the path (dotfiles included). */
function matchesAny(patterns: readonly string[], path: string): boolean {
  return patterns.some((pattern) => picomatch(pattern, { dot: true })(path));
}

test('directoryIgnore pairs the bare directory with its contents glob', (t) => {
  t.deepEqual(directoryIgnore('**/node_modules'), [
    '**/node_modules',
    '**/node_modules/**',
  ]);
});

test('DEFAULT_WATCH_IGNORE is exactly the production directory pairs', (t) => {
  t.deepEqual(DEFAULT_WATCH_IGNORE, [
    '**/node_modules',
    '**/node_modules/**',
    '**/.git',
    '**/.git/**',
    '**/dist',
    '**/dist/**',
    '**/.journal',
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
  t.false(
    DEFAULT_WATCH_IGNORE.some(
      (pattern) =>
        pattern.includes('.tmp-effort-') || pattern.includes('.tmp-explorer-')
    )
  );
});

test('buildWatchIgnore extras drop concurrent effort and explorer fixtures', (t) => {
  const ignore = buildWatchIgnore([
    '**/.tmp-effort-*/**',
    '**/.tmp-explorer-*/**',
  ]);
  t.true(matchesAny(ignore, '.tmp-effort-live-x'));
  t.true(matchesAny(ignore, '.tmp-effort-live-x/posts/a.md'));
  t.true(matchesAny(ignore, '.tmp-explorer-watch-x'));
  t.true(matchesAny(ignore, '.tmp-explorer-watch-x/content/b.md'));
  t.false(matchesAny(ignore, '.tmp-live-server-test-abc/posts/a.md'));
});

test('DEFAULT_WATCH_IGNORE matches journal, node_modules, .git, and dist', (t) => {
  t.true(matchesAny(DEFAULT_WATCH_IGNORE, 'content/.journal'));
  t.true(matchesAny(DEFAULT_WATCH_IGNORE, 'content/.journal/entry.json'));
  t.true(matchesAny(DEFAULT_WATCH_IGNORE, 'node_modules'));
  t.true(
    matchesAny(DEFAULT_WATCH_IGNORE, 'packages/foo/node_modules/x/index.js')
  );
  t.true(matchesAny(DEFAULT_WATCH_IGNORE, '.git'));
  t.true(matchesAny(DEFAULT_WATCH_IGNORE, '.git/objects/ab/cd'));
  t.true(matchesAny(DEFAULT_WATCH_IGNORE, 'packages/flatbread/dist'));
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
    '**/node_modules',
    '**/node_modules/**',
    '**/.git',
    '**/.git/**',
    '**/dist',
    '**/dist/**',
    '**/.journal',
    '**/.journal/**',
    '**/.tmp-effort-*',
    '**/.tmp-effort-*/**',
    '**/custom',
    '**/custom/**',
  ]);
  t.is(ignore.filter((pattern) => pattern === '**/dist/**').length, 1);
  t.is(ignore.filter((pattern) => pattern === '**/.tmp-effort-*/**').length, 1);
  t.is(ignore.filter((pattern) => pattern === '**/.tmp-effort-*').length, 1);
});

test('buildWatchIgnore expands bare directory extras into contents globs', (t) => {
  const ignore = buildWatchIgnore(['**/.tmp-effort-*', '**/custom']);
  t.true(ignore.includes('**/.tmp-effort-*'));
  t.true(ignore.includes('**/.tmp-effort-*/**'));
  t.true(ignore.includes('**/custom'));
  t.true(ignore.includes('**/custom/**'));
  t.true(matchesAny(ignore, '.tmp-effort-live-x/posts/a.md'));
  t.true(matchesAny(ignore, 'packages/custom/file.md'));
});

test('buildWatchIgnore expands contents globs into bare directory form', (t) => {
  const ignore = buildWatchIgnore(['**/custom/**']);
  const customIndex = ignore.indexOf('**/custom');
  const contentsIndex = ignore.indexOf('**/custom/**');
  t.true(customIndex >= 0);
  t.true(contentsIndex >= 0);
  t.true(customIndex < contentsIndex);
});

test('buildWatchIgnore de-duplicates when both bare and contents forms are passed', (t) => {
  const ignore = buildWatchIgnore(['**/custom', '**/custom/**', '**/custom']);
  t.is(ignore.filter((pattern) => pattern === '**/custom').length, 1);
  t.is(ignore.filter((pattern) => pattern === '**/custom/**').length, 1);
  const customIndex = ignore.indexOf('**/custom');
  t.is(ignore[customIndex + 1], '**/custom/**');
});

test('buildWatchIgnore leaves file globs alone', (t) => {
  const ignore = buildWatchIgnore(['**/*.log', '**/notes.txt']);
  t.true(ignore.includes('**/*.log'));
  t.true(ignore.includes('**/notes.txt'));
  t.false(ignore.includes('**/*.log/**'));
  t.false(ignore.includes('**/notes.txt/**'));
});
