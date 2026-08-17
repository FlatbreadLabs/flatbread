# Flatbread docs site

The documentation site for Flatbread, built on Flatbread.

Every page here is a Markdown file that already lives in this repository. The
site does not copy or generate that Markdown; it reads the same files through
Flatbread's GraphQL server while the site is being built, then ships plain
files. Change a guide or a package README, and the page changes with it.

## Run it

From the repository root:

```bash
pnpm docs:dev     # build the packages, then Flatbread on :5057 and Next on :3000
pnpm docs:build   # build packages, then validate root and /flatbread exports
```

`pnpm docs:build` is the release build contract. It works from a fresh clone:
first it builds the workspace packages, then it builds and validates the docs
at `/`, and finally it rebuilds and validates them with the GitHub Pages base
path `/flatbread`.

When diagnosing one target, run `pnpm docs:build:root` or
`pnpm docs:build:base-path` after the workspace packages have been built.

`pnpm play` (the Next.js example) and `pnpm docs:dev` both use Flatbread on **5057**
and Next on **3000**. Running the two at once fails; stop one before you start
the other.

Or from this directory, once the packages are built:

```bash
pnpm dev          # flatbread start --watch -- next dev --turbopack
pnpm build        # build the root-path ./out, then validate the export
pnpm serve        # serve the built files
pnpm check        # check frontmatter, links, and graph-to-disk parity
pnpm test         # vitest run: content, search, Markdown, link, and export checks
```

`flatbread start` runs the GraphQL server for as long as the command after
`--` runs, so the production build has data and the finished site needs no
server at all.

## Where the content lives

| Collection | Files                    | What it holds                                                               |
| ---------- | ------------------------ | --------------------------------------------------------------------------- |
| `Doc`      | `content/docs/*.md`      | The guides. Real files, moved here from the old top-level `docs/`.          |
| `Section`  | `content/nav/*.yaml`     | Navigation groups, written as YAML so the site exercises both transformers. |
| `Package`  | `content/reference/*.md` | Symlinks to `packages/*/README.md`.                                         |

Two rules shape that layout, and both are worth knowing before you add a
collection:

1. A content path may not climb above the project directory. `../../packages`
   matches nothing, which is why `content/reference` holds symlinks.
2. A capture may name a directory or a filename, but a capture followed by a
   fixed filename — `packages/[id]/README.md` — is not matched when the
   content is first loaded. Capturing the filename, `content/reference/[id].md`,
   works.

Flatbread requires an `id` on every record and never invents one. The guides
declare `id` in frontmatter, and the filename capture supplies the same value.
The package pages have no frontmatter at all — a README cannot carry any
without showing it on npm — so the symlink's own name is the id.

A clone on Windows without symlink support gets plain text files that hold a
path, and the package pages then render that path instead of the README. Enable
Git symlinks (`git config core.symlinks true`) and clone again. On Windows that
needs Developer Mode or an elevated shell.

## Adding a page

1. Write `content/docs/<id>.md`.
2. Give it frontmatter: `id` (matching the filename), `title`, `section` (an
   id from `content/nav`), `order`, `summary`, and optionally `related`.
3. Run `pnpm check:links`.

`pnpm build` runs that check first, so a page that names a missing section or
links to a file that moved fails the build rather than shipping.

## Markdown pipeline

Flatbread's Markdown transformer takes remark and rehype plugins, and the site
supplies six of its own in `plugins/`:

| Plugin                       | What it does                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `remark-strip-first-heading` | Removes the leading `# Heading` so the page title is not printed twice. The file keeps its H1 for GitHub. |
| `remark-code-meta`           | Carries a fence's info string onto the `<code>` element as a label.                                       |
| `remark-repo-links`          | Rewrites `./glossary.md` and `../../packages/core/README.md` into site routes.                            |
| `rehype-heading-anchors`     | Adds an `id` and a self link to every heading below H1.                                                   |
| `rehype-shiki`               | Colours code with Shiki, writing both themes as CSS variables.                                            |
| `rehype-table-scroll`        | Wraps wide Markdown tables in a labelled, keyboard-focusable scroll region.                               |

They are written against plain syntax trees and pull in no unified packages of
their own. Flatbread's transformer depends on unified 10, while most published
plugins now target unified 11, so a plugin from npm may or may not fit.

## What the site does not use

- **No MDX.** MDX would parse the Markdown outside Flatbread, which is the
  opposite of what this site is meant to demonstrate. Interactive behaviour is
  added to the rendered HTML afterwards instead — see `CodeCopy`.
- **No animation library.** The docs avoid decorative text and page motion, so
  reduced-motion users do not depend on a JavaScript fallback and readers keep
  a stable page while navigating.
- **No search service.** Flatbread can filter but not rank. The build emits a
  static index for every page; the browser fetches it when search first opens
  and scores it locally.
