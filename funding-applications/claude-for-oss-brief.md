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
- **What:** Flatbread — *eat your relational markdown data and query it, too, with GraphQL inside damn near any framework* (`README.md`). A pnpm monorepo turning `.md`/YAML on disk into a typed, relational graph for sites and, increasingly, coding agents.
- **License:** MIT (`package.json`); published to npm; Node `>=20.19`; `packageManager` pnpm 10.33.0.
- **Traction:** Public CI (`.github/workflows/pipeline.yml`); shipped `@flatbread/proof` Cursor-SDK DAG runner; live `examples/nextjs` and `examples/sveltekit`; written PMF audit (`flatbread-flow-pmf-audit.md`) and agent-artifact thesis (`flatbread-agent-artifact-opportunity.md`).
- **Ask:** Per-maintainer **6-month Claude Max 20x** seat (~$200/mo, ~$1,200 grant) to power agent-loop development on `@flatbread/proof` and the forthcoming MCP surface.

## Eligibility checklist

| Criterion (per playbook) | Evidence | Location |
|---|---|---|
| Public repo, OSI-style license | MIT in `package.json` | `package.json` (root) |
| Named maintainer with merge access | Tony Ketcham, sole author/maintainer | `package.json` author field, `CONTRIBUTING.md` |
| Recent commit / PR / release activity (≤3 mo) | Active monorepo with published packages and PMF audit dated 2026 | repo history, `flatbread-flow-pmf-audit.md` |
| Stars / downloads threshold *or* Impact track write-up | Below 5k★/1M dl threshold today; submitting **Impact track** narrative on agent-artifact infrastructure | `flatbread-agent-artifact-opportunity.md` |
| Contributor onboarding | `CONTRIBUTING.md`; pnpm workspace; documented `examples/` | `CONTRIBUTING.md`, `pnpm-workspace.yaml`, `examples/` |
| Use-cases where Claude Max adds value | DAG runner + MCP eval harness (see below) | `packages/proof/`, this brief |

> NOTE TO REVIEWER: Playbook flagged "OSI-license + no commercial gatekeeping" as UNVERIFIED — only "public repo" is explicit on the intake. We meet MIT regardless. Stars/downloads thresholds are also UNVERIFIED; submitting through the Impact track is the conservative path.

## What we'd use Claude for

**Maintainer seats — Claude Max 20x (Claude Code + Opus/Sonnet/Haiku):** 1 seat for Tony today; up to 2 if a co-maintainer lands during the grant window. Used daily for monorepo refactors, codegen on `packages/codegen`, and authoring the MCP server in `packages/flatbread`.

**Claude API — `@flatbread/proof` DAG runner + agent-eval harness:**
- `@flatbread/proof` orchestrates Cursor-SDK subagents over a typed Effort/Plan/Decision/Artifact graph. We plan to add a Claude provider alongside the existing harness so the same DAG runs against Claude Sonnet/Opus.
- **Projected monthly token volume:** ~30–60M input + ~6–12M output tokens/month. Reasoning: ~20 DAG runs/week × ~10 nodes/run × ~30k input tokens (effort context + plan + relevant artifacts) + ~3k output tokens, plus a nightly eval sweep of ~200 fixtures × ~25k tokens. Sonnet-weighted with selective Opus on planning nodes.
- **MCP eval harness:** scripted runs against the MCP surface to verify reference integrity (broken `Plan→Decision` links, dangling `Artifact` refs) — adds ~5–10M tokens/month.

> NOTE TO REVIEWER: The playbook reads the offer as a *single fixed 6-month Max grant*; separate API credits are UNVERIFIED. If API credits are not in scope, the harness above runs on metered API spend and the Max seat covers maintainer-loop work only. We'd accept either shape.

## Why Claude specifically

- **MCP ecosystem participation.** Anthropic donated MCP to the Linux Foundation's Agentic AI Foundation; Flatbread's roadmap ships an **MCP surface** so coding agents (Claude Code first) can read/write the typed Effort Graph natively. We are building *for* MCP, not bolting it on.
- **Claude Code + Skills fit.** `@flatbread/proof` is a DAG runner for harnessed coding agents — the exact shape Claude Code Skills target. The artifact shipped today (`packages/proof`) is a concrete proof-of-concept.
- **Safety posture via typed integrity.** Our differentiator is *reference integrity for the agent-artifact layer*: typed schemas catch broken `Plan→Decision` and `Effort→Artifact` links before they cause context drift or silent regressions in long-running agent runs. This is a complement to RSP/ASL-style guardrails at the model layer.
- **Neutral plumbing, not a wrapper.** We're an integration layer that any harness (Claude Code, Cursor, Codex) can compose against — exactly the "neutral infrastructure" stance Anthropic has rewarded in prior recipients (Apache, PSF, MCP itself).

## Maintainer + roadmap

**Maintainer:** Tony Ketcham — sole author/maintainer, merge access, npm publisher. See `CONTRIBUTING.md` and `package.json` author field.

**12-month roadmap (aligned to `flatbread-flow-pmf-audit.md` + Effort Graph MVP):**
1. Typed `defineConfig` with full inference end-to-end.
2. ID normalization + relation validation across collections.
3. Watch mode parity with build mode for agent loops.
4. **MCP server in `packages/flatbread`** exposing read/write of Effort/Plan/Decision/Session/Artifact/Run.
5. **Effort Graph MVP** as a first-class collection set with reference-integrity checks.
6. Generated TS adapter parallel to GraphQL (per PMF audit pivot).
7. `@flatbread/proof` v1: Claude provider + multi-harness DAG runs.
8. Eval harness: regression suite over fixture Effort Graphs.
9. Docs site + Claude Code Skills examples.
10. Case study: Flatbread-on-Flatbread (dogfood the Effort Graph for our own roadmap).

## Public commitment

- **Case studies** on running a coding-agent roadmap through `@flatbread/proof` with Claude as the model provider.
- **MCP integration guide for Claude Code** — step-by-step on wiring the Flatbread MCP server into a Claude Code project.
- **Eval results** — public dashboard of reference-integrity regressions caught per release, published alongside `packages/proof` runs.
- Conference / blog talk on *git-native relational memory for coding agents*, crediting Claude for OSS.

## Form responses

- **Project name:** Flatbread
- **Repo URL:** https://github.com/FlatbreadLabs/flatbread
- **License:** MIT
- **Primary maintainer:** Tony Ketcham (GitHub handle on file in `package.json`)
- **Stars / downloads:** Below 5k★/1M dl thresholds — applying via **Impact track** with `flatbread-agent-artifact-opportunity.md` as the write-up.
- **Ask:** 6-month Claude Max 20x seat for the maintainer; API credits for the DAG runner + MCP eval harness if in scope.
- **Timeline:** Start within 2 weeks of approval; deliverables (MCP server, Claude provider in `@flatbread/proof`, public eval dashboard) within the 6-month grant window ending **June 30, 2026** if offer aligns to that cap.
- **Why Claude:** MCP-native roadmap, Claude Code Skills fit, typed integrity layer as a safety complement.

> NOTE TO REVIEWER: Exact intake form fields are UNVERIFIED — playbook lists likely fields (GitHub handle, repo URL, stars/dl, recent contributions, use-cases, Impact write-up). Adjust this section to match the actual form once accessed.
