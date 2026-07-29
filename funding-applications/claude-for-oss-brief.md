---
program: Claude for Open Source
program_url: https://claude.com/contact-sales/claude-for-oss
applicant: Tony Ketcham
project: Flatbread
license: MIT
repo_url: https://github.com/FlatbreadLabs/flatbread
status: draft
last_updated: 2026-05-09
---

# Flatbread — Claude for Open Source brief

## Project at a glance
- **What:** Flatbread — *eat your relational markdown data and query it, too, with GraphQL* (`README.md`). A pnpm monorepo turning `.md`/YAML on disk into a typed relational graph for sites and coding agents.
- **License:** MIT; published to npm; Node `>=20.19`; pnpm 10.33.0.
- **Traction:** Public CI; `@flatbread/proof` DAG runner; live `examples/nextjs` + `examples/sveltekit`; PMF audit + agent-artifact thesis.
- **Ask:** Per-maintainer **6-month Claude Max 20x** seat (~$200/mo, ~$1,200 grant) — powers maintainer IDE work *and* a continuously-running eval + preset-DAG harness on `@flatbread/proof`, not just the IDE loop.

## Eligibility checklist

| Criterion (per playbook) | Evidence | Location |
|---|---|---|
| Public repo, OSI-style license | MIT in `package.json` | `package.json` (root) |
| Named maintainer with merge access | Tony Ketcham, sole author/maintainer | `package.json` author field, `CONTRIBUTING.md` |
| Recent commit / PR / release activity (≤3 mo) | Active monorepo with published packages and PMF audit dated 2026 | repo history, `flatbread-flow-pmf-audit.md` |
| Stars / downloads threshold *or* Impact track write-up | Below 5k★/1M dl threshold today; submitting **Impact track** narrative on agent-artifact infrastructure | `flatbread-agent-artifact-opportunity.md` |
| Contributor onboarding | `CONTRIBUTING.md`; pnpm workspace; documented `examples/` | `CONTRIBUTING.md`, `pnpm-workspace.yaml`, `examples/` |
| Use-cases where Claude Max adds value | DAG runner + MCP eval harness (see below) | `packages/proof/`, this brief |

> NOTE TO REVIEWER: OSI-license + commercial-gatekeeping and stars/dl thresholds are UNVERIFIED on intake; we meet MIT regardless and submit via Impact track.

## What we'd use Claude for

**Maintainer seat — Claude Max 20x:** 1 seat for Tony today, up to 2 if a co-maintainer lands during the grant window. Daily use covers monorepo refactors, `packages/codegen`, and authoring the MCP server in `packages/flatbread`.

**Claude API — three back-half workloads on `@flatbread/proof`:**
- **Workflow preset DAGs for complex projects.** Six parameterized presets (Phase 3 names them) + a 7th community slot — each a beachhead for a complex-project archetype, driving **use-case coverage** a single harness benchmark can't.
- **HITL approval API around `@flatbread/proof`.** `needsApproval` on every node, Claude-Code-style plan-review gate on Decision/Plan, LangGraph-style durable pause/resume keyed to a `thread_id` Session checkpoint.
- **Continuous-improvement evals with public dashboard.** `fixture-promote` CLI + PR-time regression-replay GH Action; failures retune per-node models, retry budgets, and HITL thresholds so the catalog self-tunes.
- **Projected monthly token volume:** ~**80–160M input + ~16–32M output tokens/month**, ~**2–3× the prior 30–60M / 6–12M estimate** because eval and preset DAGs run continuously, not only during maintainer sessions. Arithmetic: 5 presets × ~8 runs/wk × ~12 nodes × ~25k input ≈ **52M/mo**; + ~200 fixtures × ~10k × ~30 nights ≈ **60M/mo** (regression replay); + ~5M HITL → ~115M steady state, ~160M as the catalog grows. Output ≈ 20% of input. Sonnet/Haiku-weighted, selective Opus on Decision/Plan.

> NOTE TO REVIEWER: Separate API credits are UNVERIFIED — playbook reads offer as a 6-month Max grant only. If credits are out of scope, the workloads above run on metered spend; we'd accept either shape.

## Why Claude specifically

