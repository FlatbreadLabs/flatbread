---
id: dec-effort-get-digests-always-include-the-full-recor--xs7rnbha3zx8qdj9
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: effort get digests always include the full record body
state: accepted
created_at: '2026-07-19T03:44:51.061Z'
derives_from:
  - dec-route-agent-reads-through-the-flatbread-query-en--476qb9qk878yfg62
  - fnd-getrecord-digests-call-the-same-excerpt-as-brows--q5rbnhpxc697x2dv
  - iss-agents-cannot-obtain-full-record-bodies-through--ekfpcg6hrkwgy287
---

## Context

Browse digests must stay excerpted for the bounded status-briefing budget. Agents still need a reliable zoom-in path for complete Decision (and other) bodies without opening `.flatbread-efforts/**/*.md` for normal recall. The accepted read-routing Decision already promised full bodies via single-record lookup; digests did not deliver it.

## Decision

`flatbread effort get` digests always render the full primary record body via the existing ReadEnvelope + cached digest at `artifact_path`. Browse reads (`list`, `records`, `relations`, `blocking-decisions`) remain excerpted at 600 chars / 12 lines. Agent zoom-in is: Shell JSON → Read/grep the get digest. Digest-level caps (64 KiB) still apply; an oversized body fails closed with a byte-cap banner and `complete: false` — never a fake-full 600/12 excerpt.

## Alternatives considered

- **Opt-in `--full` flag:** Rejected — full body is the point of single-record lookup; an extra flag invites agents to keep missing context.
- **Inline full body in the JSON envelope:** Rejected — keep unrestricted content on the digest artifact path, not the machine surface.
- **Separate `effort body` / tmp-file command:** Rejected — unnecessary surface; get + artifact_path already exists.
- **Make list/records full-body:** Rejected — would blow the status-briefing token budget.

## Consequences

- Normal-sized `get` digests contain complete source bodies; agents should not open source markdown for zoom-in.
- Skill/reference must teach: when browse digests show `[…truncated]` and the body is needed, run `effort get` then Read that digest.
- Single-record lookup is now the real full-body path promised by dec-route-agent-reads-through-the-flatbread-query-en--476qb9qk878yfg62.
- Oversized bodies that exceed the digest byte cap surface a visible miss (source path in banner), not silent excerpting.

## Reversal criteria

Revisit if agents routinely need bodies larger than the digest byte cap, or if full-body get digests prove too large for the Read/grep workflow and a different artifact strategy is required.
