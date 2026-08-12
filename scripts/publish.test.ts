import test from 'ava';
import {
  classifyNpmViewResult,
  parseNpmViewVersion,
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
