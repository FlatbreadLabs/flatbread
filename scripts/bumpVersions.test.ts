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
    name: '@flatbread/effort-graph',
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
      '@flatbread/effort-graph': 'workspace:*',
      '@flatbread/codegen': 'workspace:^',
    },
    devDependencies: { '@flatbread/utils': 'workspace:*' },
    changedSinceLastPublish: false,
  } as TestPackage & { devDependencies: Record<string, string> },
];

test('workspace dependent closure follows production workspace dependencies', (t) => {
  t.deepEqual(
    [
      ...getWorkspaceDependentClosure(packages, ['@flatbread/effort-graph']),
    ].sort(),
    ['@flatbread/effort-graph', 'flatbread']
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
    ['@flatbread/codegen', '@flatbread/effort-graph', 'flatbread']
  );
});

test('selection validation reports omitted required dependents', (t) => {
  t.deepEqual(
    validateBumpSelection(
      packages,
      ['@flatbread/effort-graph', '@flatbread/codegen', 'flatbread'],
      ['@flatbread/effort-graph']
    ),
    ['flatbread']
  );
  t.deepEqual(
    validateBumpSelection(
      packages,
      ['@flatbread/effort-graph', '@flatbread/codegen', 'flatbread'],
      ['flatbread']
    ),
    []
  );
});
