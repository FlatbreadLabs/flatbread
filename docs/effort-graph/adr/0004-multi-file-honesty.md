# 0004 — Multi-file honesty: edge authority and the atomicity boundary

Status: Accepted

## Context

ADR-0002 promised transaction semantics for multi-file mutations ("completes all writes or none") but deferred the mechanism; ADR-0003 deferred it again. Two sub-questions remained.

**Edge authority.** `CONTEXT.md` stores `supersedes`/`superseded_by` and `invalidates`/`invalidated_by` bidirectionally so any single record can answer "am I current?" in one access — a human opening the raw file in a PR or grep, without an index. Naively that makes every edge write a two-file transaction, since both directions are authoritative and a half-applied edge is corruption.

**Irreducibly multi-authoritative mutations.** Some mutations change authoritative state on several files even after edge authority is settled: `AcceptDecision(A)` sets A to `accepted` and its sibling `proposed` Decisions to `rejected` — each rejection is that file's own state, not derivable from A. Two atomicity boundaries were considered: **(a)** the git commit (writer stages and commits every mutation; a crash leaves a dirty tree that git recovers; bonus: free, high-fidelity evolution history of the reasoning graph — on-theme for a git-native product), and **(b)** a writer-level save-or-undo transaction independent of git.

## Decision

**Forward edges are canonical; back-edges are derived, materialized projections.** Only `supersedes` and `invalidates` carry authoritative intent. `superseded_by`/`invalidated_by` are mechanically determined projections that are still written to disk: the writer materializes both sides in the same save group, and the incremental reindexer validates and repairs any drift (hand edits, merge damage, crash residue). On conflict the forward edge wins; a reverse-only manual edit is non-authoritative and will be corrected, with a diagnostic naming the repaired file. "Derived" describes ownership and repair direction, not an optional disk cache — the raw file keeps its one-access honesty after convergence, preserving ADR-0001's self-contained-artifact review story.

**Writer-level save-or-undo is the default atomicity boundary; git commit is opt-in history, never correctness.** The writer implements a small write-ahead journal: fsync an intent record (transaction id, paths, before-images, target generation), apply each file via same-directory temp-file + rename, write a durable committed marker, then trigger one journal-aware incremental reindex batch; the generation token is published only after reindex and schema swap succeed. Startup recovery is idempotent: uncommitted journal ⇒ roll back; committed journal ⇒ complete and reindex. A per-graph writer lock serializes concurrent writers (two agents in a proof DAG fail/retry rather than interleave).

The opt-in git mode creates one isolated memory commit per successful mutation using a dedicated temporary index (never touching the user's staged work), and runs only **after** the journal transaction commits. If the commit fails, the mutation stands — report "committed locally, history commit unavailable"; never roll back a committed semantic mutation to preserve git symmetry.

**The "free reasoning history" of (a) is recovered by session-level checkpoints, not per-mutation commits.** The writer records a session/transaction id and touched paths; `flatbread efforts checkpoint` creates one deliberate commit for a session's coherent reasoning evolution, and `@flatbread/proof` may checkpoint at successful DAG completion — never per node. Per-mutation commits in mode A would interleave dozens of tiny memory commits with code history, complicate rebase/squash, and let agents commit without being asked; mode C (sibling repo) softens those costs and may document a checkpoint-on-session profile, but does not change the default.

## Consequences

- Forward-authoritative edges shrink the true multi-authoritative set to lifecycle transitions (sibling rejection, issue resolution), keeping the journal small and simple.
- The transactional guarantee covers the writer API and the indexed read contract. Raw-disk readers can observe a partially applied group mid-rename; between a hand edit and reindex a file's back-edge may be stale. Both windows are bounded by the journal protocol and reindex repair, and are recorded as the honest limit of file-level atomicity.
- The reindexer must recognize active journals and defer affected paths, so the watch seam (ADR-0003) cannot validate a half-applied group. Reindex write-back of repaired back-edges uses the same journaled write path as mutations.
- Generation-token semantics tighten: a generation is not "committed" until back-edge projection repair and the live schema swap complete; strict reads (ADR-0003) wait on committed generations only.
- Merge resolution gets a deterministic rule: reconcile forward edges, regenerate reverse projections. Reverse-edge fields are canonicalized (sorted, dedicated frontmatter keys) to minimize conflict noise; a repair command must exist.
- `CONTEXT.md`'s edge-vocabulary language changes from "stored bidirectionally" to "forward edge canonical, back-edge materialized projection."
- Reversal criteria: 6.i reverses only if raw-file readers demonstrably require atomic cross-file edge visibility without writer/indexer involvement; 6.ii reverses only if dogfooding shows teams want every reasoning transition independently cherry-pickable and per-mutation commits stay low-friction under rebases and concurrent agents.
