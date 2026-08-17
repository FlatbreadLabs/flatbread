import {
  AllDocsDocument,
  AllPackagesDocument,
  AllSectionsDocument,
  DocByIdDocument,
  PackageByIdDocument,
  SearchCorpusDocument,
} from '../generated/graphql';
import { query } from './graphql';
import { normalizeSearchText } from './search';

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
 * A production build reads the same collections from several pages. One
 * promise per query keeps that to a single round trip. Outside production the
 * Next process lives across file saves, so each call re-queries and the
 * sidebar, home page, and search stay in step with the files.
 */
function once<T>(read: () => Promise<T>): () => Promise<T> {
  if (process.env.NODE_ENV !== 'production') {
    return read;
  }
  let pending: Promise<T> | undefined;
  return () => (pending ??= read());
}

/** The files behind each collection, named in the error when one comes back empty. */
const CONTENT_DIRS = {
  allSections: 'apps/docs/content/nav',
  allDocs: 'apps/docs/content/docs',
  allPackages: 'apps/docs/content/reference',
} as const;

/**
 * An empty collection means the GraphQL server read no files. The site always
 * has guides, sections, and package pages on disk, so an empty answer is a
 * broken content path rather than an empty site. Fail the build and say where
 * to look, instead of shipping a blank home page and an empty sidebar.
 */
function expectRecords<T>(
  collection: keyof typeof CONTENT_DIRS,
  records: T[]
): T[] {
  if (records.length === 0) {
    throw new Error(
      `Flatbread returned no \`${collection}\` records. Check that \`flatbread start\` is reading this repository, that \`apps/docs/flatbread.config.js\` is valid, and that ${CONTENT_DIRS[collection]} holds files.`
    );
  }
  return records;
}

function requireText(
  collection: string,
  row: number | string,
  field: string,
  value: unknown
): string {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  throw new Error(
    `Flatbread returned an invalid \`${collection}\` record (${row}): \`${field}\` is missing. Fix the source file or collection query before building the docs site.`
  );
}

export const getSections = once(async (): Promise<Section[]> => {
  const data = await query(AllSectionsDocument);
  const sections = expectRecords('allSections', data.allSections ?? []);
  return sections.map((section, index) => ({
    id: requireText('allSections', index, 'id', section?.id),
    title: requireText('allSections', index, 'title', section?.title),
    order: section?.order ?? 0,
    blurb: section?.blurb ?? '',
  }));
});

export const getDocs = once(async (): Promise<DocSummary[]> => {
  const data = await query(AllDocsDocument);
  const docs = expectRecords('allDocs', data.allDocs ?? []);
  return docs.map((doc, index) => ({
    id: requireText('allDocs', index, 'id', doc?.id),
    title: requireText('allDocs', index, 'title', doc?.title),
    summary: doc?.summary ?? '',
    order: doc?.order ?? 0,
    sectionId: requireText('allDocs', index, 'section.id', doc?.section?.id),
  }));
});

export async function getDoc(id: string): Promise<DocPage | undefined> {
  const data = await query(DocByIdDocument, { id });
  const doc = data.Doc;
  if (!doc) return undefined;

  return {
    id: requireText('Doc', id, 'id', doc.id),
    title: requireText('Doc', id, 'title', doc.title),
    summary: doc.summary ?? '',
    sectionId: requireText('Doc', id, 'section.id', doc.section?.id),
    sectionTitle: requireText('Doc', id, 'section.title', doc.section?.title),
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
    html: requireText('Doc', id, '_content.html', doc._content?.html),
    timeToRead: doc._content?.timeToRead ?? 0,
  };
}

export const getPackages = once(async (): Promise<PackageSummary[]> => {
  const data = await query(AllPackagesDocument);
  const packages = expectRecords('allPackages', data.allPackages ?? []);
  return packages.map((entry, index) => ({
    id: requireText('allPackages', index, 'id', entry?.id),
    excerpt: entry?._content?.excerpt ?? '',
    timeToRead: entry?._content?.timeToRead ?? 0,
  }));
});

export async function getPackage(id: string): Promise<PackagePage | undefined> {
  const data = await query(PackageByIdDocument, { id });
  const entry = data.Package;
  if (!entry) return undefined;

  return {
    id: requireText('Package', id, 'id', entry.id),
    html: requireText('Package', id, '_content.html', entry._content?.html),
    timeToRead: entry._content?.timeToRead ?? 0,
  };
}

/**
 * Flatten every page into the list the search box filters. Flatbread has no
 * search of its own, so the site builds this once and ships it with the page.
 */
export const getSearchEntries = once(async (): Promise<SearchEntry[]> => {
  const data = await query(SearchCorpusDocument);

  const guides = expectRecords('allDocs', data.allDocs ?? []).map(
    (doc, index) => {
      const id = requireText('allDocs', index, 'id', doc?.id);
      const raw = requireText(
        'allDocs',
        index,
        '_content.raw',
        doc?._content?.raw
      );
      return {
        id,
        title: requireText('allDocs', index, 'title', doc?.title),
        href: `/docs/${id}/`,
        kind: 'guide' as const,
        group: requireText(
          'allDocs',
          index,
          'section.title',
          doc?.section?.title
        ),
        summary: doc?.summary ?? '',
        body: condense(raw),
      };
    }
  );

  const packages = expectRecords('allPackages', data.allPackages ?? []).map(
    (entry, index) => {
      const id = requireText('allPackages', index, 'id', entry?.id);
      const raw = requireText(
        'allPackages',
        index,
        '_content.raw',
        entry?._content?.raw
      );
      return {
        id,
        title: id,
        href: `/reference/${id}/`,
        kind: 'package' as const,
        group: 'Reference',
        summary: firstSentence(raw),
        body: condense(raw),
      };
    }
  );

  return [...guides, ...packages];
});

/** Strip markdown noise before the browser scores the complete page. */
function condense(raw: string): string {
  return normalizeSearchText(stripMarkup(raw));
}

function stripMarkup(raw: string): string {
  return raw
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/```[^\r\n]*\r?\n([\s\S]*?)```/g, ' $1 ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/&(?:#\d+|#x[\dA-Fa-f]+|[A-Za-z][A-Za-z0-9]+);/g, ' ')
    .replace(/[#>*`|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstSentence(raw: string): string {
  const text = stripMarkup(raw);
  const stop = /[.!?](?:\s|$)/.exec(text);
  const sentence = stop ? text.slice(0, stop.index + 1) : text;
  return truncate(sentence, 160);
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1).trimEnd()}…`;
}
