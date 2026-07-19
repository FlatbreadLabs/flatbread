---
id: dec-use-prefixed-random-ids-with-reviewable-slugs--xdg764ejat1kacd2
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Use prefixed random IDs with reviewable slugs
state: accepted
created_at: '2026-07-18T19:42:50.359Z'
derives_from:
  - dec-canonical-forward-edges-and-journaled-save-or-un--sv9x93svkfz4a98r
---

## Context

Record references must survive title changes, renames, moves, and concurrent
creation on branches that later merge. Filenames need to remain reviewable but
cannot safely define identity.

## Decision

Use `<kind-prefix>-<kebab-slug>--<16 lowercase Crockford-base32 characters>`.
The permanent prefixes are `eff`, `iss`, `fnd`, `dec`, `con`, and `rsk`; slugs
are capped at 48 characters. The 80-bit random suffix makes uncoordinated
creation effectively collision-free, while prefix and slug keep references
readable. `created_at`, not the identifier, expresses recency.

`id` is required frontmatter and is the sole identity. The writer normally
names a file after the ID, but filename/path mismatches are advisory. Efforts
may have an editable title and human-facing slug alias without changing their
ID. Collection-first directories organize files; `effort` refs define
membership.

## Alternatives considered

ULIDs and UUIDv7s were rejected as noisier identifiers. Pure human slugs were
rejected because similarly named efforts created concurrently become merge
conflicts. Typed wrapper refs such as `decision:dec-…` duplicate the prefix
and add adapter work.

## Consequences

The prefixes are permanently reserved and mutation-time validation enforces ID
shape and uniqueness. A future union-reference migration can dispatch on the
prefix without rewriting stored IDs, although Flatbread's collection-ref model
will still need its own schema migration.
