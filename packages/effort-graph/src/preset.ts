import type { ContentEntry } from '@flatbread/core';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { KIND_DIRECTORY } from './ids.js';

const CITE_REFS = { cites: 'Citation' } as const;

export function effortGraphContent(
  root = '.flatbread-efforts'
): ContentEntry[] {
  // Union refs intentionally stay out of Flatbread refs; they target multiple collections.
  // `cites` is homogeneous → Citation so core validates + GraphQL-resolves the edge.
  // Citation may optionally ref a Blob; a Citation body alone (e.g. a URL) is valid.
  return [
    {
      collection: 'Effort',
      path: `${root}/efforts`,
    },
    {
      collection: 'Issue',
      path: `${root}/issues`,
      refs: {
        effort: 'Effort',
        supersedes: 'Issue',
        superseded_by: 'Issue',
        ...CITE_REFS,
      },
    },
    {
      collection: 'Finding',
      path: `${root}/findings`,
      refs: {
        effort: 'Effort',
        supersedes: 'Finding',
        superseded_by: 'Finding',
        ...CITE_REFS,
      },
    },
    {
      collection: 'Decision',
      path: `${root}/decisions`,
      refs: {
        effort: 'Effort',
        supersedes: 'Decision',
        superseded_by: 'Decision',
        rejected_by: 'Decision',
        ...CITE_REFS,
      },
    },
    {
      collection: 'Constraint',
      path: `${root}/constraints`,
      refs: {
        effort: 'Effort',
        supersedes: 'Constraint',
        superseded_by: 'Constraint',
        ...CITE_REFS,
      },
    },
    {
      collection: 'Risk',
      path: `${root}/risks`,
      refs: {
        effort: 'Effort',
        supersedes: 'Risk',
        superseded_by: 'Risk',
        mitigated_by: 'Decision',
        ...CITE_REFS,
      },
    },
    {
      collection: 'Citation',
      path: `${root}/citations`,
      refs: { effort: 'Effort', blob: 'Blob' },
    },
    {
      collection: 'Blob',
      path: `${root}/blobs`,
      refs: { effort: 'Effort' },
    },
  ];
}

/**
 * Create every collection directory under a graph root.
 *
 * The writer only creates a directory when it stores the first record of that
 * kind, and the filesystem source throws when a content path is missing. A
 * young graph therefore has no `findings/` or `risks/` directory, and any read
 * fails until one exists. Callers run this before a read so the eight preset
 * directories are always present. `root` should be absolute.
 */
export async function ensureEffortGraphDirectories(
  root: string
): Promise<void> {
  await Promise.all(
    Object.values(KIND_DIRECTORY).map((directory) =>
      mkdir(resolve(root, directory), { recursive: true })
    )
  );
}

function equalRefs(
  left: Record<string, string> | undefined,
  right: Record<string, string> | undefined
): boolean {
  const leftKeys = Object.keys(left ?? {}).sort();
  const rightKeys = Object.keys(right ?? {}).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) => key === rightKeys[index] && left![key] === right![key]
    )
  );
}

export function findEffortGraphContentRoot(
  content: readonly Pick<ContentEntry, 'collection' | 'path' | 'refs'>[]
): string | undefined {
  const names = [
    'Effort',
    'Issue',
    'Finding',
    'Decision',
    'Constraint',
    'Risk',
    'Citation',
    'Blob',
  ];
  const effort = content.find(
    (entry) => entry.collection === 'Effort' && typeof entry.path === 'string'
  );
  if (!effort?.path) return undefined;
  const root = effort.path.endsWith('/efforts')
    ? effort.path.slice(0, -'/efforts'.length)
    : undefined;
  if (!root) return undefined;
  const expected = effortGraphContent(root);
  if (
    names.some(
      (name) =>
        content.filter((entry) => entry.collection === name).length !== 1
    )
  )
    return undefined;
  for (const entry of expected) {
    const actual = content.find(
      (candidate) => candidate.collection === entry.collection
    );
    if (
      !actual ||
      actual.path !== entry.path ||
      !equalRefs(actual.refs, entry.refs)
    )
      return undefined;
  }
  return root;
}
