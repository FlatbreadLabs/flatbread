---
program: OpenAI Open Source Fund (Codex Open Source Fund)
program_url: https://openai.com/form/codex-open-source-fund/
applicant: Tony Ketcham
project: Flatbread
license: MIT
repo_url: https://github.com/FlatbreadLabs/flatbread
status: draft
last_updated: 2026-05-09
---

# OpenAI Open Source Fund — Flatbread

## Application form responses

### First name

Tony

### Last name

Ketcham

### Email

ketcham.dev@gmail.com

> NOTE TO REVIEWER: confirm the email on file matches the GitHub-noreply address you want OpenAI to use for follow-up.

### LinkedIn

> NOTE TO REVIEWER: paste the canonical LinkedIn URL for Tony Ketcham before submitting.

### GitHub

https://github.com/toeknee-FlatbreadLabs

> NOTE TO REVIEWER: confirm primary GitHub handle. The org is `FlatbreadLabs`; the maintainer’s personal handle should be the one with write/owner access on the org.

### Which open source project are you representing?

Flatbread (`@flatbread/*` on npm; `flatbread` CLI). Repo: https://github.com/FlatbreadLabs/flatbread. Monorepo of typed packages — `core`, `flatbread`, `codegen`, `config`, `source-filesystem`, `transformer-markdown`, `transformer-yaml`, `resolver-svimg`, `utils`, and `proof` — published under MIT.

### Brief description of the project

Flatbread is a Git-native relational content layer for TypeScript apps. The repo elevator line, verbatim: *"Eat your relational markdown data and query it, too, with GraphQL inside damn near any framework."* You point Flatbread at folders of `.md` / `.yaml` files, declare collections and refs, and get a typed object graph queryable through GraphQL today and through generated TypeScript and an MCP server next.

The project is mid-pivot, documented in `flatbread-flow-pmf-audit.md` and `flatbread-agent-artifact-opportunity.md`: from "GraphQL over markdown" to **the relational layer for agent efforts in git**. We are extending the same primitives — collections, refs, filters, codegen — into an **Effort Graph** preset (Effort → Plan → Decision → Session → Artifact → Run) so coding agents like Codex, Claude Code, and Cursor can read and append durable, typed artifacts during multi-week work, instead of losing decisions between sessions.

Concrete proof we already eat our own dog food: `packages/proof` ships `@flatbread/proof`, a Cursor-SDK DAG runner that decomposes a task into subagents, executes them in topological order, and writes a live `.canvas.tsx` showing nodes move `PENDING → RUNNING → FINISHED | ERROR`. This funding application itself was scoped through a Proof DAG.

### GitHub repo

https://github.com/FlatbreadLabs/flatbread — public, MIT, pnpm 10.33.0 monorepo, Node ≥ 20.19, CI in `.github/workflows/pipeline.yml`, `CONTRIBUTING.md`, `examples/nextjs`, `examples/sveltekit`.

### Co-maintainers and roles

- **Tony Ketcham** — creator, primary maintainer, package owner on npm, ships the bulk of releases; author field in `package.json`.
- Community contributors via GitHub issues / PRs and the public Slack workspace linked from the README.

> NOTE TO REVIEWER: list any additional co-maintainers with write access here before submitting; if Tony is currently sole-write, say so plainly — funders read padded lists as a negative signal.

### How would you use API credits for your project?

Credits go straight into Codex-driven maintainer automation and the Effort Graph proof loop — not into open-ended R&D. Itemised below; full budget table in **Funding ask**.

1. **Codex-as-PR-reviewer on `FlatbreadLabs/flatbread`.** Wire Codex CLI into `pipeline.yml` so every PR gets: typed-config diff review, schema-impact summary, and an Effort/Plan link suggestion. Replaces ~6 hours/week of solo triage.
2. **Codex-as-release-engineer.** Automate changelog generation, version bumping (`scripts/bumpVersions.ts`), and pre-publish verification (`pnpm verify`) so package releases stop being a context-switch tax.
3. **Effort Graph evals harness.** Run Codex against synthetic Effort/Plan/Decision graphs to measure: reference-integrity catch rate, ID-normalization regressions, and watch-mode latency. Credits fund the eval calls and the regression replays.
4. **`@flatbread/proof` self-hosted DAGs for roadmap delivery.** Each near-term PMF item (typed config, ID normalization, relation validation, watch mode) is shipped as a Proof DAG of Codex subagents under maintainer review. Credits fund the subagent calls.
5. **Docs + cookbook generation.** Codex turns the existing PMF audit and Agent Artifact Opportunity doc into a navigable docs site with worked examples (`posts → authors → tags`, Effort Graph quickstart, MCP tool reference).

### Anything else you'd like us to know?

Three things.

**One — we are betting on Codex specifically, not "AI in general."** The Effort Graph’s value proposition is that durable typed artifacts make agent harnesses cheaper and more accurate over multi-week efforts. Codex CLI is the harness most aligned with that thesis (PR-shaped, terminal-native, rolling out into maintainer workflows). A grant here lets Flatbread be the reference relational substrate for Codex on real projects.

**Two — we already shipped the dog-food.** `@flatbread/proof` is in the public repo, used internally to plan and execute work on Flatbread itself, and runs against the Cursor SDK today. It is straightforward to add a Codex adapter; that is on the funded roadmap below.

**Three — the public story writes itself.** Maintainer (Tony Ketcham) shipping a typed git-native memory layer that Codex uses to review its own PRs is the "teams using Codex to power GitHub PR workflows" archetype OpenAI has already amplified. Public progress channels are listed in **How we'll publicly share progress**.

