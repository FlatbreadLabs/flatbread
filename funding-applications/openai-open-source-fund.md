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

Credits go straight into Codex-driven maintainer automation and three audacious bets stacked on top of the Effort Graph — not into open-ended R&D. Front half (~2 bullets) compresses foundations + Effort Graph MVP; back half (~5 bullets) funds workflow presets, HITL ergonomics around `@flatbread/proof` DAGs, and a continuous evals/research loop. Full budget table in **Funding ask**.

1. **Codex-driven foundation toil + Effort Graph MVP (Phase 1 + 2).** One umbrella PR train covers typed `defineConfig`, ID normalization, relation validation, and watch-mode parity, then ships the Conventions preset, Append API, and `flatbread-mcp` server. Codex-as-PR-reviewer wired into `pipeline.yml` (typed-config diff review, schema-impact summary, Effort/Plan link suggestion) and Codex-as-release-engineer (changelog, `scripts/bumpVersions.ts`, `pnpm verify`) absorb the per-PR and per-release calls. ~2 months of dense, bounded credit spend; everything downstream depends on it landing on time.
2. **`@flatbread/proof` self-hosted DAGs as the roadmap delivery vehicle.** Every Phase 3/4 deliverable ships as a Proof DAG of Codex subagents under maintainer review, writing back into Effort/Plan/Decision/Session/Artifact/Run. Credits fund subagent calls and golden-trace generation; the same DAG runs become Phase-4 eval fixtures, so the spend compounds.
3. **Workflow preset catalog for complex projects (Phase 3 — largest single line).** Six named, parameterized DAGs over the Effort Graph: `schema-cutover`, `release-train`, `research-compendium`, `docs-site-refactor`, `api-version-cutover`, `design-system-token-rotation`. Sized at ~10 build-out runs × ~12 nodes × ~25k input tokens per preset; Decision/Plan default to GPT-5-class, Artifact/Session default to Codex-mini. Drives **use-case coverage**; a seventh slot is held for a community-contributed preset by month 8.
4. **HITL ergonomics around `@flatbread/proof` DAGs (Phase 4 / bet B).** Approval API with first-class `needsApproval` boundaries, Claude-Code-style plan-review gate against the live Effort Graph, and LangGraph-style durable pause/resume keyed to a `thread_id` Session checkpoint. Credits fund per-node approval evals and the resume-correctness fixture suite that proves a paused DAG resumes days later without re-firing tool calls.
5. **Continuous-improvement evals + research loop — fixture growth (Phase 4 / bet C, part 1).** `fixture-promote` CLI turns any failing Proof trace into a versioned eval fixture; nightly sweeps replay the catalog against the Effort Graph it was authored from. Sized at ~200 promoted fixtures × ~30 nights × ~10k input tokens — the line item that makes the catalog self-improving rather than static.
6. **PR-time regression replay + public Inspect-View dashboard (bet C, part 2).** GitHub Action replays the eval catalog on every PR — failures block merge or open a Decision for HITL override. A public dashboard publishes reference-integrity catch rate, decision drift, and cross-session recall per release; eval-driven preset retuning feeds failure mining back into per-node model selection, retry budgets, and HITL thresholds.
7. **Docs / cookbook / contributor sponsorship.** One worked example per preset, an MCP cookbook against `flatbread-mcp`, and credit-share for the first two outside contributors landing a preset or a fixture pack. Modest line, real **community adoption** lever — the catalog is only credible once non-maintainers ship into it.

### Anything else you'd like us to know?

Three things.

**One — we are betting on Codex specifically, not "AI in general."** The Effort Graph’s value proposition is that durable typed artifacts make agent harnesses cheaper and more accurate over multi-week efforts. Codex CLI is the harness most aligned with that thesis (PR-shaped, terminal-native, rolling out into maintainer workflows). A grant here lets Flatbread be the reference relational substrate for Codex on real projects.

**Two — the grant unlocks three audacious bets stacked on top of the dog-food.** `@flatbread/proof` is already in the public repo, used internally to plan and execute work on Flatbread itself, and runs against the Cursor SDK today; the Codex adapter is on the funded roadmap. After the foundation toil and Effort Graph MVP land in Phases 1–2, the credits then fund (a) **workflow presets for complex projects** — six parameterized DAGs (`schema-cutover`, `release-train`, `research-compendium`, `docs-site-refactor`, `api-version-cutover`, `design-system-token-rotation`) over `@flatbread/proof` and the Effort Graph; (b) **HITL ergonomics** around those DAGs (approval API, Claude-Code-style plan-review gate, LangGraph-style durable pause/resume keyed to `thread_id` Session checkpoints); and (c) a **continuous evals + research loop** (`fixture-promote` CLI, PR-time regression-replay GitHub Action, public Inspect-View dashboard, eval-driven preset retuning). These are the bets the credits buy that maintainer-toil-only would not.

