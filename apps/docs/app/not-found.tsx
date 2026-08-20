import Link from 'next/link';

import { Frame } from './components/ascii/Frame';

export default function NotFound() {
  return (
    <div className="fb-page">
      <div className="fb-page__body">
        <header className="fb-page__header fb-plate">
          <p className="fb-plate__eyebrow">Document index / 404</p>
          <h1 className="fb-page__title">Document not found</h1>
          <dl className="fb-plate__metadata">
            <div>
              <dt>Status</dt>
              <dd>No matching document</dd>
            </div>
          </dl>
        </header>
        <Frame
          label="recovery reference"
          className="fb-not-found fb-manual-references"
        >
          <p className="fb-note">
            No page answers to that address. Every page on this site comes from
            a Markdown file in the repository, so either the file moved or the
            link was wrong.
          </p>
          <p>
            <Link href="/">
              <span aria-hidden className="fb-manual-reference__number">
                REF. 01
              </span>
              Back to the start
            </Link>
          </p>
        </Frame>
      </div>
    </div>
  );
}
