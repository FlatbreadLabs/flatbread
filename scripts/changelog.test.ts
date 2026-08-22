import test from 'ava';
import { parseChangelogArgs } from './changelog';

test('parseChangelogArgs accepts a dry run and optional version', (t) => {
  t.deepEqual(parseChangelogArgs(['--dry-run']), {
    dryRun: true,
    version: undefined,
  });
  t.deepEqual(parseChangelogArgs(['--dry-run', '--version', '1.2.3']), {
    dryRun: true,
    version: '1.2.3',
  });
  t.deepEqual(parseChangelogArgs(['--version=1.2.3']), {
    dryRun: false,
    version: '1.2.3',
  });
  t.deepEqual(parseChangelogArgs(['--', '--dry-run']), {
    dryRun: true,
    version: undefined,
  });
});

test('parseChangelogArgs rejects a missing version value', (t) => {
  const error = t.throws(() => parseChangelogArgs(['--version']));
  t.regex(error?.message ?? '', /requires a semver value/);
});

test('parseChangelogArgs rejects unknown flags', (t) => {
  const error = t.throws(() => parseChangelogArgs(['--oops']));
  t.regex(error?.message ?? '', /Unknown changelog flag/);
});
