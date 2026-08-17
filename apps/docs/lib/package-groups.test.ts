import { describe, expect, it } from 'vitest';

import { groupPackages } from './package-groups';

describe('groupPackages', () => {
  it('keeps configured and ungrouped packages exactly once', () => {
    const packages = [
      { id: 'proof', marker: 1 },
      { id: 'new-package', marker: 2 },
      { id: 'flatbread', marker: 3 },
    ];

    const groups = groupPackages(packages);

    expect(
      groups.map((group) => ({
        name: group.name,
        ids: group.packages.map((entry) => entry.id),
      }))
    ).toEqual([
      { name: 'Build', ids: ['flatbread'] },
      { name: 'Tools', ids: ['proof'] },
      { name: 'Other', ids: ['new-package'] },
    ]);
    expect(groups.flatMap((group) => group.packages)).toHaveLength(
      packages.length
    );
  });

  it('does not render an empty Other group', () => {
    const groups = groupPackages([{ id: 'core' }, { id: 'explorer' }]);

    expect(groups.map((group) => group.name)).toEqual(['Build', 'Tools']);
  });
});
