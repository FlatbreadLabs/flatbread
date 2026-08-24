import test from 'ava';
import {
  forbiddenSkillSubstrings,
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

for (const needle of forbiddenSkillSubstrings) {
  test(`pack verification rejects maintainer-only substring "${needle}"`, (t) => {
    const error = t.throws(() =>
      verifyPackPayload(
        [{ files: canonicalFiles.map((path) => ({ path })) }],
        canonicalFiles,
        [
          ...canonicalTexts,
          {
            path: canonicalFiles[1],
            text: needle,
          },
        ],
        packageVersions
      )
    );
    t.true(error.message.includes(canonicalFiles[1]));
    t.true(error.message.includes(needle));
  });
}

test('pack verification rejects maintainer-only substrings that wrap across lines', (t) => {
  const error = t.throws(() =>
    verifyPackPayload(
      [{ files: canonicalFiles.map((path) => ({ path })) }],
      canonicalFiles,
      [
        ...canonicalTexts,
        {
          path: canonicalFiles[3],
          text: 'directory is an exclusively generated\nprojection: do not edit it',
        },
      ],
      packageVersions
    )
  );
  t.true(error.message.includes(canonicalFiles[3]));
  t.true(error.message.includes('exclusively generated projection'));
});

test('pack verification rejects version placeholders in skill docs', (t) => {
  const error = t.throws(() =>
    verifyPackPayload(
      [{ files: canonicalFiles.map((path) => ({ path })) }],
      canonicalFiles,
      [
        ...canonicalTexts,
        {
          path: canonicalFiles[3],
          text: 'npx skills add .../tree/<gitTag>/packages/proof/skills/proof',
        },
      ],
      packageVersions
    )
  );
  t.true(error.message.includes('version placeholders'));
  t.true(error.message.includes('install-skill'));
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