> NOTE TO REVIEWER: the live form may include an OpenAI Org ID field; if so, paste it here. The playbook flagged this as UNVERIFIED.

---

## Funding ask

The published award is **up to $25,000 in OpenAI API credits**, plus 6 months of ChatGPT Pro with Codex and conditional Codex Security access. We are requesting the full **$25,000 in API credits** plus the bundled ChatGPT Pro / Codex Security seats for the maintainer.

> NOTE TO REVIEWER: the playbook found no separate cash component for this fund. If a cash line is offered on the live form, request an additional **$15,000 USD** for maintainer time on the Effort Graph MVP and cite the budget table below. Otherwise leave cash at $0 and absorb maintainer time as in-kind.

### Budget table (12 months)

| Line item                                  | Allocation                  | Rationale                                                                                |
| ------------------------------------------ | --------------------------- | ---------------------------------------------------------------------------------------- |
| Maintainer time (Tony Ketcham)             | $0 cash / in-kind           | Absorbed unless a cash line is offered; tracked as Effort records in the graph.          |
| MCP server build-out (`flatbread-mcp`)     | ~$6,000 in credits          | Codex-driven scaffolding, tool-schema generation, evals against Effort Graph fixtures.   |
| Evals harness (relation integrity, IDs)    | ~$5,000 in credits          | Synthetic graphs + regression replays; Codex grades diffs against typed schemas.         |
| Codex PR-review + release automation       | ~$5,000 in credits          | Per-PR review calls, weekly release runs, triage summarization on issue backlog.         |
| Docs site + cookbook generation            | ~$4,000 in credits          | Codex generates worked examples, API references, migration notes from existing docs.    |
| Contributor sponsorship (paid via OSS Pay) | ~$5,000 in credits + ChatGPT Pro seats for top 2 outside contributors | Lowers the bus-factor concern and rewards real PR landings. |
| **Total**                                  | **~$25,000 in API credits** |                                                                                          |

> NOTE TO REVIEWER: confirm whether the fund permits redistributing ChatGPT Pro / Codex seats to non-maintainer contributors before promising sponsorship seats publicly.

---

## 12-month milestone roadmap

Aligned with the PMF audit near-term list and the Effort Graph MVP from `flatbread-agent-artifact-opportunity.md` (Posture C — recommended).

**Q1 (months 1–3) — Foundations the agent layer needs anyway.**

- Typed config: kill loose `any` surfaces in `packages/config`; generate config types from a single source.
- ID normalization: stable, comparable IDs across `core`, GraphQL args, and generated TS.
- First Codex-as-PR-reviewer integration landed in `pipeline.yml`.

**Q2 (months 4–6) — Integrity and dev loop.**

- Relation validation with diagnostics: missing targets, duplicate IDs, cardinality violations fail at load.
- Unified watch mode: edit `.md`/`.yaml`, schema rebuilds, types regenerate, examples hot-update.
- `@flatbread/proof` Codex adapter alongside the Cursor SDK runner.

**Q3 (months 7–9) — Effort Graph MVP.**

- Conventions preset: Effort, Plan, Decision, Session, Artifact, Run as first-class collections.
- Append API: safe, schema-validated writes from harnesses (no CMS, no UI).
- `flatbread-mcp` server: read + append tools exposed over MCP for Codex / Claude Code / Cursor.

**Q4 (months 10–12) — Adoption and evals.**

- Public eval harness comparing harness behaviour with vs without an Effort Graph (token spend, decision drift, cross-session recall).
- Docs site live; one canonical "posts → authors → tags" quickstart and one "Effort Graph for a real PR" walkthrough.
- v1.0 release of `flatbread` and `@flatbread/proof`.

---

## How we'll publicly share progress

- **Monthly public update** in `FlatbreadLabs/flatbread` Discussions, cross-posted to the Slack workspace linked from the README, with concrete diffs (typed-config %, validation errors caught, watch-mode latency).
- **Per-release notes** generated by the funded Codex release-engineer pipeline; CHANGELOG entries link back to the Effort that produced them.
- **One write-up per quarter** on the maintainer’s blog: what Codex shipped vs what the human shipped, with a real Effort Graph from the repo as the running example. OpenAI is welcome to amplify or reuse any of it.
- **Eval results published** in `funding-research/` and the docs site — including failure cases — so adopters can audit the integrity claims rather than trust the marketing.

---

## Why now / why us

The agent-artifact layer in 2026 has dense conventions (`AGENTS.md`, `SKILL.md`, `.handoff/`, `.GCC/`, vault MCPs) and almost no typed relational schema across them. Search and backlinks exist; reference integrity, stable cross-tool IDs, and predicate-rich queries do not. Flatbread already models collections, refs, and Mongo-style filters over markdown/YAML in git — the exact primitives the missing layer needs (`flatbread-agent-artifact-opportunity.md`, §5).

We are credible on execution, not just thesis. `@flatbread/proof` is a working Cursor-SDK DAG runner shipped in this same monorepo (`packages/proof`); it decomposes work into subagents, runs them in topological order, and writes a live canvas — Flatbread already eats its own dog food on agentic workflows. The maintainer (Tony Ketcham) authors the packages, runs the releases, and wrote both the PMF audit and the Effort Graph opportunity memo. The roadmap above is not aspiration; the near-term items are already on the public PMF audit and the proof package is already on npm.

What an OpenAI Open Source Fund grant unlocks is **time compression**: Codex doing the maintainer toil (PR review, releases, eval grading, docs) so the human can ship the Effort Graph MVP and the MCP server in 12 months instead of 24. That is the bet — typed git-native memory for Codex-driven work, written by a maintainer who is already doing it in public.
