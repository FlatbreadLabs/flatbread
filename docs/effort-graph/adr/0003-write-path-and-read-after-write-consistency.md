# 0003 — Write-path architecture and read-after-write consistency

Status: Accepted

## Context

ADR-0002 adopted a semantic-mutation write surface (β). Flatbread today is read-only and in-memory: `FlatbreadProvider` (`packages/core/src/providers/base.ts`) builds the GraphQL schema once at construction and exposes only `query()`. There is no `Mutation` type in `packages/core` and no write-back. The filesystem is the source of truth; the GraphQL graph is a projection built once. Live reload is explicitly unsupported today ([issue #65](https://github.com/FlatbreadLabs/flatbread/issues/65); `docs/positioning.md`).

Two write-path architectures were considered:

- **(1) Mutations inside core's GraphQL.** Add a `Mutation` type and resolvers that write files; the provider gains `mutate()`. Forces an in-process cache-coherence subsystem (every successful write must patch/invalidate the cached `EntryNode` graph or the next `query()` is stale) into core, which it does not have today.
- **(2) Standalone writer + read-only GraphQL.** A separate library owns the Zod mutation schemas, file expansion, and transaction semantics, and writes the source-of-truth files directly. The GraphQL read layer stays read-only and re-projects from disk.

A separate question is the **read-after-write consistency model**: tool-call-boundary re-index (write returns touched ids/paths; next read re-indexes) vs instantaneous in-process read-after-write.

## Decision

Adopt **architecture (2): a standalone semantic writer; GraphQL stays read-only.** Mutation logic (validation, multi-file expansion, transactions) lives outside core's resolver layer, consistent with Flatbread's existing files-are-source-of-truth model. A thin GraphQL mutation _facade_ that delegates to the writer may land later, but GraphQL mutations are not the home of the logic.

Adopt **live-reindex (watch mode) as a v1 dependency** for the consistency model, satisfied by implementing the **"Draft unified watch design"** already specified in `docs/local-dev-loop.md` (reload records → re-run ID/ref/cardinality validation → rebuild schema → hot-swap the live schema only if the new graph validates, else keep the prior schema and log).

### Consistency contract (v1)

The in-memory graph that reads are served from is rebuilt after a write; there is a brief window between "file saved" and "rebuild complete." During that window a read does not block and never returns a torn/half-built graph, but a _concurrent_ reader may observe the prior graph (briefly out of date, never wrong-shaped). The window widens with corpus size because rebuilds are full today. The contract that bounds this:

1. **Read-your-own-writes (mandatory).** A mutation's return payload includes the written/changed artifacts, so the writing agent never re-queries to see its own write. This removes the window entirely for single-agent write-then-read, which is the dominant case.
2. **Default eventual, opt-in strict for concurrent readers (Q7.i → Option 1).** A second, concurrent reader may be a beat behind by default. When a workflow cannot tolerate this (e.g. a downstream `@flatbread/proof` task that must observe an upstream task's writes), the reader opts into a strong read that waits until the index has caught up to the depended-on write before answering. **This relaxed-by-default behavior, and how to request a strict read, must be called out in user-facing documentation when implemented.**
3. **Incremental reindex (v1 dependency, Q7.ii → Option A).** Because the writer knows exactly which files it touched, reindex re-reads only the changed files plus their ref-affected neighbors and patches the in-memory graph, instead of rebuilding the whole graph. This keeps the staleness window small regardless of corpus size (thousands+ of memories) and pairs with retiring the per-resolver `cloneDeep(contentNodesByCollection[...])` cost in `packages/core/src/generators/schema.ts`.

## Consequences

- The Effort Graph spec now has a **hard dependency on shipping the unified watch / live schema-swap seam** in Flatbread, **including incremental (changed-files-only) reindex**. This is scoped (a documented design contract and an existing codegen watch loop to factor from), not greenfield, but it is on the critical path and must be sequenced before the write story is considered done.
- Writes cannot destabilize core's read path, since transactional file-writing lives in a separate package.
- The writer must return the ids and file paths it touched, both for read-your-own-writes payloads and so the incremental reindex layer can refresh exactly the affected collections.
- A reader opting into a strict read needs a way to name the write generation it depends on; the writer must therefore expose a monotonic generation/version token in its return payload.
- Transaction/rollback semantics for multi-file mutations remain to be specified (see follow-up).
- If the watch seam slips, the fallback is tool-call-boundary re-index (read shim re-indexes affected collections per invocation); this is a degraded mode, not the target.
