import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getDoc, getDocs } from '../../../lib/content';
import { tableOfContents } from '../../../lib/toc';
import { Frame } from '../../components/ascii/Frame';
import { Toc } from '../../components/nav/Toc';
import { CodeCopy } from '../../components/prose/CodeCopy';

export const dynamicParams = false;

export async function generateStaticParams() {
  const docs = await getDocs();
  return docs.map((doc) => ({ slug: doc.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) return {};

  return { title: doc.title, description: doc.summary };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) notFound();

  const contents = tableOfContents(doc.html);
  const sectionCoordinate = formatCoordinate(doc.sectionOrder);
  const documentCoordinate = `${sectionCoordinate}.${formatCoordinate(
    doc.order
  )}`;

  return (
    <article className="fb-page">
      <div className="fb-page__body">
        <header className="fb-page__header fb-plate">
          <p className="fb-plate__eyebrow">
            <span>Section {sectionCoordinate}</span>
            <span aria-hidden> / </span>
            <span>{doc.sectionTitle}</span>
          </p>

          <h1 className="fb-page__title">{doc.title}</h1>

          <dl className="fb-plate__metadata">
            <div>
              <dt>Document</dt>
              <dd>Guide</dd>
            </div>
            <div>
              <dt>Coordinate</dt>
              <dd>
                {documentCoordinate} / {doc.id}
              </dd>
            </div>
            <div>
              <dt>Read time</dt>
              <dd>{doc.timeToRead} min</dd>
            </div>
            <div className="fb-plate__source">
              <dt>Source</dt>
              <dd>apps/docs/content/docs/{doc.id}.md</dd>
            </div>
          </dl>

          <p className="fb-plate__figure">Plate {documentCoordinate}</p>

          {doc.summary ? (
            <p className="fb-page__summary">{doc.summary}</p>
          ) : null}
        </header>

        <div
          className="prose"
          id="doc-prose"
          dangerouslySetInnerHTML={{ __html: doc.html }}
        />
        <CodeCopy scope="#doc-prose" />

        {doc.related.length > 0 ? (
          <Frame
            label="related references"
            note={`section ${sectionCoordinate}`}
            className="fb-related fb-manual-references"
          >
            <ul>
              {doc.related.map((related, index) => (
                <li key={related.id}>
                  <Link href={`/docs/${related.id}/`}>
                    <span aria-hidden className="fb-manual-reference__number">
                      {formatReference(index + 1)}
                    </span>
                    {related.title}
                  </Link>
                  <p className="fb-manual-reference__source">
                    Document / {related.id}
                  </p>
                  {related.summary ? <p>{related.summary}</p> : null}
                </li>
              ))}
            </ul>
          </Frame>
        ) : null}
      </div>

      <div className="fb-page__rail">
        <Toc entries={contents} />
      </div>
    </article>
  );
}

function formatCoordinate(order: number): string {
  return String(order).padStart(2, '0');
}

function formatReference(order: number): string {
  return `REF. ${String(order).padStart(2, '0')}`;
}
