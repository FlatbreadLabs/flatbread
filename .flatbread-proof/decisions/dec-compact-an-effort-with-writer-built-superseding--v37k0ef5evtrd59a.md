---
id: dec-compact-an-effort-with-writer-built-superseding--v37k0ef5evtrd59a
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: 'Compact an Effort with writer-built, superseding compaction records'
state: accepted
created_at: '2026-10-17T08:50:35.230Z'
derives_from:
  - dec-route-agent-reads-through-the-flatbread-query-en--476qb9qk878yfg62
  - fnd-filtered-retrieval-is-94-percent-smaller--qpvz4vch5hygye20
---

## Context

An agent that resumes an Effort reads its live records to learn where the work
stands. The largest Effort in this repository holds 49 records, about 63 KB of
Markdown, and one `records` read cannot show them all: the page cap is 25.
Agents need one short, current account of an Effort that never hides the
records behind it, so they can still question any Decision it reports.

## Decision

1. A compaction is a Finding with `kind: compaction`. Only the new
   `WriteCompaction` mutation creates one; `WriteFinding` rejects that kind.
2. The writer, not the agent, stores the compaction's `covers` snapshot: one
   `<id>@<standing>` entry for every live record in the Effort and for each
   `derives_from` target. A standing is the record's state or status, or
   `live`, `superseded`, or `invalidated`.
3. Each compaction supersedes every current head compaction. Compactions never
   `derive_from` one another. `derives_from` holds at most 10 ids: the records
   the body's sentences rest on.
4. The body is a complete account written from the live records, never a diff
   on the previous compaction.
5. A new read, `proof brief <effortId>`, prints the head compaction in full,
   older compactions as one-line checkpoints, and each record whose standing
   changed since `covers` was taken. It marks the compaction stale when a
   `derives_from` target changed standing, and asks for a new compaction after
   5 changes. Reads never print `covers` itself.
6. Supersede when the live set or a claim changes. Edit the body by hand only
   to fix wording, or while the branch is unmerged.
7. A compaction restates other records, so the write gate's unique-signal test
   does not apply to it. The other three tests still do.

## Alternatives considered

- **Generate the summary when someone reads:** rejected. The read-routing
  Decision keeps model output out of the read path, and generated text can be
  neither cached nor checked.
- **Accept natural-language queries inside Proof:** rejected. The calling
  agent is already a language model; it maps a prompt onto the fixed reads.
- **Chain compactions through `derives_from`:** rejected. An old compaction is
  an earlier version, not evidence. Summaries of summaries compound errors and
  make the model read the same claims many times.
- **Link every record ever written:** rejected. Each id costs about 75 bytes
  per read, and the list would grow with the Effort.
- **Use the journal generation as the watermark:** rejected. The journal is
  gitignored, so each clone counts generations separately. A `covers`
  snapshot travels with the record through Git.
- **Edit one compaction in place:** rejected. No mutation updates
  frontmatter, and hand edits do not advance the generation.

## Consequences

Proof gains an 18th mutation and a 6th read, beyond the five reads the
read-routing Decision named. A Git merge can leave two head compactions;
`brief` reports the fork, and the next `WriteCompaction` supersedes both.

## Reversal criteria

Revisit if agents answer questions about an Effort no better from `brief`
than from filtered `records` reads, or if `covers` grows large enough to slow
writes.
