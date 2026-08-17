---
id: pmf-decision-rubric
title: Compared with other tools
section: compare
order: 1
summary: Where Flatbread sits next to SQLite, a hosted CMS, and Contentlayer-style build steps.
related:
  - positioning
  - data-ownership
---

# Comparing Flatbread with other tools

**Next action (3 minutes): start with the first matching need below.**

1. Choose **Flatbread** for related files in Git with typed reads.
2. Choose a **SQL database** for transactions or many concurrent writers.
3. Choose a **hosted CMS** for a managed writing and publishing interface.
4. Choose a **content build tool** for file transforms without relational reads.
5. Choose an **agent-note tool** for loose notes where search matters more than structure.

Flatbread turns related content files in a TypeScript project into data an app
can read. GraphQL and codegen are common read paths, not the product itself.

## How to use this table

Each column describes a group of tools, not every product in that group.

- **Strong** means the group usually handles the need with little extra work.
- **Medium** means it works, but needs some setup or care.
- **Weak** means the group is often a poor fit for that need.

Setup times are ballparks for a small TypeScript project with no data migration
or custom authentication.

## Core project fit

| Need                       | Flatbread                                                                                                                                          | SQL database                                                                            | Hosted CMS                                                                              | Content files with build tools                                  | Agent notes and project-memory tools                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Setup time**             | **15–30 minutes** with a starter; allow 1–2 hours to model an existing corpus.                                                                     | **30–90 minutes** for a local schema and client; deployment and migrations take longer. | **30–120 minutes** to create a space, content types, and API access.                    | **15–60 minutes** for a plugin, content rules, and file layout. | **5–30 minutes** for folder and metadata rules.                  |
| **Type safety**            | **Medium** — generated query types help, while config and raw file types still have limits.                                                        | **Strong** with a schema and a typed query library.                                     | **Medium** — SDK and API types help, but drafts and flexible fields can weaken them.    | **Strong** when the content schema is defined.                  | **Weak–Medium** — many systems store mostly free-form Markdown.  |
| **Links between records**  | **Strong** — `refs` connect collections, and nested reads follow those links.                                                                      | **Strong** — joins and database constraints handle links.                               | **Medium–Strong** — reference fields are common, but deeper queries depend on the API.  | **Medium** — links usually focus on site content.               | **Weak** — links and search often replace structured references. |
| **Bad IDs and references** | **Strong for configured `refs`** — loading checks duplicate IDs, missing targets, and invalid reference values before Flatbread builds the schema. | **Strong** with constraints and transactions.                                           | **Medium–Strong** — many CMSs block invalid publishing, but imports can still go wrong. | **Medium** — support differs by tool.                           | **Weak** — broken links and missing notes are common.            |

## Ownership and workflow

| Need                           | Flatbread                                                                                                                                                              | SQL database                                                           | Hosted CMS                                                                 | Content files with build tools                                                        | Agent notes and project-memory tools                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Keeping your data**          | **Strong** — files stay in Git, and the core API can create JSON and CSV exports.                                                                                      | **Strong** — dumps, backups, and SQL files are common.                 | **Medium** — exports and APIs vary by provider.                            | **Strong** — content stays in the repository.                                         | **Strong** — notes are usually files, though moving their meaning to another tool can take work. |
| **Local development**          | **Medium–Strong** — `flatbread start --watch` reloads valid content and config changes. Package code and app refresh behavior still need their own rebuild or restart. | **Strong** — local databases and migration tools are well established. | **Varies** — offline work and previews depend on the provider.             | **Medium–Strong** — many tools rebuild when files change.                             | **Strong for saving files** — structured data updates need extra tooling.                        |
| **Reading data from an agent** | **Medium** — GraphQL and generated TypeScript can read related data; more direct agent tools are still developing.                                                     | **Strong** when the agent can use SQL safely.                          | **Medium** — HTTP APIs work, but authentication and rate limits add steps. | **Medium** — build-time access is simple; asking new questions at run time is harder. | **Weak–Medium** — search is common, but structured filtering is less common.                     |

## What to emphasize

| If someone is comparing Flatbread with…    | Explain that Flatbread offers…                                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **SQLite or Postgres**                     | Content files that stay in Git and can be reviewed in pull requests. It does not replace database transactions or many-writer systems. |
| **Notion, Contentful, or Sanity**          | Repository ownership and file-based content instead of a hosted editing service.                                                       |
| **Contentlayer, Velite, or similar tools** | References between collections and related reads in TypeScript.                                                                        |
| **Handoff folders or note tools**          | Structured links and validation when simple search across files is not enough.                                                         |

## Related docs

- [Flatbread positioning](./positioning.md)
- [Glossary](./glossary.md)
- [Local development loop](./local-dev-loop.md)
- [Data ownership](./data-ownership.md)

Next: write down the one need that matters most before you compare scores.