**Three — the public story writes itself: use-case coverage, community adoption, workflow capture.** Each of the six shipped presets is a beachhead for a real complex-project archetype (**use-case coverage**). A seventh community-contributed preset slot, the MCP cookbook, and credit-share for the first two outside contributors landing a preset or fixture pack seed **community adoption**. And every Proof DAG run produces a typed Effort/Plan/Decision/Session/Artifact/Run trail the next run reads — **workflow capture** as a first-class artifact rather than a side-effect. Maintainer (Tony Ketcham) shipping a typed git-native memory layer that Codex uses to review its own PRs is the "teams using Codex to power GitHub PR workflows" archetype OpenAI has already amplified. Public progress channels are listed in **How we'll publicly share progress**.

> NOTE TO REVIEWER: the live form may include an OpenAI Org ID field; if so, paste it here. The playbook flagged this as UNVERIFIED.

---

## Funding ask

The published award is **up to $25,000 in OpenAI API credits**, plus 6 months of ChatGPT Pro with Codex and conditional Codex Security access. We are requesting the full **$25,000 in API credits** plus the bundled ChatGPT Pro / Codex Security seats for the maintainer.

> NOTE TO REVIEWER: the playbook found no separate cash component for this fund. If a cash line is offered on the live form, request an additional **$15,000 USD** for maintainer time on the workflow presets catalog and HITL ergonomics surfaces (Phase 3 + 4 — the audacious bets the credits alone can't fully cover) and cite the budget table below. Otherwise leave cash at $0 and absorb maintainer time as in-kind.

### Budget table (12 months)

| Line item                                          | Allocation                  | Rationale                                                                                                              |
| -------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Foundation Codex toil (compressed)                 | $2,500 in credits           | Typed config, ID normalization, relation validation, watch mode — 2 months of dense PR review/codegen.                  |
| Effort Graph + `flatbread-mcp` server              | $3,000 in credits           | Conventions preset, append API, MCP tool scaffolding, fixture-backed integration tests.                                |
| Workflow preset DAGs (Phase 3 — largest line)      | $8,000 in credits           | Six presets × ~10 build-out DAG runs + golden-trace generation. The bet that drives use-case coverage.                  |
| HITL ergonomics surfaces                           | $3,500 in credits           | Approval API, plan-review gate, durable pause/resume; UI scaffolding + resume-correctness fixtures.                    |
| Evals + continuous-improvement loop                | $5,000 in credits           | Nightly sweeps, fixture-promotion CLI, PR-time regression replay, public dashboard, eval-driven preset retuning.       |
| Docs / cookbook / contributor sponsorship          | $3,000 in credits + ChatGPT Pro seats for top 2 outside contributors | Worked examples per preset, MCP cookbook, credit-share for the first two outside contributors landing a preset or fixture pack. |
| **Total**                                          | **$25,000 in API credits**  |                                                                                                                        |

> NOTE TO REVIEWER: confirm whether the fund permits redistributing ChatGPT Pro / Codex seats to non-maintainer contributors before promising sponsorship seats publicly.

---

## 12-month milestone roadmap

Four phases, not quarters. Front half (months 1–4) compresses foundations + Effort Graph MVP; back half (months 5–12) ships three compounding bets: **workflow presets → HITL ergonomics → continuous-improvement evals loop**.

### Phase 1 (months 1–2) — Foundations, compressed

Front-loaded onto Codex/Claude toil; human review only. Four items ship under one umbrella PR train.

- **Typed `defineConfig` with end-to-end inference.** Codex-as-PR-reviewer drafts type-erasure removals in `packages/config`; maintainer reviews/merges.
- **ID normalization across `core`, GraphQL args, generated TS.** Claude Code Skill scaffolds, Codex shards per-collection PRs, maintainer adjudicates edges.
- **Relation validation with diagnostics.** Stub failing-fixture promotion (Phase 4) so future broken refs land as cases; Codex drafts diagnostic copy.
- **Watch-mode parity with build mode.** `@flatbread/proof` reuses watch events; Codex drafts the watcher refactor, maintainer reviews concurrency.

### Phase 2 (months 3–4) — Effort Graph MVP, compressed

Three deliverables, one quickstart ("Effort Graph for a real PR").

- **Conventions preset.** Effort, Plan, Decision, Session, Artifact, Run as first-class collections with reference-integrity checks; codegen produces the typed read API.
- **Append API.** Schema-validated writes from harnesses, no CMS, no UI. The same validators that catch broken refs at load now reject malformed appends.
- **`flatbread-mcp` server.** Read + append tools exposed over MCP for Codex, Claude Code, and Cursor against the same Effort Graph schema.

### Phase 3 (months 5–8) — Audacious bet A: Workflow Presets for Complex Projects

Six shipped presets, each a parameterized DAG composed with the Effort Graph and run through `@flatbread/proof`. Decision/Plan default to Opus / GPT-5-class; Artifact/Session default to Sonnet/Haiku/Codex-mini; all write back into Effort/Plan/Decision/Session/Artifact/Run.

- **`schema-cutover`** — old + new schema, codegen target. Decision → Plan → codegen + shard Artifacts → test Runs → HITL pre-merge.
- **`release-train`** — package graph + semver. Decision → changelog Plan → per-package Artifact → canary Sessions → HITL pre-publish.
- **`research-compendium`** — topic + sources. Outline Decision → section Plans → draft Sessions → cite-check Run → HITL.
- **`docs-site-refactor`** — IA tree + redirect map. Decision → page-level Plan → MDX Artifacts → broken-link Run → HITL.
- **`api-version-cutover`** — facade + traffic-shift schedule. Decision → migration Plan → adapter Artifacts → contract-test Run → HITL canary.
- **`design-system-token-rotation`** — token map + visual-regression budget. Decision → token Plan → component codemod Artifacts → snapshot Run → HITL.

A seventh slot is reserved for a community-contributed preset by month 8 to seed the contributor pipeline.

### Phase 4 (months 9–12) — Audacious bets B + C in parallel

Run B and C overlapping: each preset run produces both an HITL surface and an eval fixture, so they ship cheapest together.

**B. HITL ergonomics around `@flatbread/proof` + the Effort Graph**

- **Approval API.** First-class `needsApproval` boundary on every DAG node, surfaced through the MCP server and a thin web review pane.
- **Plan-review gate.** Mirrors Claude Code plan mode: Decision/Plan nodes pause, surface a diff-able markdown plan against the live Effort Graph, proceed only once a human signs the Decision.
- **Durable pause/resume.** LangGraph-style `interrupt()` keyed to a `thread_id` checkpoint, persisted as a Session record so a paused DAG resumes days later without re-firing tool calls.

**C. Continuous-improvement evals + research loop**

- **`fixture-promote` CLI.** Promotes any failing Proof DAG trace into a versioned eval fixture.
- **PR-time regression-replay GitHub Action.** Replays the catalog against the PR; failures block merge or open a Decision for HITL override.
- **Public eval dashboard.** Inspect-View-style; reference-integrity catch rate, decision drift, cross-session recall — published from the Effort Graph the evals run against.
- **Eval-driven preset tuning.** Failure mining feeds back into preset DAG defaults (per-node model selection, retry budgets, HITL thresholds) — the catalog becomes self-improving.

---

## How we'll publicly share progress

- **Monthly public update** in `FlatbreadLabs/flatbread` Discussions, cross-posted to the Slack workspace linked from the README, with concrete diffs (typed-config %, validation errors caught, watch-mode latency).
- **Per-release notes** generated by the funded Codex release-engineer pipeline; CHANGELOG entries link back to the Effort that produced them.
- **One write-up per quarter** on the maintainer’s blog: what Codex shipped vs what the human shipped, with a real Effort Graph from the repo as the running example. OpenAI is welcome to amplify or reuse any of it.
- **Eval results published** in `funding-research/` and the docs site — including failure cases — so adopters can audit the integrity claims rather than trust the marketing.
- **Public evals dashboard, refreshed quarterly** — Inspect-View-style regression results across the growing catalog of product-case fixtures (`schema-cutover`, `release-train`, `research-compendium`, `docs-site-refactor`, `api-version-cutover`, `design-system-token-rotation`, plus community-contributed presets), so the catalog's failure-and-recovery curve is visible to adopters and amplifiers in one place.

---

## Why now / why us

The agent-artifact layer in 2026 has dense conventions (`AGENTS.md`, `SKILL.md`, `.handoff/`, `.GCC/`, vault MCPs) and almost no typed relational schema across them. Flatbread already models collections, refs, and Mongo-style filters over markdown/YAML in git, and `@flatbread/proof` already runs DAGs of subagents against that graph — shipped in this same monorepo (`packages/proof`), used internally to plan and execute work on Flatbread itself. The missing unlock is not another harness or memory format — it is **workflow capture**: durable, parameterized presets for the specific shapes of complex work (schema cutovers, release trains, docs refactors, API cutovers, token rotations, research compendiums) that a coding agent picks up, hydrates from an Effort Graph, and resumes across sessions. The framing is the public Effort Graph opportunity memo (`flatbread-agent-artifact-opportunity.md`, §5, Posture C), built on the PMF-audit pivot.

Six named presets with HITL gates and a self-improving eval loop drive the three things this project most needs: **use-case coverage** (each preset is a beachhead for a real complex-project archetype), **community adoption** (contributors land their own presets and fixtures once the catalog is open), and **workflow capture** itself (every Proof DAG run is a typed Effort/Plan/Decision/Session/Artifact/Run trail the next run reads). A solo MIT maintainer — Tony Ketcham, who authors the packages, runs the releases, and wrote both the PMF audit and the opportunity memo — can ship this in twelve months only because Codex does the foundation toil up front and the eval loop tunes presets after. Funded agent toil turns a 24-month roadmap into a 12-month one; that is the bet, written by a maintainer who is already doing it in public.
