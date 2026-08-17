import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPackage, getPackages } from '../../../lib/content';
import { tableOfContents } from '../../../lib/toc';
import { Toc } from '../../components/nav/Toc';
import { CodeCopy } from '../../components/prose/CodeCopy';

export const dynamicParams = false;

export async function generateStaticParams() {
  const packages = await getPackages();
  return packages.map((entry) => ({ slug: entry.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: packageName(slug) };
}

export default async function PackagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getPackage(slug);
  if (!entry) notFound();

  const contents = tableOfContents(entry.html);

  return (
    <article className="fb-page">
      <div className="fb-page__body">
        <header className="fb-page__header">
          <p className="fb-page__eyebrow">
            Reference
            <span aria-hidden> · </span>
            {entry.timeToRead} min
            <span aria-hidden> · </span>
            <span className="fb-page__source">
              packages/{entry.id}/README.md
            </span>
          </p>

          <h1 className="fb-page__title">{packageName(entry.id)}</h1>

          <p className="fb-page__summary">
            This page renders the package README from the repository revision
            that built this site. It can be newer than the README in the current
            npm release.
          </p>
        </header>

        <div
          className="prose"
          id="doc-prose"
          dangerouslySetInnerHTML={{ __html: entry.html }}
        />
        <CodeCopy scope="#doc-prose" />
      </div>

      <div className="fb-page__rail">
        <Toc entries={contents} />
      </div>
    </article>
  );
}

/** `flatbread` is published under its own name; the rest are scoped. */
function packageName(id: string): string {
  return id === 'flatbread' ? 'flatbread' : `@flatbread/${id}`;
}
