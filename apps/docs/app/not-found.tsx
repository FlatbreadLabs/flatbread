import Link from 'next/link';

import { Frame } from './components/ascii/Frame';

export default function NotFound() {
  return (
    <div className="fb-page">
      <div className="fb-page__body">
        <Frame label="404">
          <p className="fb-note">
            No page answers to that address. Every page on this site comes from
            a Markdown file in the repository, so either the file moved or the
            link was wrong.
          </p>
          <p>
            <Link href="/">→ Back to the start</Link>
          </p>
        </Frame>
      </div>
    </div>
  );
}
