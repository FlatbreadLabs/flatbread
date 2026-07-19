---
id: dec-modernize-reachable-checks-before-replacing-tool--q7xpn1g7rk65xvzj
effort: eff-proof-and-contributor-operating-system--ahhgtafvdhg4dfve
title: Modernize reachable checks before replacing tooling
state: accepted
created_at: '2026-07-18T19:43:40.522Z'
---

## Context

Vitest suites were not reachable from the root test command, CI installs were
mutable, lint and typecheck coverage was incomplete, and the SvelteKit
integration job exercised the wrong example. Replacing the toolchain before
making existing checks reachable would add overlapping authority without
improving confidence.

## Decision

Make the existing AVA, Vitest, and Prettier stack deterministic and reachable
first: root tests build then run both test runners; CI uses frozen installs,
lint, typecheck, build, and tests; and SvelteKit integration builds SvelteKit.
Keep TypeScript modernization scoped to packages that need it.

Defer Biome and Oxc. Prettier remains the whole-repository Markdown/YAML
writer; framework ESLint boundaries stay intact. Revisit a Biome or Oxlint
pilot only after root lint ownership is explicit.

## Consequences

Follow-ups cover dormant root ESLint, AVA/Vitest convergence, monorepo
typecheck architecture, coverage thresholds, deprecated runtime dependencies,
unused workspace dependencies, and the remaining SvelteKit typing issue.
