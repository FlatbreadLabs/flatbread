const PACKAGE_GROUPS = [
  {
    name: 'Build',
    ids: ['flatbread', 'core', 'config', 'codegen'],
  },
  {
    name: 'Content',
    ids: [
      'source-filesystem',
      'transformer-markdown',
      'transformer-yaml',
      'resolver-svimg',
    ],
  },
  {
    name: 'Tools',
    ids: ['explorer', 'proof', 'utils'],
  },
] as const;

export interface PackageGroup<T extends { id: string }> {
  name: string;
  packages: T[];
}

/** Group every package for the home page and navigation without dropping new IDs. */
export function groupPackages<T extends { id: string }>(
  packages: T[]
): PackageGroup<T>[] {
  const groupedIds = new Set<string>(
    PACKAGE_GROUPS.flatMap((group) => [...group.ids])
  );
  const groups: PackageGroup<T>[] = PACKAGE_GROUPS.map((group) => ({
    name: group.name,
    packages: packages.filter((entry) =>
      (group.ids as readonly string[]).includes(entry.id)
    ),
  })).filter((group) => group.packages.length > 0);
  const other = packages.filter((entry) => !groupedIds.has(entry.id));

  if (other.length > 0) groups.push({ name: 'Other', packages: other });
  return groups;
}