- **MCP ecosystem participation.** Anthropic donated MCP to the Linux Foundation; we ship an **MCP surface** so Claude Code reads/writes the typed Effort Graph natively — built *for* MCP, not bolted on.
- **Claude Code + Skills fit.** `@flatbread/proof` is a DAG runner for harnessed coding agents — the shape Claude Code Skills target; `packages/proof` ships today.
- **Safety posture via typed integrity.** Typed schemas catch broken `Plan→Decision` and `Effort→Artifact` links before they cause context drift in long-running agents — a complement to RSP/ASL-style guardrails at the model layer.
- **Neutral plumbing, not a wrapper.** Any harness (Claude Code, Cursor, Codex) can compose against the Effort Graph — the "neutral infrastructure" stance Anthropic has rewarded before (Apache, PSF, MCP itself).
- **Funder-aligned audacious bets.** Anthropic's posture on HITL (Claude Code plan mode, MCP `needsApproval`) and evals (Inspect, evals-as-research) maps directly onto Phase 4 — built *on top of* patterns Anthropic already endorses.

## Maintainer + roadmap

**Maintainer:** Tony Ketcham — sole author, merge access, npm publisher.

**12-month roadmap — 4 phases, not quarters.** Front half (months 1–4) compresses foundations + Effort Graph MVP under a Codex/Claude PR train; back half (months 5–12) ships three compounding audacious bets.

**Phase 1 (months 1–2) — Foundations, compressed.** Typed `defineConfig` with end-to-end inference; ID normalization across `core`, GraphQL args, generated TS; relation validation; watch-mode parity — one umbrella PR train.

**Phase 2 (months 3–4) — Effort Graph MVP.** Conventions preset (Effort, Plan, Decision, Session, Artifact, Run with reference-integrity checks); schema-validated Append API; `flatbread-mcp` server exposing read + append over MCP for Claude Code, Cursor, Codex.

**Phase 3 (months 5–8) — Audacious bet A: Workflow Presets.** Six shipped presets — `schema-cutover`, `release-train`, `research-compendium`, `docs-site-refactor`, `api-version-cutover`, `design-system-token-rotation` — each a parameterized DAG over the Effort Graph + `@flatbread/proof`. A 7th slot reserved for a community-contributed preset by month 8 to seed **community adoption**.

**Phase 4 (months 9–12) — Audacious bets B + C in parallel.** **B. HITL ergonomics**: approval API with `needsApproval` on every node, Claude-Code-style plan-review gate on Decision/Plan, LangGraph-style durable pause/resume persisted as a Session. **C. Continuous-improvement evals**: `fixture-promote` CLI; PR-time regression-replay GH Action; public Inspect-View-style dashboard; eval-driven preset retuning — closing the **workflow capture** loop: every Proof DAG run is a typed Effort/Plan/Decision/Session/Artifact/Run trail the next reads.

## Public commitment

- **Case studies** on a coding-agent roadmap run through `@flatbread/proof` with Claude.
- **MCP integration guide for Claude Code** — wiring the Flatbread MCP server into a Claude Code project.
- **Public Inspect-View-style evals dashboard.** Reference-integrity catch rate, decision drift, cross-session recall — published continuously from the Effort Graph the evals run against, as open data for any Claude Code user.
- **Open-source workflow preset gallery.** All six preset DAGs + the 7th community slot shipped under MIT — any Claude Code user can drop a `schema-cutover` or `release-train` into their own project directly.
- Conference / blog talk on *git-native relational memory for coding agents*, crediting Claude for OSS.

## Form responses

- **Project name:** Flatbread
- **Repo URL:** https://github.com/FlatbreadLabs/flatbread
- **License:** MIT
- **Primary maintainer:** Tony Ketcham
- **Stars / downloads:** Below 5k★/1M dl thresholds — applying via **Impact track** with `flatbread-agent-artifact-opportunity.md` as the write-up.
- **Ask:** 6-month Claude Max 20x seat; API credits for the preset/HITL/evals workloads if in scope.
- **Timeline:** Start within 2 weeks of approval; deliverables (MCP server, Claude provider in `@flatbread/proof`, public eval dashboard, preset gallery) within the 6-month grant window.
- **Why Claude:** MCP-native roadmap, Claude Code Skills fit, typed integrity as safety complement, HITL/evals aligned with Anthropic's posture.

> NOTE TO REVIEWER: Exact intake form fields are UNVERIFIED.
