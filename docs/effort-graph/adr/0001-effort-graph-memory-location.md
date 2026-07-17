# 0001 — Effort Graph memory location

Status: Accepted

## Context

The Effort Graph stores epistemic artifacts (Issues, Findings, Decisions, Constraints, Risks) as flat markdown files indexed by Flatbread. Where those files live relative to the project repo determines whether reasoning branches with the code, and whether reasoning survives when a speculative branch is abandoned.

Three modes were considered:

- **A. In-repo, branch-coupled** — files under `<project>/.flatbread-efforts/`. Reasoning branches with the code. Abandoned branch ⇒ abandoned reasoning.
- **B. In-repo with promote-on-close tooling** — same location, plus a helper that lifts artifacts onto the integration branch when an exploration closes. Requires a robust definition of "close a branch" across squash-merge, rebase-merge, PR-closed-unmerged, branch-deleted-then-resurrected.
- **C. Sibling repo / submodule** — memory has its own git history independent of project branches. Cross-branch reasoning loss disappears because memory commits to memory `main`.

A cross-branch `ref` mechanism (point a ref at reasoning on another branch) was rejected: refs must resolve at index time against a single on-disk tree; resolving across branches requires either mutating the working tree or a per-branch index (a source-plugin rewrite), breaks the self-contained-artifact review story, and makes staleness invisible on rebase/force-push/delete.

## Decision

Ship **mode A as the default**. Make the schema and write API **identical across all three modes** so that **mode C works by repointing `path` in `flatbread.config.ts`** with no code change; document mode C as the supported alternative for teams that abandon exploration often or span multiple repos.

**Defer mode B.** The promote-on-close ergonomics can be replaced day one by a documented `git cherry-pick <subdir>` + status-flip convention (`Decision: rejected_explored`, `Issue: wontfix`, `Finding: archived-from-exploration`). A `flatbread efforts promote-branch-artifacts` helper may land later.

## Consequences

- The default (A) accepts that reasoning on a never-merged branch is lost unless the team promotes it. This is acceptable because most efforts merge.
- Teams that care about preserving rejected exploration have two escape hatches without new platform code: cherry-pick promotion (still mode A) or mode C (config-only).
- The schema must not encode git internals (no `branch:`, no `git_ref:` field). Branching is emergent from git itself plus `Decision.state` and `derives_from` edges.
- Deferring B leaves a documented manual convention as the only path for promote-on-close until demand justifies the helper.
