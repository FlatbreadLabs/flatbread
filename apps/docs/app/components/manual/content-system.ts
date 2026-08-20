export type ContentPartKey = 'sections' | 'docs' | 'packages';

interface ContentPartDefinition {
  key: ContentPartKey;
  ref: string;
  name: string;
  sourcePattern: string;
  manifestPath: string;
  manifestNote: string;
  purpose: string;
}

/** One reference system for both the exploded view and its parts manifest. */
export const CONTENT_PARTS: readonly ContentPartDefinition[] = [
  {
    key: 'sections',
    ref: '01',
    name: 'Navigation sections',
    sourcePattern: 'apps/docs/content/nav/*.yaml',
    manifestPath: 'apps/docs/content/nav/[id].yaml',
    manifestNote: 'Names and orders the guide index.',
    purpose: 'Groups the guide index.',
  },
  {
    key: 'docs',
    ref: '02',
    name: 'Guide records',
    sourcePattern: 'apps/docs/content/docs/*.md',
    manifestPath: 'apps/docs/content/docs/[id].md',
    manifestNote: 'Rendered as guide pages and grouped by section.',
    purpose: 'Supplies the guide pages and local contents.',
  },
  {
    key: 'packages',
    ref: '03',
    name: 'Package references',
    sourcePattern: 'apps/docs/content/reference/*.md',
    manifestPath: 'apps/docs/content/reference/[id].md',
    manifestNote: 'Published README content presented as reference pages.',
    purpose: 'Supplies the package README reference pages.',
  },
];
