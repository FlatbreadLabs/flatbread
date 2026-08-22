export type ChangelogVersion = {
  readonly heading: string;
  readonly version: string;
  readonly body: string;
};

export type ChangelogDocument = {
  readonly title: string;
  readonly preamble: string;
  readonly unreleased: string;
  readonly versions: readonly ChangelogVersion[];
};

export type SplitUnreleased = {
  readonly releaseNotes: string;
  readonly retained: string;
};

export type PreparedChangelog = {
  readonly markdown: string;
  readonly notes: string;
  readonly didShift: boolean;
  readonly version: string;
};

const UNRELEASED_HEADING = /^##\s+Unreleased\s*$/i;
const VERSION_HEADING =
  /^##\s+(?:\[)?v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?(?:\+[0-9A-Za-z.]+)?)(?:\])?(?:\s+[-–—]\s+\S+)?\s*$/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+\.)\s+/;
const INDENTED_CONTINUATION = /^\s+\S/;

export function githubReleaseTag(version: string): string {
  return version.startsWith('v') ? version : `v${version}`;
}

export function githubReleaseNotesHeader(version: string): string {
  return `<p align="center">
  <img src="https://raw.githubusercontent.com/FlatbreadLabs/flatbread/main/assets/brand/flatbread-mark.svg" alt="Flatbread logo" width="256" />
</p>

<h1 align="center">Flatbread - ${githubReleaseTag(version)} Release Notes</h1>`;
}

export function fallbackReleaseNotes(version: string): string {
  return `Release ${version}.`;
}

export function formatGithubReleaseNotes(
  notes: string,
  version: string
): string {
  const header = githubReleaseNotesHeader(version);
  const body = notes.trim();
  return body ? `${header}\n\n${body}` : header;
}

export function parseChangelog(markdown: string): ChangelogDocument {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let index = 0;
  while (index < lines.length && lines[index].trim() === '') index += 1;

  let title = '# Changelog';
  if (
    index < lines.length &&
    /^#\s+/.test(lines[index]) &&
    !lines[index].startsWith('##')
  ) {
    title = lines[index];
    index += 1;
  }

  const preambleLines: string[] = [];
  while (index < lines.length && !lines[index].startsWith('## ')) {
    preambleLines.push(lines[index]);
    index += 1;
  }

  let unreleased: string | undefined;
  const versions: ChangelogVersion[] = [];

  while (index < lines.length) {
    const heading = lines[index];
    index += 1;
    const bodyLines: string[] = [];
    while (index < lines.length && !lines[index].startsWith('## ')) {
      bodyLines.push(lines[index]);
      index += 1;
    }
    const body = trimSectionBody(bodyLines.join('\n'));

    if (UNRELEASED_HEADING.test(heading)) {
      if (unreleased !== undefined) {
        throw new Error('CHANGELOG.md has more than one Unreleased heading');
      }
      unreleased = body;
      continue;
    }

    const match = heading.match(VERSION_HEADING);
    if (!match) {
      throw new Error(`CHANGELOG.md has an unrecognized heading: ${heading}`);
    }
    versions.push({ heading, version: match[1], body });
  }

  if (unreleased === undefined) {
    throw new Error('CHANGELOG.md must have an Unreleased heading');
  }

  return {
    title,
    preamble: trimSectionBody(preambleLines.join('\n')),
    unreleased,
    versions,
  };
}

export function splitUnreleasedBody(body: string): SplitUnreleased {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  let lastNotesIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (LIST_ITEM.test(line)) {
      lastNotesIndex = index;
      continue;
    }
    if (lastNotesIndex >= 0 && INDENTED_CONTINUATION.test(line)) {
      lastNotesIndex = index;
    }
  }

  if (lastNotesIndex === -1) {
    return { releaseNotes: '', retained: trimSectionBody(body) };
  }

  return {
    releaseNotes: trimSectionBody(
      lines.slice(0, lastNotesIndex + 1).join('\n')
    ),
    retained: trimSectionBody(lines.slice(lastNotesIndex + 1).join('\n')),
  };
}

export function serializeChangelog(doc: ChangelogDocument): string {
  const parts: string[] = [doc.title];
  if (doc.preamble) parts.push(doc.preamble);
  parts.push(formatSection('## Unreleased', doc.unreleased));
  for (const version of doc.versions) {
    parts.push(formatSection(version.heading, version.body));
  }
  return `${parts.join('\n\n')}\n`;
}

export function prepareReleaseChangelog(
  markdown: string,
  version: string
): PreparedChangelog {
  const doc = parseChangelog(markdown);
  const existing = doc.versions.find((entry) => entry.version === version);
  const { releaseNotes, retained } = splitUnreleasedBody(doc.unreleased);

  if (existing) {
    if (releaseNotes) {
      throw new Error(
        `CHANGELOG.md already has a ${version} section, but Unreleased still has items. Move or delete those items before releasing.`
      );
    }
    return {
      markdown,
      notes: existing.body.trim() || fallbackReleaseNotes(version),
      didShift: false,
      version,
    };
  }

  const next: ChangelogDocument = {
    ...doc,
    unreleased: retained,
    versions: [
      { heading: `## ${version}`, version, body: releaseNotes },
      ...doc.versions,
    ],
  };

  return {
    markdown: serializeChangelog(next),
    notes: releaseNotes || fallbackReleaseNotes(version),
    didShift: true,
    version,
  };
}

function formatSection(heading: string, body: string): string {
  return body ? `${heading}\n\n${body}` : heading;
}

function trimSectionBody(value: string): string {
  return value.replace(/^\n+/, '').replace(/\n+$/, '');
}
