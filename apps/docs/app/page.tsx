import Link from 'next/link';

import { getDocs, getPackages, getSections } from '../lib/content';
import { groupPackages } from '../lib/package-groups';
import { ManualContentDiagram } from './components/manual/ManualContentDiagram';
import { CONTENT_PARTS } from './components/manual/content-system';

export default async function Home() {
  const [sections, docs, packages] = await Promise.all([
    getSections(),
    getDocs(),
    getPackages(),
  ]);

  const counts = {
    sections: sections.length,
    docs: docs.length,
    packages: packages.length,
  };
  const collections = CONTENT_PARTS.map((part) => ({
    ref: part.ref,
    name: part.name,
    count: counts[part.key],
    path: part.manifestPath,
    note: part.manifestNote,
  }));
  const packageGroups = groupPackages(packages);

  return (
    <div className="fb-home fb-manual-home">
      <section className="fb-manual-cover" aria-labelledby="home-title">
        <div className="fb-manual-cover__heading">
          <p className="fb-manual-cover__section">SECTION 00</p>
          <p className="fb-manual-cover__type">DOCUMENTATION SYSTEM</p>
        </div>

        <h1 id="home-title" className="fb-manual-cover__title">
          Give coding agents memory you can review in Git
        </h1>

        <p className="fb-manual-cover__lede">
          Proof records agent work, decisions, and evidence as linked Markdown
          in your repository. Flatbread is the typed relational graph
          underneath. GraphQL is one read interface; the same engine also powers
          app content.
        </p>

        <nav className="fb-manual-cover__actions" aria-label="Start here">
          <Link href="/reference/proof/" className="fb-manual-action">
            <span className="fb-manual-action__ref">01</span>
            Start with agent memory
          </Link>
          <Link
            href="/reference/flatbread/#quickstart-posts-authors-and-tags"
            className="fb-manual-action"
          >
            <span className="fb-manual-action__ref">02</span>
            Start with the content graph
          </Link>
        </nav>
      </section>

      <ManualContentDiagram
        sections={sections}
        docs={docs}
        packages={packages}
      />

      <section className="fb-manual-manifest" aria-labelledby="manifest-title">
        <div className="fb-manual-section-heading">
          <p className="fb-manual-section-heading__ref">MANIFEST 00–1</p>
          <h2 id="manifest-title">Content manifest</h2>
          <p className="fb-manual-section-heading__note">
            Repository records read by this site.
          </p>
        </div>
        <div
          className="fb-manual-table-scroll"
          role="region"
          aria-label="Content collections"
          tabIndex={0}
        >
          <table className="fb-manual-table">
            <thead>
              <tr>
                <th scope="col">ref.</th>
                <th scope="col">collection</th>
                <th scope="col">records</th>
                <th scope="col">source</th>
                <th scope="col">role</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((collection) => (
                <tr key={collection.name}>
                  <td>{collection.ref}</td>
                  <td>{collection.name}</td>
                  <td>{collection.count}</td>
                  <td>
                    <code>{collection.path}</code>
                  </td>
                  <td>{collection.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="fb-manual-chapters" aria-labelledby="chapters-title">
        <div className="fb-manual-section-heading">
          <p className="fb-manual-section-heading__ref">INDEX 00–1</p>
          <h2 id="chapters-title">Guide chapters</h2>
          <p className="fb-manual-section-heading__note">
            {sections.length} sections / {docs.length} guide records
          </p>
        </div>
        <ol className="fb-manual-chapters__list">
          {sections.map((section) => (
            <li key={section.id} className="fb-manual-chapter">
              <div className="fb-manual-chapter__heading">
                <p className="fb-manual-chapter__ref">
                  {number(section.order)}
                </p>
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.blurb}</p>
                </div>
              </div>
              <ol className="fb-manual-chapter__pages">
                {docs
                  .filter((doc) => doc.sectionId === section.id)
                  .map((doc) => (
                    <li key={doc.id}>
                      <Link href={`/docs/${doc.id}/`}>
                        <span className="fb-manual-chapter__page-ref">
                          {number(section.order)}.{number(doc.order)}
                        </span>
                        <span>{doc.title}</span>
                      </Link>
                      <p>{doc.summary}</p>
                    </li>
                  ))}
              </ol>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="fb-manual-references"
        aria-labelledby="references-title"
      >
        <div className="fb-manual-section-heading">
          <p className="fb-manual-section-heading__ref">INDEX 00–2</p>
          <h2 id="references-title">Package references</h2>
          <p className="fb-manual-section-heading__note">
            {packages.length} published README records
          </p>
        </div>
        <div className="fb-manual-references__groups">
          {packageGroups.map((group) => (
            <section key={group.name} className="fb-manual-reference-group">
              <h3>{group.name}</h3>
              <ol>
                {group.packages.map((entry, index) => (
                  <li key={entry.id}>
                    <Link href={`/reference/${entry.id}/`}>
                      <span className="fb-manual-reference-group__ref">
                        {number(index + 1)}
                      </span>
                      {entry.id}
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

function number(value: number): string {
  return String(value).padStart(2, '0');
}
