import test from 'ava';
import {
  getWorkspaceDependentClosure,
  markWorkspaceDependentsChanged,
  validateBumpSelection,
} from './bumpVersions';
import type { WorkspaceBumpPackage } from './bumpVersions';

type TestPackage = WorkspaceBumpPackage & {
  changedSinceLastPublish: boolean;
};

const packages: TestPackage[] = [
  {
    name: '@flatbread/proof',
    changedSinceLastPublish: true,
  },
  {
    name: '@flatbread/codegen',
    dependencies: { '@flatbread/utils': 'workspace:*' },
    changedSinceLastPublish: true,
  },
  {
    name: '@flatbread/utils',
    changedSinceLastPublish: false,
  },
  {
    name: 'flatbread',
    dependencies: {
      '@flatbread/proof': 'workspace:*',
      '@flatbread/codegen': 'workspace:^',
    },
    devDependencies: { '@flatbread/utils': 'workspace:*' },
    changedSinceLastPublish: false,
  } as TestPackage & { devDependencies: Record<string, string> },
];

test('workspace dependent closure follows production workspace dependencies', (t) => {
  t.deepEqual(
    [...getWorkspaceDependentClosure(packages, ['@flatbread/proof'])].sort(),
    ['@flatbread/proof', 'flatbread']
  );
  t.deepEqual(
    [...getWorkspaceDependentClosure(packages, ['@flatbread/utils'])].sort(),
    ['@flatbread/codegen', '@flatbread/utils', 'flatbread']
  );
});

test('changed package propagation includes transitive public dependents', (t) => {
  t.deepEqual(
    markWorkspaceDependentsChanged(packages)
      .filter((pkg) => pkg.changedSinceLastPublish)
      .map((pkg) => pkg.name)
      .sort(),
    ['@flatbread/codegen', '@flatbread/proof', 'flatbread']
  );
});

test('selection validation reports omitted required dependents', (t) => {
  t.deepEqual(
    validateBumpSelection(
      packages,
      ['@flatbread/proof', '@flatbread/codegen', 'flatbread'],
      ['@flatbread/proof']
    ),
    ['flatbread']
  );
  t.deepEqual(
    validateBumpSelection(
      packages,
      ['@flatbread/proof', '@flatbread/codegen', 'flatbread'],
      ['flatbread']
    ),
    []
  );
});
