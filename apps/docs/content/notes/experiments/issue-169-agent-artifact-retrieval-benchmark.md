# Experiment: Issue #169 — cold-start vs Flatbread-mediated artifact retrieval

## Question

Does a Flatbread-style Effort Graph retrieval surface reduce prompt/context
cost while preserving enough continuity to justify further MCP and agent-query
investment?

## Benchmark setup

Representative artifact set:

- `flatbread-agent-artifact-opportunity.md`
- `apps/docs/content/notes/experiments/issue-167-effort-graph-layout-mapping.md`
- `apps/docs/content/notes/experiments/issue-168-adversarial-multi-layout-schema.md`
- Effort Graph fixture rows under
  `apps/docs/content/notes/experiments/fixtures/cursor-proof-skill-effort-graph/`

Task prompt:

> For the PMF audit DAG effort, identify open blocking decisions and include
> linked plan/session context.

## Strategies compared

### A. Cold-start context stuffing

Stuff the full strategy/experiment history into context:

```text
flatbread-agent-artifact-opportunity.md
issue-167-effort-graph-layout-mapping.md
issue-168-adversarial-multi-layout-schema.md
```

Measured byte count:

```text
19,750 flatbread-agent-artifact-opportunity.md
 7,658 issue-167-effort-graph-layout-mapping.md
 9,693 issue-168-adversarial-multi-layout-schema.md
37,101 total bytes
```

### B. Flatbread-mediated Effort Graph retrieval

Retrieve only the blocking decision row plus linked plan/session rows:

```text
836 decisions/167-blocking-reference-layout.md
771 plans/flatbread-flow-pmf-audit-dag.md
618 sessions/proof-cli-session-20260508.md
2,225 total bytes
```

Representative query shape from #167:

```graphql
query BlockingDecisionsForEffort {
  allDecisions(
    filter: { effort: { eq: "pmf-audit-dag" }, blocking: { eq: true } }
    sortBy: "decided_at"
    order: DESC
  ) {
    id
    title
    status
    blocking
    plan {
      id
      title
      source_artifact
    }
    session {
      id
      runner
    }
  }
}
```

## Result

| Strategy                     | Approx. bytes retrieved | Continuity quality                                                 | Cost / noise                                  |
| ---------------------------- | ----------------------: | ------------------------------------------------------------------ | --------------------------------------------- |
| Cold-start stuffing          |                  37,101 | High context recall, but requires rereading broad strategy docs    | High: 16.7× larger than filtered rows         |
| Flatbread-mediated retrieval |                   2,225 | Enough for the target question: blocking decision + plan + session | Low: focused payload, less repeated discovery |

Filtered retrieval is roughly **94% smaller** for this task:

```text
1 - (2,225 / 37,101) ≈ 94.0%
```

## Continuity tradeoff

Flatbread-mediated retrieval answers the target question directly:

- **Decision:** issue #167 reference layout remains an open blocking gate.
- **Plan context:** linked PMF audit DAG plan/source artifact.
- **Session context:** proof CLI/session row describing the run surface.

What it loses:

- Broad market landscape and strategic rationale from the full artifact
  opportunity memo.
- Nuanced tensions from the adversarial schema report unless the query expands
  to include related artifacts.

That tradeoff is acceptable for "what is blocking this effort?" It is not
enough for "should Flatbread become an agent memory company?" without an
expanded query.

## Recommendation

**Keep / invest further.** The retrieval leverage is strong enough to justify
the next MCP/agent-query slice. A 94% smaller context payload with preserved
blocking decision continuity is exactly the kind of advantage the Effort Graph
opportunity needs.

## Follow-up issue drafts

### Follow-up: MCP query for blocking decisions by effort

**Acceptance criteria:**

- Tool accepts `effortId`.
- Returns blocking decisions with plan/session context.
- Uses Flatbread filters internally.
- Includes deterministic tests against the issue #167 fixture.

### Follow-up: Expand artifact retrieval benchmark

**Acceptance criteria:**

- Use at least one multi-session real effort, not only representative fixtures.
- Compare answer quality for at least three prompts:
  - blocking decisions;
  - why a product choice was made;
  - what to do next.
- Record token counts from an actual model/tool invocation.

### Follow-up: Related-artifact expansion policy

**Acceptance criteria:**

- Define when a decision query should pull source artifacts, plan body, or full
  strategy docs.
- Add max-depth and max-byte guardrails.
- Document recommended defaults for MCP calls.
