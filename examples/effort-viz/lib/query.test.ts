import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { buildEffortGraphQuery, type SchemaProbeResult } from './query';

/** Slice one collection selection out of the assembled document. */
function collectionBlock(query: string, name: string): string {
  const match = query.match(new RegExp(`${name} \\{[\\s\\S]*?\\n    \\}`));
  assert.ok(match, `expected ${name} block in query`);
  return match[0];
}

describe('buildEffortGraphQuery', () => {
  test('includes Risk supersedes/superseded_by when schema lists them', () => {
    // Risk has no superseded frontmatter state; the query must select these
    // edges or retired Risks render as live.
    const schema: SchemaProbeResult = {
      allRisks: {
        fields: [
          { name: 'id' },
          { name: 'derives_from' },
          { name: 'mitigated_by' },
          { name: 'supersedes' },
          { name: 'superseded_by' },
          { name: 'evidence' },
        ],
      },
    };

    const risks = collectionBlock(buildEffortGraphQuery(schema), 'allRisks');

    assert.match(risks, /supersedes \{ id \}/);
    assert.match(risks, /superseded_by \{ id \}/);
  });

  test('with null schema does not emit the full RELATION_FIELDS catalog', () => {
    // Selecting every known relation before a probe is a hard query error —
    // Flatbread only exposes a relation once some record uses it.
    const query = buildEffortGraphQuery(null);

    assert.match(query, /allRisks \{/);
    assert.match(query, /      title/);
    assert.match(query, /      effort \{ id \}/);
    assert.doesNotMatch(query, /\bmitigated_by\b/);
    assert.doesNotMatch(query, /\bsupersedes\b/);
    assert.doesNotMatch(query, /\bsuperseded_by\b/);
    assert.doesNotMatch(query, /\bderives_from\b/);
    assert.doesNotMatch(query, /\bresolved_by\b/);
    assert.doesNotMatch(query, /\binvalidates\b/);
    assert.doesNotMatch(query, /\brejected_by\b/);
    assert.doesNotMatch(query, /\bevidence\b/);
  });

  test('partial schema only includes listed relation fields', () => {
    const schema: SchemaProbeResult = {
      allRisks: {
        fields: [{ name: 'id' }, { name: 'mitigated_by' }],
      },
    };

    const risks = collectionBlock(buildEffortGraphQuery(schema), 'allRisks');

    assert.match(risks, /mitigated_by \{ id \}/);
    assert.doesNotMatch(risks, /\bsupersedes\b/);
    assert.doesNotMatch(risks, /\bsuperseded_by\b/);
    assert.doesNotMatch(risks, /\bderives_from\b/);
    assert.doesNotMatch(risks, /\bevidence\b/);
  });
});
