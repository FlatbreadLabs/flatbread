import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  liveStatusLabel,
  resolveSchemaForQuery,
  rollbackRequestedGeneration,
  shouldCommitGeneration,
  type LiveStatus,
} from './useEffortGraphLive';
import type { SchemaProbeResult } from './query';

const SAMPLE_SCHEMA: SchemaProbeResult = {
  allRisks: { fields: [{ name: 'mitigated_by' }, { name: 'id' }] },
};

describe('resolveSchemaForQuery', () => {
  it('prefers a fresh probe over the sticky cache', () => {
    const fresh: SchemaProbeResult = {
      allFindings: { fields: [{ name: 'supersedes' }] },
    };
    assert.equal(resolveSchemaForQuery(fresh, SAMPLE_SCHEMA), fresh);
  });

  it('reuses the last-good schema when the probe fails (null)', () => {
    assert.equal(resolveSchemaForQuery(null, SAMPLE_SCHEMA), SAMPLE_SCHEMA);
  });

  it('returns null on first-load probe failure with an empty cache', () => {
    assert.equal(resolveSchemaForQuery(null, null), null);
  });
});

describe('shouldCommitGeneration', () => {
  it('allows the first commit when nothing is committed yet', () => {
    assert.equal(shouldCommitGeneration(1, null), true);
  });

  it('allows equal or newer generations', () => {
    assert.equal(shouldCommitGeneration(5, 5), true);
    assert.equal(shouldCommitGeneration(6, 5), true);
  });

  it('rejects older-than-committed generations (out-of-order SSE)', () => {
    assert.equal(shouldCommitGeneration(4, 5), false);
  });
});

describe('rollbackRequestedGeneration', () => {
  it('rolls back to committed when the failed gen still owns the watermark', () => {
    assert.equal(rollbackRequestedGeneration(7, 7, 5), 5);
    assert.equal(rollbackRequestedGeneration(3, 3, null), null);
  });

  it('leaves the watermark alone when a newer request already claimed it', () => {
    assert.equal(rollbackRequestedGeneration(8, 7, 5), 8);
  });
});

describe('liveStatusLabel', () => {
  const cases: Array<[LiveStatus, string]> = [
    ['connecting', 'Connecting'],
    ['live', 'Live'],
    ['disconnected', 'Disconnected'],
    ['error', 'Error'],
  ];
  for (const [status, label] of cases) {
    it(`labels ${status} as ${label}`, () => {
      assert.equal(liveStatusLabel(status), label);
    });
  }
});
