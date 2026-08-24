---
id: con-packaged-proof-skill-markdown-must-not-contain-m--a9gse08fkv7zcrxq
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Packaged Proof skill markdown must not contain maintainer-only asides
kind: hard
created_at: '2026-08-24T03:18:48.880Z'
cites:
  - cit-pr-267-review-maintainer-asides-in-shipped-proof--2ftvd4ph0bh0erbr
---

Canonical skill files under packages/proof/skills are the bytes cloud and fresh agents Read. Those agents Read SKILL.md and setup.md before any pack, sync, or install script runs, so git bytes are shipped bytes. Maintainer-only asides (workspace dogfood, generated-projection instructions, pnpm skills:sync) must not appear in that markdown. skills:pack-check is the gate.
