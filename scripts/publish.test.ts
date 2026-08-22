import test from 'ava';
import {
  assertLockstepVersions,
  classifyGhReleaseView,
  classifyNpmViewResult,
  classifyRemoteReleaseTag,
  parseNpmViewVersion,
  parsePublishArgs,
  preflightGithubRelease,
  prepareReadyReleaseChangelog,
  sortPackages,
} from './publish';

test('publish ordering is a stable topological sort', (t) => {
  const sorted = sortPackages([
    {
      name: 'flatbread',
      dirName: 'flatbread',
      dependencies: {
        '@flatbread/proof': 'workspace:*',
        '@flatbread/codegen': 'workspace:*',
      },
    },
    {
      name: '@flatbread/codegen',
      dirName: 'codegen',
      dependencies: { '@flatbread/utils': 'workspace:*' },
    },
    { name: '@flatbread/utils', dirName: 'utils' },
    { name: '@flatbread/proof', dirName: 'proof' },
    { name: '@flatbread/config', dirName: 'config' },
  ]);

  t.deepEqual(
    sorted.map((pkg) => pkg.name),
    [
      '@flatbread/config',
      '@flatbread/proof',
      '@flatbread/utils',
      '@flatbread/codegen',
      'flatbread',
    ]
  );
});

test('publish ordering rejects local dependency cycles', (t) => {
  const error = t.throws(() =>
    sortPackages([
      {
        name: '@flatbread/a',
        dirName: 'a',
        dependencies: { '@flatbread/b': 'workspace:*' },
      },
      {
        name: '@flatbread/b',
        dirName: 'b',
        dependencies: { '@flatbread/a': 'workspace:*' },
      },
    ])
  );
  t.regex(error?.message ?? '', /dependency cycle/);
  t.regex(error?.message ?? '', /@flatbread\/a/);
});

test('publish preflight accepts one shared public package version', (t) => {
  t.is(
    assertLockstepVersions([
      { name: '@flatbread/core', dirName: 'core', version: '1.0.1' },
      { name: 'flatbread', dirName: 'flatbread', version: '1.0.1' },
    ]),
    '1.0.1'
  );
});

test('publish preflight rejects fragmented public package versions', (t) => {
  const error = t.throws(() =>
    assertLockstepVersions([
      { name: '@flatbread/core', dirName: 'core', version: '1.0.0' },
      { name: 'flatbread', dirName: 'flatbread', version: '1.0.1' },
    ])
  );
  t.regex(error?.message ?? '', /one version across every public package/);
  t.regex(error?.message ?? '', /1\.0\.0: @flatbread\/core/);
  t.regex(error?.message ?? '', /1\.0\.1: flatbread/);
});

test('publish preflight rejects a public package without a version', (t) => {
  const error = t.throws(() =>
    assertLockstepVersions([
      { name: '@flatbread/core', dirName: 'core' },
      { name: 'flatbread', dirName: 'flatbread', version: '1.0.1' },
    ])
  );
  t.regex(error?.message ?? '', /must declare a version/);
  t.regex(error?.message ?? '', /@flatbread\/core/);
});

test('npm view preflight recognizes an exact published version', (t) => {
  t.is(parseNpmViewVersion('"1.0.0-alpha.1"\n'), '1.0.0-alpha.1');
  t.is(
    classifyNpmViewResult({ stdout: '"1.0.0-alpha.1"\n' }, '1.0.0-alpha.1'),
    'already-published'
  );
});

test('npm view preflight treats E404 as needing publish', (t) => {
  t.is(
    classifyNpmViewResult(
      {
        error: {
          code: 'E404',
          stderr: 'npm ERR! code E404\nnpm ERR! 404 Not Found',
        },
      },
      '1.0.0'
    ),
    'publish'
  );
});

test('npm view preflight treats execFileSync E404 as needing publish', (t) => {
  const stderr =
    'npm ERR! code E404\nnpm ERR! 404 Not Found - GET https://registry.npmjs.org/@flatbread%2fcore - Not found';
  t.is(
    classifyNpmViewResult({ error: { status: 1, stderr } }, '1.0.0'),
    'publish'
  );
  t.is(
    classifyNpmViewResult(
      { error: { status: 1, stderr: Buffer.from(stderr) } },
      '1.0.0'
    ),
    'publish'
  );
});

test('npm view preflight aborts on non-not-found failures', (t) => {
  t.throws(
    () =>
      classifyNpmViewResult(
        {
          error: {
            code: 'E401',
            stderr: 'npm ERR! code E401\nUnable to authenticate',
          },
        },
        '1.0.0'
      ),
    { message: /npm view failed/ }
  );
  t.throws(
    () =>
      classifyNpmViewResult(
        {
          error: {
            status: 1,
            stderr:
              'npm ERR! code EOTP\nnpm ERR! This operation requires a one-time password',
          },
        },
        '1.0.0'
      ),
    { message: /npm view failed/ }
  );
});

test('npm view preflight aborts on ambiguous not-found text', (t) => {
  t.throws(
    () =>
      classifyNpmViewResult(
        { error: { code: 'E503', message: 'temporary package not found' } },
        '1.0.0'
      ),
    { message: /npm view failed/ }
  );
});

test('npm view preflight accepts numeric 404 status', (t) => {
  t.is(classifyNpmViewResult({ error: { status: 404 } }, '1.0.0'), 'publish');
});

test('parsePublishArgs accepts a dry run', (t) => {
  t.deepEqual(parsePublishArgs(['--dry-run']), { dryRun: true });
  t.deepEqual(parsePublishArgs(['--', '--dry-run']), { dryRun: true });
  t.deepEqual(parsePublishArgs([]), { dryRun: false });
});

