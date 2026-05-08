# PMF decision rubric — Flatbread vs adjacent workflows

This page supports product and positioning decisions (e.g. [issue #144](https://github.com/FlatbreadLabs/flatbread/issues/144)) by comparing **Flatbread** to four **buyer-recognizable** workflow families. Use it to avoid mixing “Flatbread vs SQLite” with “Flatbread vs Notion” in the same breath without naming who you are selling to.

**Flatbread in one line:** Git-native **relational content** for TypeScript apps, **backed by flat files** in the repo. **[GraphQL](https://graphql.org/)** is a common **read interface** and codegen driver; it is **not** the whole product identity. The core artifact is the **modeled content graph** (collections, fields, relations, validation).

---

## How to read the matrix

Each row names a **workflow category** a buyer might already use. Columns are **decision criteria** aligned with validation experiments and near-term PMF work. Cells summarize typical tradeoffs **for that category**, not a single vendor scorecard.

**Legend (qualitative):**

- **Strong** — category usually excels here with little extra work.
- **Medium** — workable with discipline, tooling, or conventions; gaps are predictable.
- **Weak** — common pain or structural mismatch for this criterion in typical setups.
- **N/A** — criterion does not apply the same way (call out explicitly).

Where Flatbread is **targeting** behavior that is not fully shipped yet (for example, first-class reference integrity at load time), the cell notes **current vs target** honestly.

---

## Comparative matrix

| Criterion                  | Flatbread (relational flat files)                                                                                                                                                                                                                  | SQLite-style database workflows                                                         | Hosted / headless CMS workflows                                                                       | Contentlayer-like content workflows                                                    | Agent artifact / Effort Graph workflows                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Setup time**             | **Medium** — deps, config, content paths, optional GraphQL server/codegen; goal is ~10 minutes to a typed read for a `posts → authors → tags` starter.                                                                                             | **Medium** — schema/migrations, client, connection; very fast for experienced DB users. | **Medium–High** — account, schema/content model, API keys, webhooks; low ops if fully hosted.         | **Medium** — build plugin, schemas, content layout; familiar to static/SSG teams.      | **High variance** — conventions differ (`AGENTS.md`, `.handoff/`, vaults); **relational** effort graphs rarely work out of the box. |
| **Type safety**            | **Medium (moving target)** — generated types help at the query boundary; config and raw content surfaces may still be looser until model-first typing lands end-to-end.                                                                            | **Strong** with SQL builders/ORMs; schema is the source of truth.                       | **Medium** — SDK/OpenAPI/GraphQL types help; CMS field types and draft content can weaken guarantees. | **Strong** for defined content schemas; weaker if everything is MDX/adhoc.             | **Weak–Medium** — lots of markdown prose; typed edges often missing unless encoded manually.                                        |
| **Relation modeling**      | **Strong intent** — `refs`, nested reads, filters over a content graph; cardinality must stay **documented** (implied behavior is an audit gap).                                                                                                   | **Strong** — joins and constraints are the database’s job.                              | **Medium–Strong** — reference fields and UI; deeper graph queries depend on API.                      | **Medium** — relations exist but are optimized for site content, not arbitrary graphs. | **Weak** — links and search, not always **foreign-key-style** relations across tool boundaries.                                     |
| **Reference integrity**    | **Target: Strong / Today: uneven** — buyers expect missing refs, duplicate IDs, and bad shapes to **fail with clear diagnostics at load/validate**, not silent GraphQL `null` chains; full guarantee is **roadmap-critical**, not optional polish. | **Strong** with constraints and transactions (or app-enforced).                         | **Medium–Strong** — CMS often blocks bad publishes; export/sync paths can still drift.                | **Medium** — build fails on schema errors; cross-file refs vary by stack.              | **Weak** — broken links and orphan artifacts are common; validation is not standardized.                                            |
| **Portability**            | **Strong (raw files + Git)** — export story should include **JSON/CSV per collection** as a deliberate trust lever; contrast with ad-hoc “query and save.”                                                                                         | **Strong** via `dump`, backups, SQL files; binary portability has ops nuance.           | **Medium** — APIs and export formats; lock-in depends on vendor.                                      | **Strong** — content lives in repo; migration is folder moves + schema rewrites.       | **Strong** — everything is files; **semantic** portability across tools is harder than byte portability.                            |
| **Local dev loop**         | **Medium (honest)** — file-backed by nature; **reliable hot reload of content is not a pillar yet**; expect restarts or manual steps today where examples require a server/codegen refresh.                                                        | **Strong** — migrations + local DB; ORM dev UX mature.                                  | **Variable** — offline editing depends on sync; preview stacks add latency.                           | **Medium–Strong** — dev servers often rebuild on file change; watch modes vary.        | **Strong for “save file”** — weak for “typed graph updates everywhere” without extra tooling.                                       |
| **Agent query ergonomics** | **Medium (directional)** — predicate-rich filters and nested reads suit **structured** agent queries; today’s path often touches **GraphQL** or codegen; **MCP / generated TS** as first-class agent surfaces is PMF leverage, not a nice-to-have. | **Strong** — SQL is the universal agent substrate when access is allowed.               | **Medium** — HTTP APIs; auth and rate limits add friction for agents.                                 | **Medium** — build-time access is easy; **runtime** ad-hoc queries less natural.       | **Weak–Medium** today — keyword/vault MCP and search; **Effort Graph**-style queries want relational filters + integrity.           |

---

## Named contrasts (avoid category mixing)

When writing positioning or issues, **name the buyer** and **one primary alternative**:

| If the buyer is deciding against…              | Lead with…                                                                                                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SQLite / Postgres + app**                    | Versioned **content** and **review in Git** vs operational DB ergonomics; Flatbread is **not** replacing transactions or multi-writer DB semantics.              |
| **Notion / Contentful / Sanity / etc.**        | **Repo ownership** and **flat files** vs editorial APIs and hosted workflows; relations without standing up CMS infrastructure.                                  |
| **Contentlayer / Velite / similar**            | **Cross-collection references and graph reads** in TypeScript vs site-generation-first content pipelines.                                                        |
| **Handoff folders / vault MCP / memory tools** | **Typed relations and validation** over agent artifacts vs search-only or narrative-memory layouts—only after core integrity and watch/export bars are credible. |

---

## Agent artifacts: secondary vertical vs primary wedge

**Secondary vertical (default posture today)** fits when Flatbread’s **near-term bar** is still about relational **content** for apps—schemas, IDs, validation, exports, watch—and agent use inherits the same graph primitives without a bespoke **Effort Graph** product bundle.

**Go signals for treating agent artifacts as primary wedge**

- Reference integrity and diagnostics at **load/validate** are **trusted** on real repos (missing refs, duplicate IDs, invalid shapes fail loudly and actionably).
- **Model-first** onboarding reaches a **typed** query without demanding GraphQL literacy on day one; generated TypeScript and/or MCP cover the **agent-shaped** query path.
- **Watch** or an honest, low-friction loop makes **file edit → graph update** usable for harnesses that emit many small artifacts.
- At least one **reference layout** (for example `.agents/` or handoff-oriented trees) is documented as **indexed and validated** incremental adoption, not a migration cliff.
- Evaluation buyers consistently compare Flatbread to **vault/handoff/GCC** workflows—not only to CMS or Contentlayer—_and_ the graph answers queries like _blocking decisions for effort X with plan title_ without bespoke glue per repo.

**No-go / hold signals (keep agent artifacts secondary)**

- Broken links and duplicate IDs still **silently** degrade query results; buyers cannot distinguish “no data” from “bad graph.”
- The **only** documented happy path assumes a running **GraphQL** mental model for authors and agents.
- Local iteration still **requires full process restart** for ordinary content edits in the primary examples, with no credible watch/export story.
- Positioning drifts into **database replacement** or **hosted CMS** parity; agent narrative distracts from the core **TypeScript + Git relational content** promise.

**Decision summary:** Agent artifacts are a **credible strategic option** because they amplify demand for the same integrity, typing, and query surfaces the core product needs; they become a **primary wedge** only when those properties are **proven in production-shaped workflows**, not declared in roadmap language alone.

---

## Related docs

- [Flatbread positioning](./positioning.md) — canonical product framing.
- [Glossary](./glossary.md) — collections, relations, IDs, validation, query interfaces.
- [Flatbread Flow PMF Audit](../flatbread-flow-pmf-audit.md) — evidence-backed gaps and near-term experiments.
- [Agent artifact opportunity](../flatbread-agent-artifact-opportunity.md) — Effort Graph and adjacent landscape (deeper than this rubric).
