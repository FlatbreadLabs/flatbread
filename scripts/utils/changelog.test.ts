import test from 'ava';
import { readFileSync } from 'node:fs';
import {
  fallbackReleaseNotes,
  formatGithubReleaseNotes,
  githubReleaseNotesHeader,
  githubReleaseTag,
  parseChangelog,
  prepareReleaseChangelog,
  serializeChangelog,
  splitUnreleasedBody,
} from './changelog';

const SAMPLE = `# Changelog

## Unreleased

- First item
  continues here
- Second item

Notes stay under Unreleased.

## 1.0.0

First stable release.
`;

test('githubReleaseTag prefixes a v when missing', (t) => {
  t.is(githubReleaseTag('1.0.1'), 'v1.0.1');
  t.is(githubReleaseTag('v1.0.1'), 'v1.0.1');
});

test('formatGithubReleaseNotes puts the brand header and version title first', (t) => {
  const header = githubReleaseNotesHeader('1.1.0');
  t.true(header.includes('Flatbread - v1.1.0 Release Notes'));
  t.is(
    formatGithubReleaseNotes('- Already filed.', '1.1.0'),
    `${header}\n\n- Already filed.`
  );
  t.is(formatGithubReleaseNotes('   \n', 'v1.1.0'), header);
  t.true(
    formatGithubReleaseNotes(fallbackReleaseNotes('1.0.1'), '1.0.1').startsWith(
      githubReleaseNotesHeader('1.0.1')
    )
  );
});

test('parseChangelog reads Unreleased and version sections', (t) => {
  const doc = parseChangelog(SAMPLE);
  t.is(doc.title, '# Changelog');
  t.is(doc.preamble, '');
  t.true(doc.unreleased.startsWith('- First item'));
  t.is(doc.versions[0]?.version, '1.0.0');
  t.is(doc.versions[0]?.body, 'First stable release.');
});

test('parseChangelog accepts dated and bracketed version headings', (t) => {
  const doc = parseChangelog(`# Changelog

## Unreleased

## [1.2.0] - 2026-08-22

Notes.
`);
  t.is(doc.versions[0]?.version, '1.2.0');
  t.is(doc.versions[0]?.heading, '## [1.2.0] - 2026-08-22');
});

test('parseChangelog rejects a missing Unreleased heading', (t) => {
  const error = t.throws(() =>
    parseChangelog(`# Changelog

## 1.0.0

Notes.
`)
  );
  t.regex(error?.message ?? '', /must have an Unreleased heading/);
});

test('parseChangelog rejects an unrecognized heading', (t) => {
  const error = t.throws(() =>
    parseChangelog(`# Changelog

## Unreleased

## Later

Nope.
`)
  );
  t.regex(error?.message ?? '', /unrecognized heading/);
});

test('splitUnreleasedBody keeps trailing prose and shifts list items', (t) => {
  t.deepEqual(splitUnreleasedBody(parseChangelog(SAMPLE).unreleased), {
    releaseNotes: `- First item
  continues here
- Second item`,
    retained: 'Notes stay under Unreleased.',
  });
});

test('splitUnreleasedBody treats a note-only Unreleased section as retained', (t) => {
  t.deepEqual(splitUnreleasedBody('Notes for the release train.'), {
    releaseNotes: '',
    retained: 'Notes for the release train.',
  });
});

test('prepareReleaseChangelog moves Unreleased items under the new version', (t) => {
  const prepared = prepareReleaseChangelog(SAMPLE, '1.0.1');
  t.true(prepared.didShift);
  t.is(
    prepared.notes,
    `- First item
  continues here
- Second item`
  );

  const doc = parseChangelog(prepared.markdown);
  t.is(doc.unreleased, 'Notes stay under Unreleased.');
  t.deepEqual(
    doc.versions.map((entry) => entry.version),
    ['1.0.1', '1.0.0']
  );
  t.is(doc.versions[0]?.body, prepared.notes);
  t.is(doc.versions[1]?.body, 'First stable release.');
});

test('prepareReleaseChangelog is a no-op when the version section already exists', (t) => {
  const markdown = `# Changelog

## Unreleased

Notes stay.

## 1.0.1

- Already filed.

## 1.0.0

Older.
`;
  const prepared = prepareReleaseChangelog(markdown, '1.0.1');
  t.false(prepared.didShift);
  t.is(prepared.markdown, markdown);
  t.is(prepared.notes, '- Already filed.');
});

test('prepareReleaseChangelog rejects leftover Unreleased items when the version exists', (t) => {
  const error = t.throws(() =>
    prepareReleaseChangelog(
      `# Changelog

## Unreleased

- Leftover

## 1.0.1

- Filed.
`,
      '1.0.1'
    )
  );
  t.regex(error?.message ?? '', /already has a 1\.0\.1 section/);
});

test('prepareReleaseChangelog still opens a version heading when Unreleased has no items', (t) => {
  const prepared = prepareReleaseChangelog(
    `# Changelog

## Unreleased

Notes stay.

## 1.0.0

Older.
`,
    '1.0.1'
  );
  t.true(prepared.didShift);
  t.is(prepared.notes, fallbackReleaseNotes('1.0.1'));
  const doc = parseChangelog(prepared.markdown);
  t.is(doc.unreleased, 'Notes stay.');
  t.is(doc.versions[0]?.heading, '## 1.0.1');
  t.is(doc.versions[0]?.body, '');
});

test('serializeChangelog round-trips a shifted document', (t) => {
  const prepared = prepareReleaseChangelog(SAMPLE, '1.0.1');
  const again = serializeChangelog(parseChangelog(prepared.markdown));
  t.is(again, prepared.markdown);
});

test('prepareReleaseChangelog files the current root Unreleased items under 1.0.1', (t) => {
  const markdown = readFileSync('CHANGELOG.md', 'utf8');
  const prepared = prepareReleaseChangelog(markdown, '1.0.1');
  t.true(prepared.didShift);
  t.true(
    prepared.notes.startsWith('- The DAG runner is now `@flatbread/oven`')
  );
  t.true(prepared.notes.includes('PROOF_CROSS_EFFORT_RELATION'));
  t.false(prepared.notes.includes('Notes for the Flatbread release train'));

  const doc = parseChangelog(prepared.markdown);
  t.true(doc.unreleased.startsWith('Notes for the Flatbread release train'));
  t.is(doc.versions[0]?.version, '1.0.1');
  t.is(doc.versions[0]?.body, prepared.notes);
  t.is(doc.versions[1]?.version, '1.0.0');
  t.true(doc.versions[1]?.body.startsWith('First stable release.'));
});
