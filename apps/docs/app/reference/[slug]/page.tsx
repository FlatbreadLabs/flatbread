import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPackage, getPackages } from '../../../lib/content';
import { getReferenceAction } from '../../../lib/reference-actions';
import { tableOfContents } from '../../../lib/toc';
import { Frame } from '../../components/ascii/Frame';
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
  const action = getReferenceAction(entry.id);

  return (
    <article className="fb-page">
      <div className="fb-page__body">
        <header className="fb-page__header fb-plate">
          <p className="fb-plate__eyebrow">
            <span>Reference</span>
            <span aria-hidden> / </span>
            <span>Package documentation</span>
          </p>

          <h1 className="fb-page__title">{packageName(entry.id)}</h1>

          <dl className="fb-plate__metadata">
            <div>
              <dt>Document</dt>
              <dd>Package reference</dd>
            </div>
            <div>
              <dt>Coordinate</dt>
              <dd>Reference / {entry.id}</dd>
            </div>
            <div>
              <dt>Read time</dt>
              <dd>{entry.timeToRead} min</dd>
            </div>
            <div className="fb-plate__source">
              <dt>Source</dt>
              <dd>packages/{entry.id}/README.md</dd>
            </div>
          </dl>

          <p className="fb-plate__figure">Reference plate</p>

          <p className="fb-page__summary fb-reference__action">
            <strong className="fb-reference__action-label">
              Initial procedure:
            </strong>{' '}
            <span>
              {action.firstAction.label} ({action.firstAction.minutes} min):
            </span>{' '}
            <code className="fb-reference__command">
              {action.firstAction.command}
            </code>
          </p>

          <p className="fb-reference__detail">
            <strong>Before:</strong> {action.prerequisites}
          </p>

          <p className="fb-reference__detail">
            <strong>Success:</strong> {action.firstAction.success}
          </p>
        </header>

        <div
          className="prose"
          id="doc-prose"
          dangerouslySetInnerHTML={{ __html: entry.html }}
        />
        <CodeCopy scope="#doc-prose" />

        <Frame
          label="follow-on reference"
          note={`${action.nextAction.minutes} min`}
          className="fb-related fb-manual-references"
        >
          <p>
            <a href={action.nextAction.href}>
              <span aria-hidden className="fb-manual-reference__number">
                REF. 01
              </span>
              {action.nextAction.label}
            </a>
          </p>
        </Frame>
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
