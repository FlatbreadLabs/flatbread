import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getAllDocPages, getDocPageById } from '../../../lib/read';
import { Doc, type DocPageView, type RelatedLink } from '../../components/Doc';

async function getOrderedPages() {
  const pages = await getAllDocPages();
  return pages
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      id: String(p.id ?? ''),
      slug: String(p._slug ?? ''),
      title: String(p.title ?? ''),
      section: String(p.section ?? 'misc'),
      order: Number(p.order ?? 0),
    }))
    .sort((a, b) => a.order - b.order);
}

export async function generateStaticParams() {
  const pages = await getOrderedPages();
  return pages.map((p) => ({ slug: [p.id] }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const id = slug?.[0];
  if (!id) return { title: 'flatbread/docs' };
  const doc = await getDocPageById(id);
  if (!doc) return { title: 'flatbread/docs' };
  return {
    title: `${doc.title} · flatbread/docs`,
    description: String(doc.summary ?? ''),
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const id = slug?.[0];
  if (!id) redirect('/');

  const doc = await getDocPageById(id);
  if (!doc) notFound();

  const ordered = await getOrderedPages();
  const byId = new Map(ordered.map((p) => [p.id, p]));
  const sectionPages = ordered
    .filter((p) => p.section === doc.section)
    .map((p) => p.id);
  const index = sectionPages.indexOf(String(doc.id ?? ''));
  const prevId = index > 0 ? sectionPages[index - 1] : null;
  const nextId =
    index >= 0 && index < sectionPages.length - 1
      ? sectionPages[index + 1]
      : null;
  const prev = prevId ? byId.get(prevId) ?? null : null;
  const next = nextId ? byId.get(nextId) ?? null : null;

  const relatedSlugs = Array.isArray(doc.related)
    ? (doc.related as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];
  const related: RelatedLink[] = relatedSlugs
    .map((relId) => byId.get(relId))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({ slug: p.slug, title: p.title }));

  const view: DocPageView = {
    id: String(doc.id ?? ''),
    slug: String(doc._slug ?? ''),
    title: String(doc.title ?? ''),
    section: String(doc.section ?? 'misc'),
    order: Number(doc.order ?? 0),
    summary: doc.summary ?? null,
    html: String(doc._content?.html ?? ''),
    timeToRead: doc._content?.timeToRead ?? null,
  };

  return (
    <Doc
      doc={view}
      related={related}
      prev={prev ? { slug: prev.slug, title: prev.title } : null}
      next={next ? { slug: next.slug, title: next.title } : null}
    />
  );
}
