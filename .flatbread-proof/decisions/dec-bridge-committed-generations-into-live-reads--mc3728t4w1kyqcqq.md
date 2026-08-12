---
id: dec-bridge-committed-generations-into-live-reads--mc3728t4w1kyqcqq
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Bridge committed generations into live reads
state: accepted
created_at: '2026-07-18T19:43:15.357Z'
derives_from:
  - dec-canonical-forward-edges-and-journaled-save-or-un--sv9x93svkfz4a98r
---

## Context

The writer's journal generation is durable per graph root, while live schema
generations are process-local and also advance for unrelated content. Treating
them as the same counter produces false strict-read guarantees after restart
or ordinary reloads.

## Decision

Use `CommittedGenerationPublisher` as the publish gate. It maps changed paths,
awaits the live reloader's accepted schema candidate, and privately associates
durable journal token J with live generation L. Publish J only after both the
journal transaction and live schema commit succeed; strict readers require the
durable publication and live commit, with a bounded timeout.

A disk-backed, journal-aware `ReindexBarrier` defers paths named by
uncommitted journal intents, releases after commit or rollback, fails closed
for malformed intent, and bounds its wait so an orphaned transaction cannot
stall the reindex queue.

## Consequences

A same-process mutation token supports strict read-your-writes. An
out-of-process writer uses the no-op publisher, so a server watcher sees its
files eventually rather than claiming strictness. The composition root detects
the complete Effort Graph content shape, attaches the bridge, performs
non-fatal recovery before listening, and keeps journal mechanics out of core.
