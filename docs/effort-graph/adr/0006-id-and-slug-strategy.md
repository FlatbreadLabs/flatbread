# 0006 — ID and slug strategy

Status: Accepted

## Context

Effort Graph records need refs that remain stable when files move, titles change, or multiple agents create records concurrently. Filenames are useful for review, but cannot safely serve as identity across branches.

## Decision

Use the ID format `<kind-prefix>-<kebab-slug>--<16 lowercase Crockford-base32 random chars>`. Prefixes are permanent and reserved: `eff` (Effort), `iss` (Issue), `fnd` (Finding), `dec` (Decision), `con` (Constraint), and `rsk` (Risk). For example: `dec-use-standalone-writer--r6dt3vp7k4m9q2x8`. The slug is capped at 48 characters.

The 80-bit random suffix makes concurrent creation by multiple agents, including agents on branches that later merge, effectively collision-free without coordination. The slug keeps refs reviewable in YAML frontmatter and PRs; the suffix makes same-title records safe; the prefix is a semantic type discriminator. ULID and UUIDv7 are rejected as visual noise. Recency comes only from the required explicit `created_at` field, never from an ID.

`id` is required frontmatter and the sole identity. Filename and path never participate in identity, so renames and moves preserve refs. The writer defaults the filename to the ID (`dec-use-standalone-writer--r6dt3vp7k4m9q2x8.md`), but a mismatch is advisory, not invalid.

Efforts also use hybrid IDs rather than pure human slugs. Pure slugs make similarly named Efforts created by uncoordinated agents a duplicate-ID merge failure. Efforts carry an editable `title` and may carry a unique human-facing `slug` alias for CLI lookup; renaming an Effort changes only its title or slug, never its ID or dependent refs.

The directory layout is collection-first and organizational only: `.flatbread-efforts/efforts/`, `issues/`, `findings/`, `decisions/`, `constraints/`, and `risks/`. Membership is expressed by the `effort: eff-…` ref, not by nesting under an effort directory, which would make Effort renames operationally noisy.

Refs remain scalar IDs. The mandatory kind prefix already encodes the target primitive type, so future union or multi-collection refs such as `invalidates: [dec-…, fnd-…]` can dispatch by prefix without rewriting stored frontmatter values. Reject `decision:dec-…` wrapper syntax: it duplicates the prefix and forces adapter work immediately.

## Consequences

- Union refs still require a core/config/schema migration because Flatbread `refs` config currently targets exactly one collection; this is a `flatbread-major-migration` concern, but requires no content migration.
- The six prefixes must be reserved and documented permanently.
- The promised GitHub issue for union/multi-collection refs remains unfiled (a repo search found none) and is a follow-up.
- The writer must validate ID shape and uniqueness at mutation time.
