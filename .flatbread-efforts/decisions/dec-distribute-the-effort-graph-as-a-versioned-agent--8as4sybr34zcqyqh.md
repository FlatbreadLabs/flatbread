---
id: dec-distribute-the-effort-graph-as-a-versioned-agent--8as4sybr34zcqyqh
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Distribute the Effort Graph as a versioned Agent Skill
state: accepted
created_at: '2026-07-18T23:55:43.863Z'
---

## Context

The original local skill taught monorepo-only commands and could not be
released as a consumer contract. A floating skill branch can also drift from a
separately versioned runtime.

## Decision

`@flatbread/effort-graph` owns canonical skill assets under
`packages/effort-graph/skills/`; `.agents/skills/` is a generated,
byte-identical local projection for dogfooding and discovery. Deterministic
sync, watch, CI, and package-payload verification detect projection or
publication drift.

Consumers install a canonical skill from an immutable `v<flatbread-version>`
tag. Its checked-in release manifest binds the tag to exact Flatbread and
Effort Graph versions. The first-activation flow supports npm, pnpm, Yarn,
and Bun; bootstrap reports requirements and verifies reviewed configuration
edits rather than rewriting a project silently.

## Consequences

The monorepo uses the same skill payload that consumers receive. Releases tie
runtime, manifest, package payload, and git tag to one committed identity.
Session recall starts with bounded active-Effort discovery, followed by
scoped reads; it does not depend on GraphQL being the product surface.
