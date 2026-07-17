# ADR-0008: Committed-generation bridge

Status: Accepted

## Context

ADR-0003 requires the writer to expose a monotonic generation token and an
opt-in strict read. ADR-0004 requires generation publication only after
reindex and live schema swap. Both halves existed (the journal protocol and
the live reloader), but the wire between them did not: `.journal/generation.json`
could advance while `LiveSchemaReloader.generation` never moved. Journal tokens
are durable per root; live generations are process-local across all content.
Equating their values is false after restart and whenever unrelated content
changes.

## Decision

The writer now uses `CommittedGenerationPublisher`, renamed from
`EffortGraphIndexer` to separate it from the plan-time `EffortGraphIndex`.
The live adapter maps relative paths to absolute paths, awaits
`notifyChanged({ source: 'writer' })`, and throws on rejected candidates. This
existing callback gate is the publish gate; the journal protocol is unchanged.
The bridge privately maps journal token J to live generation L, and strict
readers require both a live commit and durable publication, with an explicit
timeout escape hatch.

A disk-backed, journal-aware `ReindexBarrier` defers watcher paths named by
uncommitted intents, releases on the committed marker or rollback removal,
never waits on the reloader or publisher, fails closed on malformed intents,
and bounds its wait so an orphaned transaction cannot stall the serialized
reindex queue forever.

The Flatbread composition root activates on structural detection of the
complete six-entry `effortGraphContent(root)` shape (paths and refs), attaches
the bridge, attempts non-fatal boot recovery before listening, and exposes
`RunningGraphqlServer.effortGraph`. Flatbread takes a runtime workspace
dependency on effort-graph; effort-graph keeps core type-only, and core learns
no journal semantics.

## Consequences

A returned mutation token names a generation whose live schema commit already
completed, providing strict same-process read-your-writes. An out-of-process
writer publishes normally with the no-op publisher; the server watcher observes
its files after commit or rollback and those reads are EVENTUAL, not strict.
A dead external writer can defer intersecting watcher work until lease-safe
recovery; bounded barrier waits convert that to a logged rejected batch rather
than a stalled queue. The watcher may rebuild files the writer just published;
whole-file reads and serialization make that safe. This completes the
ADR-0003/0004 committed-generation contract.
