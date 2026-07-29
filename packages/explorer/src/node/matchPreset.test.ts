import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { effortGraphContent } from '@flatbread/effort-graph';
import { matchExplorerPreset } from './matchPreset.js';

describe('matchExplorerPreset', () => {
  it('matches a full effortGraphContent() preset', () => {
    const match = matchExplorerPreset(effortGraphContent('.flatbread-efforts'));
    assert.deepEqual(match, {
      preset: 'effort-graph',
      root: '.flatbread-efforts',
    });
  });

  it('returns null for unrelated content', () => {
    assert.equal(
      matchExplorerPreset([{ collection: 'Post', path: 'posts' }]),
      null
    );
  });

  it('returns null when the Effort Graph preset is incomplete', () => {
    const partial = effortGraphContent('.flatbread-efforts').filter(
      (entry) => entry.collection !== 'Blob'
    );
    assert.equal(matchExplorerPreset(partial), null);
  });
});
