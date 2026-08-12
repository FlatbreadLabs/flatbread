import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getDoc, getDocs } from '../../../lib/content';
import { tableOfContents } from '../../../lib/toc';
import { Frame } from '../../components/ascii/Frame';
import { SplitText } from '../../components/motion/SplitText';
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

  return (
    <article className="fb-page">
      <div className="fb-page__body">
        <header className="fb-page__header">
          <p className="fb-page__eyebrow">
            {doc.sectionTitle}
            <span aria-hidden> · </span>
            {doc.timeToRead} min
            <span aria-hidden> · </span>
            <span className="fb-page__source">
              apps/docs/content/docs/{doc.id}.md
            </span>
          </p>

          <h1 className="fb-page__title">
            <SplitText text={doc.title} by="char" />
          </h1>

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
          <Frame label="read next" className="fb-related">
            <ul>
              {doc.related.map((related) => (
                <li key={related.id}>
                  <Link href={`/docs/${related.id}/`}>
                    <span aria-hidden className="fb-related__arrow">
                      →
                    </span>
                    {related.title}
                  </Link>
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
