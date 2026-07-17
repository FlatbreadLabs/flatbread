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
