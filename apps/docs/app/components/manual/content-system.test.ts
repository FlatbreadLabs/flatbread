import { describe, expect, it } from 'vitest';

import { CONTENT_PARTS } from './content-system';

describe('content-system references', () => {
  it('keeps one ordered reference for each source collection', () => {
    expect(
      CONTENT_PARTS.map(({ key, ref, name }) => ({ key, ref, name }))
    ).toEqual([
      { key: 'sections', ref: '01', name: 'Navigation sections' },
      { key: 'docs', ref: '02', name: 'Guide records' },
      { key: 'packages', ref: '03', name: 'Package references' },
    ]);
  });
});
