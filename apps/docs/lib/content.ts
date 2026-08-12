import {
  AllDocsDocument,
  AllPackagesDocument,
  AllSectionsDocument,
  DocByIdDocument,
  PackageByIdDocument,
  SearchCorpusDocument,
} from '../generated/graphql';
import { query } from './graphql';

/**
 * Every field Flatbread generates is nullable, because a field only exists in
 * the schema if some record carries it. The readers below narrow the generated
 * shapes once, so pages and components can rely on plain values.
 */

export interface Section {
  id: string;
  title: string;
  order: number;
  blurb: string;
}

export interface DocSummary {
  id: string;
  title: string;
  summary: string;
  order: number;
  sectionId: string;
}

export interface DocPage {
  id: string;
  title: string;
  summary: string;
  sectionId: string;
  sectionTitle: string;
  related: Array<Pick<DocSummary, 'id' | 'title' | 'summary'>>;
  html: string;
  timeToRead: number;
}

export interface PackageSummary {
  id: string;
  excerpt: string;
  timeToRead: number;
}

export interface PackagePage {
  id: string;
  html: string;
  timeToRead: number;
}

export interface SearchEntry {
  id: string;
  title: string;
  href: string;
  kind: 'guide' | 'package';
  group: string;
  summary: string;
  body: string;
}

/**
 * A build reads the same collections from several pages. One promise per
 * query keeps that to a single round trip.
 */
function once<T>(read: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => (pending ??= read());
}

export const getSections = once(async (): Promise<Section[]> => {
  const data = await query(AllSectionsDocument);
  return (data.allSections ?? []).flatMap((section) =>
    section?.id && section.title
      ? [
          {
            id: section.id,
            title: section.title,
            order: section.order ?? 0,
            blurb: section.blurb ?? '',
          },
        ]
      : []
  );
});

export const getDocs = once(async (): Promise<DocSummary[]> => {
  const data = await query(AllDocsDocument);
  return (data.allDocs ?? []).flatMap((doc) =>
    doc?.id && doc.title
      ? [
          {
            id: doc.id,
            title: doc.title,
            summary: doc.summary ?? '',
            order: doc.order ?? 0,
            sectionId: doc.section?.id ?? '',
          },
        ]
      : []
  );
});

export async function getDoc(id: string): Promise<DocPage | undefined> {
  const data = await query(DocByIdDocument, { id });
  const doc = data.Doc;
  if (!doc?.id || !doc.title) return undefined;

  return {
    id: doc.id,
    title: doc.title,
    summary: doc.summary ?? '',
    sectionId: doc.section?.id ?? '',
    sectionTitle: doc.section?.title ?? '',
    related: (doc.related ?? []).flatMap((related) =>
      related?.id && related.title
        ? [
            {
              id: related.id,
              title: related.title,
              summary: related.summary ?? '',
            },
          ]
        : []
    ),
    html: doc._content?.html ?? '',
    timeToRead: doc._content?.timeToRead ?? 0,
  };
}

export const getPackages = once(async (): Promise<PackageSummary[]> => {
  const data = await query(AllPackagesDocument);
  return (data.allPackages ?? []).flatMap((entry) =>
    entry?.id
      ? [
          {
            id: entry.id,
            excerpt: entry._content?.excerpt ?? '',
            timeToRead: entry._content?.timeToRead ?? 0,
          },
        ]
      : []
  );
});

export async function getPackage(id: string): Promise<PackagePage | undefined> {
  const data = await query(PackageByIdDocument, { id });
  const entry = data.Package;
  if (!entry?.id) return undefined;

  return {
    id: entry.id,
    html: entry._content?.html ?? '',
    timeToRead: entry._content?.timeToRead ?? 0,
  };
}

/**
 * Flatten every page into the list the search box filters. Flatbread has no
 * search of its own, so the site builds this once and ships it with the page.
 */
export const getSearchEntries = once(async (): Promise<SearchEntry[]> => {
  const data = await query(SearchCorpusDocument);

  const guides = (data.allDocs ?? []).flatMap((doc) =>
    doc?.id && doc.title
      ? [
          {
            id: doc.id,
            title: doc.title,
            href: `/docs/${doc.id}/`,
            kind: 'guide' as const,
            group: doc.section?.title ?? 'Guides',
            summary: doc.summary ?? '',
            body: condense(doc._content?.raw ?? ''),
          },
        ]
      : []
  );

  const packages = (data.allPackages ?? []).flatMap((entry) =>
    entry?.id
      ? [
          {
            id: entry.id,
            title: entry.id,
            href: `/reference/${entry.id}/`,
            kind: 'package' as const,
            group: 'Reference',
            summary: firstSentence(entry._content?.raw ?? ''),
            body: condense(entry._content?.raw ?? ''),
          },
        ]
      : []
  );

  return [...guides, ...packages];
});

/** Strip markdown noise and clamp the body so the index stays small. */
function condense(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`|\-]+/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

function firstSentence(raw: string): string {
  const text = condense(raw);
  const stop = text.indexOf('. ');
  return stop === -1 ? text.slice(0, 160) : text.slice(0, stop + 1);
}
