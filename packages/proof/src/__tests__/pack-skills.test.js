import test from 'ava';
import {
  verifyPackPayload,
  verifyReleaseIdentity,
} from '../../scripts/pack-skills.mjs';

const canonicalFiles = [
  'skills/proof/release.json',
  'skills/proof/SKILL.md',
  'skills/proof/reference.md',
  'skills/proof/setup.md',
];
const release = JSON.stringify({
  format: 1,
  flatbreadVersion: '1.0.0-alpha.22',
  proofVersion: '0.1.0-alpha.0',
  gitTag: 'v1.0.0-alpha.22',
});
const canonicalTexts = canonicalFiles.map((path) => ({
  path,
  text: path.endsWith('release.json') ? release : 'safe',
}));
const packageVersions = {
  flatbreadVersion: '1.0.0-alpha.22',
  proofVersion: '0.1.0-alpha.0',
};

test('pack verification accepts canonical skills and release identity', (t) => {
  t.notThrows(() =>
    verifyPackPayload(
      [{ files: canonicalFiles.map((path) => ({ path })) }],
      canonicalFiles,
      canonicalTexts,
      packageVersions
    )
  );
});

test('pack verification rejects missing canonical skill files', (t) => {
  const error = t.throws(() =>
    verifyPackPayload(
      [{ files: [{ path: canonicalFiles[0] }] }],
      canonicalFiles,
      canonicalTexts,
      packageVersions
    )
  );
  t.true(error.message.includes(canonicalFiles[1]));
});

test('pack verification rejects monorepo-only CLI invocations', (t) => {
  const error = t.throws(() =>
    verifyPackPayload(
      [{ files: canonicalFiles.map((path) => ({ path })) }],
      canonicalFiles,
      [
        ...canonicalTexts,
        {
          path: canonicalFiles[1],
          text: 'node packages/flatbread/bin/flatbread.js',
        },
      ],
      packageVersions
    )
  );
  t.true(error.message.includes(canonicalFiles[1]));
});

test('pack verification rejects release identity drift', (t) => {
  const error = t.throws(() =>
    verifyReleaseIdentity(
      [
        {
          path: canonicalFiles[0],
          text: release.replace('alpha.22', 'alpha.23'),
        },
      ],
      packageVersions
    )
  );
  t.regex(error.message, /release\.json/);
});
