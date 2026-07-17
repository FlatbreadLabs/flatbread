import type { ContentEntry } from '@flatbread/core';
export function effortGraphContent(
  root = '.flatbread-efforts'
): ContentEntry[] {
  // Union refs intentionally stay out of Flatbread refs; they target multiple collections.
  return [
    { collection: 'Effort', path: `${root}/efforts` },
    {
      collection: 'Issue',
      path: `${root}/issues`,
      refs: { effort: 'Effort', supersedes: 'Issue', superseded_by: 'Issue' },
    },
    {
      collection: 'Finding',
      path: `${root}/findings`,
      refs: {
        effort: 'Effort',
        supersedes: 'Finding',
        superseded_by: 'Finding',
      },
    },
    {
      collection: 'Decision',
      path: `${root}/decisions`,
      refs: {
        effort: 'Effort',
        supersedes: 'Decision',
        superseded_by: 'Decision',
        rejected_by: 'Decision',
      },
    },
    {
      collection: 'Constraint',
      path: `${root}/constraints`,
      refs: {
        effort: 'Effort',
        supersedes: 'Constraint',
        superseded_by: 'Constraint',
      },
    },
    {
      collection: 'Risk',
      path: `${root}/risks`,
      refs: {
        effort: 'Effort',
        supersedes: 'Risk',
        superseded_by: 'Risk',
        mitigated_by: 'Decision',
      },
    },
  ];
}

function equalRefs(
  left: Record<string, string> | undefined,
  right: Record<string, string> | undefined
): boolean {
  const leftKeys = Object.keys(left ?? {}).sort();
  const rightKeys = Object.keys(right ?? {}).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) => key === rightKeys[index] && left![key] === right![key]
    )
  );
}

export function findEffortGraphContentRoot(
  content: readonly Pick<ContentEntry, 'collection' | 'path' | 'refs'>[]
): string | undefined {
  const names = [
    'Effort',
    'Issue',
    'Finding',
    'Decision',
    'Constraint',
    'Risk',
  ];
  const effort = content.find(
    (entry) => entry.collection === 'Effort' && typeof entry.path === 'string'
  );
  if (!effort?.path) return undefined;
  const root = effort.path.endsWith('/efforts')
    ? effort.path.slice(0, -'/efforts'.length)
    : undefined;
  if (!root) return undefined;
  const expected = effortGraphContent(root);
  if (
    names.some(
      (name) =>
        content.filter((entry) => entry.collection === name).length !== 1
    )
  )
    return undefined;
  for (const entry of expected) {
    const actual = content.find(
      (candidate) => candidate.collection === entry.collection
    );
    if (
      !actual ||
      actual.path !== entry.path ||
      !equalRefs(actual.refs, entry.refs)
    )
      return undefined;
  }
  return root;
}
