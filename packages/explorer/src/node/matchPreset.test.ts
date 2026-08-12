import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { proofContent } from '@flatbread/proof';
import { matchExplorerPreset } from './matchPreset.js';

describe('matchExplorerPreset', () => {
  it('matches a full proofContent() preset', () => {
    const match = matchExplorerPreset(proofContent('.flatbread-proof'));
    assert.deepEqual(match, {
      preset: 'proof',
      root: '.flatbread-proof',
    });
  });

  it('returns null for unrelated content', () => {
    assert.equal(
      matchExplorerPreset([{ collection: 'Post', path: 'posts' }]),
      null
    );
  });

  it('returns null when the Proof preset is incomplete', () => {
    const partial = proofContent('.flatbread-proof').filter(
      (entry) => entry.collection !== 'Blob'
    );
    assert.equal(matchExplorerPreset(partial), null);
  });
});