test('parsePublishArgs rejects unknown flags', (t) => {
  const error = t.throws(() => parsePublishArgs(['--oops']));
  t.regex(error?.message ?? '', /Unknown publish flag/);
});

test('gh release view recognizes an existing release', (t) => {
  t.is(
    classifyGhReleaseView(
      {
        stdout: '{"tagName":"v1.0.1","body":"Filed release notes.\\r\\n"}\n',
      },
      'v1.0.1',
      'Filed release notes.'
    ),
    'already-exists'
  );
});

test('gh release view rejects existing notes that differ from the changelog', (t) => {
  t.throws(
    () =>
      classifyGhReleaseView(
        {
          stdout: '{"tagName":"v1.0.1","body":"Hand-written notes."}\n',
        },
        'v1.0.1',
        'Filed release notes.'
      ),
    { message: /does not match its CHANGELOG\.md notes/ }
  );
  t.throws(
    () =>
      classifyGhReleaseView(
        { stdout: '{"tagName":"v1.0.1","body":""}\n' },
        'v1.0.1',
        'Filed release notes.'
      ),
    { message: /does not match its CHANGELOG\.md notes/ }
  );
});

test('gh release view treats a missing release as needing create', (t) => {
  t.is(
    classifyGhReleaseView(
      {
        error: {
          status: 1,
          stderr: 'release not found',
        },
      },
      'v1.0.1',
      'Filed release notes.'
    ),
    'create'
  );
  t.is(
    classifyGhReleaseView(
      {
        error: { status: 1, stderr: Buffer.from('HTTP 404: Not Found') },
      },
      'v1.0.1',
      'Filed release notes.'
    ),
    'create'
  );
});

test('gh release view aborts on unexpected failures', (t) => {
  t.throws(
    () =>
      classifyGhReleaseView(
        {
          error: {
            status: 1,
            stderr: 'HTTP 401: Requires authentication',
          },
        },
        'v1.0.1',
        'Filed release notes.'
      ),
    { message: /gh release view failed/ }
  );
  t.throws(
    () =>
      classifyGhReleaseView(
        {
          error: {
            status: 1,
            stderr: 'GraphQL: Not Found (repository)',
          },
        },
        'v1.0.1',
        'Filed release notes.'
      ),
    { message: /gh release view failed/ }
  );
});

test('publish changelog gate distinguishes leftover items from a missing heading', (t) => {
  const withItems = `# Changelog

## Unreleased

- File this release note.

## 1.0.0

Older.
`;
  const withoutItems = `# Changelog

## Unreleased

Notes stay here.

## 1.0.0

Older.
`;

  t.throws(() => prepareReadyReleaseChangelog(withItems, '1.0.1'), {
    message: /still has Unreleased list items/,
  });
  t.throws(() => prepareReadyReleaseChangelog(withoutItems, '1.0.1'), {
    message: /missing ## 1\.0\.1.*no list items/,
  });
});

test('publish changelog gate accepts a filed release section', (t) => {
  const prepared = prepareReadyReleaseChangelog(
    `# Changelog

## Unreleased

Notes stay here.

## 1.0.1

- Filed release note.

## 1.0.0

Older.
`,
    '1.0.1'
  );

  t.false(prepared.didShift);
  t.is(prepared.notes, '- Filed release note.');
});

test('publish changelog gate rejects an empty filed release section', (t) => {
  t.throws(
    () =>
      prepareReadyReleaseChangelog(
        `# Changelog

## Unreleased

Notes stay here.

## 1.0.1

## 1.0.0

Older.
`,
        '1.0.1'
      ),
    { message: /section ## 1\.0\.1 has no release notes/ }
  );
});

test('GitHub preflight propagates CLI and commit failures', (t) => {
  const inspectGithubRelease = (): 'create' => 'create';
  const commitFailure = new Error('release commit is not on GitHub');

  t.throws(
    () =>
      preflightGithubRelease('v1.0.1', 'abc123', 'Filed release notes.', {
        assertGithubCli: () => {
          throw new Error('gh is not authenticated');
        },
        assertCommitOnGithub: () => undefined,
        inspectGithubRelease,
      }),
    { message: 'gh is not authenticated' }
  );
  t.throws(
    () =>
      preflightGithubRelease('v1.0.1', 'abc123', 'Filed release notes.', {
        assertGithubCli: () => undefined,
        assertCommitOnGithub: () => {
          throw commitFailure;
        },
        inspectGithubRelease,
      }),
    { is: commitFailure }
  );
});

test('remote release tag preflight accepts an absent tag', (t) => {
  t.is(classifyRemoteReleaseTag('', 'v1.0.1', 'release-sha'), 'absent');
});

test('remote release tag preflight accepts a lightweight tag on the release commit', (t) => {
  t.is(
    classifyRemoteReleaseTag(
      'release-sha\trefs/tags/v1.0.1\n',
      'v1.0.1',
      'release-sha'
    ),
    'same-commit'
  );
});

test('remote release tag preflight compares an annotated tag peeled commit', (t) => {
  t.is(
    classifyRemoteReleaseTag(
      `tag-object-sha\trefs/tags/v1.0.1
release-sha\trefs/tags/v1.0.1^{}
`,
      'v1.0.1',
      'release-sha'
    ),
    'same-commit'
  );
});

test('remote release tag preflight rejects a different commit', (t) => {
  t.throws(
    () =>
      classifyRemoteReleaseTag(
        `tag-object-sha\trefs/tags/v1.0.1
other-commit\trefs/tags/v1.0.1^{}
`,
        'v1.0.1',
        'release-sha'
      ),
    { message: /points at other-commit.*not the release commit release-sha/ }
  );
});
