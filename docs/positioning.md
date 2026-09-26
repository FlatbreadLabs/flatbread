# Flatbread positioning

For installation and usage, see the [main README](../README.md). For
definitions used in the docs and config, see the [glossary](./glossary.md).
To compare Flatbread with databases, CMSs, and other file-based tools, see
[Comparing Flatbread with other tools](./comparison.md). For keeping
and moving your data, see [data ownership](./data-ownership.md).

Flatbread turns files in Git into a typed relational graph. A project has
collections, records, and `refs` that link records. Generated types and
[GraphQL](https://graphql.org/) operations are common ways for an app to read
that graph; they do not define what Flatbread is.

**Flatbread** reads content from your repository and file system. Plugins
control how it reads files and turns them into data.

## The lead use case: memory for coding agents

[Proof](../packages/proof/README.md) is a Flatbread content
model for what a coding agent works out along the way. An agent records an
Effort and then writes Issues, Findings, Decisions, Constraints, Risks,
Citations, and Blobs against it. Each record is a markdown file under
`.flatbread-proof/`, so it is committed, diffed, reviewed, and reverted like
source. Writes go through `flatbread proof write`; reads come back as bounded
digests from `flatbread proof list`, `flatbread proof records`,
`flatbread proof relations`, `flatbread proof blocking-decisions`, and
`flatbread proof get`.

That solves a plain problem: an agent that closes its session forgets why it
chose what it chose. Putting the reasoning in the repository keeps it next to
the code it explains, and keeps it readable by a person.

## The general case: relational content

Everything above is one content model on a general engine. The same
collections, `refs`, filters, and generated types back sites, docs, and
internal tools. Posts point at authors; authors point at each other. Model your
own collections and you get the same typed graph.

**Who it is for:** People building coding agents that need memory a human can
review in Git, and teams building TypeScript sites, internal tools, and starter
projects that want versioned, reviewable content and links between entries
without setting up a CMS database.

## Public tagline and GitHub topics

**Tagline:** Context alignment, version controlled.

That line is the GitHub About blurb. It names the problem — people, agents, and
the record of _why_ drifting apart — and the store (Git). It does not name
GraphQL, CMS, or Markdown. Keep it. The README and this page explain the two
paths; the About field should stay short.

### Canonical GitHub topics

GitHub shows at most 20 topics. Topic pages sort by stars. Flatbread had 64
stars on 24 August 2026, so it only ranks on small, specific topics. Oceans
such as `javascript` or `ai-agents` hide the repo. Tiny, honest niches already
show it near the top.

The live list lives in [`.github/topics.json`](../.github/topics.json). That
file is the payload for GitHub's topics API. A repo admin applies it after
this change lands on `main`:

```bash
gh api -X PUT repos/FlatbreadLabs/flatbread/topics --input .github/topics.json
```

Order is the About sidebar order: agent memory first, then Git/file content.

| Topic                 | Why it is here                                                                           | 24 Aug 2026 snapshot                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `agent-memory`        | Name of the Proof path. People filter for this.                                          | 2,958 repos. Top of the page is 70k-star work. We will not rank it yet.                          |
| `coding-agents`       | Who the lead path is for.                                                                | 3,244 repos. Same: demand tag, not a ranking bet.                                                |
| `context-engineering` | The 2026 name for designing what an agent sees. Flatbread is a versioned context source. | 2,773 repos. High search interest; Java tutorials also wear this tag.                            |
| `project-memory`      | Exact pain: memory that belongs to the repo, not a chat.                                 | 154 repos. Top repo has 497 stars. 64 stars should land on the first page.                       |
| `context-management`  | Operational name for stopping context drift.                                             | 1,321 repos. Demand tag.                                                                         |
| `agent-context`       | Closest topic to the tagline.                                                            | 77 repos. After noise tags (TiDB), the next repos are 1.3k stars and down. 64 stars should show. |
| `llm-memory`          | Research and memory-library searchers use this, not `agent-memory`.                      | 451 repos. Demand tag; first page is 15k-star work.                                              |
| `git-native`          | How the store works, without saying "GitHub".                                            | 59 repos. Flatbread is already 6th (64 stars).                                                   |
| `markdown-cms`        | File-based publishing path, Markdown-shaped.                                             | 13 repos. Flatbread is already 1st.                                                              |
| `git-cms`             | Git-backed content for sites and docs.                                                   | 17 repos. Flatbread is already 4th, after Nuxt Content and Plenti.                               |
| `file-based-cms`      | Common search phrase for Contentlayer-class tools.                                       | 14 repos. 64 stars would be 2nd (current 2nd has 35 stars).                                      |
| `docs-as-code`        | Docs and internal-tool path, smaller than `headless-cms`.                                | 368 repos. First page starts at 3.7k stars; still the honest docs niche.                         |

### Dropped topics

The repo previously used 20 topics, many of them implementation labels.

| Topic                                                                           | Why it is out                                                                                                                                            |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai-agents`, `markdown`, `javascript`, `typescript`, `nodejs`, `nextjs`, `yaml` | Oceans. 37k–670k repos. A 64-star project never appears. README search still matches those words.                                                        |
| `graphql`, `graphql-codegen`                                                    | One read interface, not the product.                                                                                                                     |
| `headless-cms`                                                                  | Real CMS search traffic, but Strapi (73k stars) owns the page. `git-cms` / `markdown-cms` / `file-based-cms` are the niches we can win.                  |
| `knowledge-graph`                                                               | Proof is a Git-tracked graph of records. The topic page is Neo4j, RAG, and PKM giants (100k-star range). Keep the phrase in prose; do not compete there. |
| `knowledge-base`, `local-first`, `static-content`                               | Adjacent communities (wikis, CRDTs, SSGs) that are not this product.                                                                                     |
| `agent-skills`                                                                  | The Proof skill is a distribution channel. This repo is not a skill pack.                                                                                |
| `mcp`, `rag`, `graph-rag`, `claude-code`                                        | Dishonest until we ship those surfaces. Hitchhiking on `claude-code` (63k repos) would also pin us to one host.                                          |

### What this is not

Do not add empty vanity tags such as `context-alignment` or `durable-memory`
(single-digit repo counts, no searchers). Do not add `git-based-cms`: Decap CMS
already owns that 41-repo page, and `git-cms` covers the same idea with a
better current rank.

Revisit the list when star count crosses a few hundred (demand-topic pages
become reachable) or when a new surface ships (MCP, hosted search) and a new
tag becomes true.

**What Flatbread does not do:**

- It is not a hosted CMS, dashboard, or writing UI.
- It is not a general-purpose GraphQL platform or database. Transactions,
  detailed access control, and many concurrent writers are outside its scope.
- It does not reload its own packages.
  [`flatbread start --watch`](./local-dev-loop.md) picks up valid content and
  config changes, but a change to a Flatbread package needs a rebuild and a
  restart.

**GraphQL:** GraphQL is one read interface over the graph. In the default setup
it reads data that Flatbread has already loaded, following
`schema → operations → codegen`. Start with files and configuration, then
choose how your app reads the data. The
[Quickstart](../packages/flatbread/README.md#quickstart-posts-authors-and-tags)
shows posts, authors, and tags from files through generated types.

**Keeping your data:** Raw files stay in Git, so you can branch, review,
revert, and move content without asking a hosted CMS for an export. JSON and
CSV exports make reviewable snapshots. GraphQL documents and generated
operation types show the read shapes your app used. The generated read API is a
convenience layer; files, snapshots, documents, and operation types are easier
to take to another tool.

**If you already use GraphQL:** Read about [`refs` and relations](./glossary.md#relation),
then use your app's `flatbread codegen` documentation. The files and
configuration come before the queries you write.
