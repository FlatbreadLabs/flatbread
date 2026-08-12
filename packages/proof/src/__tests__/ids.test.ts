import test from 'ava';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateArtifactId, slugify, validateArtifactId } from '../ids.js';
import { createProofWriter } from '../writer.js';
import { ProofValidationError } from '../errors.js';
import type { PrimitiveKind } from '../types.js';

const kinds: [PrimitiveKind, string][] = [
  ['effort', 'eff'],
  ['issue', 'iss'],
  ['finding', 'fnd'],
  ['decision', 'dec'],
  ['constraint', 'con'],
  ['risk', 'rsk'],
  ['blob', 'blb'],
  ['citation', 'cit'],
];

test('generates valid ids for all eight prefixes', (t) => {
  for (const [kind, prefix] of kinds) {
    const id = generateArtifactId(kind, 'Some Great Title');
    t.true(id.startsWith(`${prefix}-some-great-title--`));
    t.true(validateArtifactId(id, kind));
  }
});

test('suffix is exactly 16 chars of the lowercase Crockford alphabet', (t) => {
  for (let i = 0; i < 25; i++) {
    const id = generateArtifactId('finding', 'x');
    const suffix = id.split('--')[1];
    t.is(suffix.length, 16);
    t.regex(suffix, /^[0123456789abcdefghjkmnpqrstvwxyz]{16}$/);
    t.notRegex(suffix, /[ilou]/);
  }
});

test('slug is capped at 48 characters', (t) => {
  const slug = slugify('word '.repeat(40));
  t.true(slug.length <= 48);
  t.true(slug.length >= 40);
  t.notRegex(slug, /^-|-$/);
});

test('empty title slugifies to untitled', (t) => {
  t.is(slugify(''), 'untitled');
  t.is(slugify('!!! ???'), 'untitled');
  const id = generateArtifactId('issue', '   ');
  t.true(id.startsWith('iss-untitled--'));
});

test('validateArtifactId rejects malformed ids', (t) => {
  const suffix = '0123456789abcdef';
  t.true(validateArtifactId(`dec-good--${suffix}`));
  // Wrong / unknown prefix.
  t.false(validateArtifactId(`xxx-good--${suffix}`));
  // Prefix that does not match the expected kind.
  t.false(validateArtifactId(`dec-good--${suffix}`, 'finding'));
  // Uppercase anywhere.
  t.false(validateArtifactId(`DEC-good--${suffix}`));
  t.false(validateArtifactId(`dec-Good--${suffix}`));
  t.false(validateArtifactId(`dec-good--0123456789ABCDEF`));
  // Bad alphabet chars in suffix (i, l, o, u are excluded).
  t.false(validateArtifactId('dec-good--0123456789abcdei'));
  t.false(validateArtifactId('dec-good--l123456789abcdef'));
  t.false(validateArtifactId('dec-good--o123456789abcdef'));
  t.false(validateArtifactId('dec-good--u123456789abcdef'));
  // Malformed separators.
  t.false(validateArtifactId(`dec-good-${suffix}`));
  t.false(validateArtifactId(`dec--good--${suffix}`));
  t.false(validateArtifactId(`dec-good--${suffix}x`));
  t.false(validateArtifactId(`dec---${suffix}`));
  t.false(validateArtifactId(''));
});

test('writer rejects a stubbed randomBytes collision before writing', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'eg-ids-'));
  const writer = createProofWriter({
    rootDir: root,
    randomBytes: () => new Uint8Array(10).fill(7),
  });
  await writer.mutate({ type: 'CreateEffort', title: 'Same Title', body: '' });
  const error = await t.throwsAsync(
    writer.mutate({ type: 'CreateEffort', title: 'Same Title', body: '' }),
    { instanceOf: ProofValidationError }
  );
  t.truthy(error);
  const files = await readdir(join(root, 'efforts'));
  t.is(files.length, 1);
});
