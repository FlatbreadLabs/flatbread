# Long-form Decision bodies

Use this structure only when the decision needs durable rationale. Omit empty
sections; the title and body should stay readable in a source markdown file.

```md
## Context

What makes this decision necessary now?

## Decision

What are we committing to?

## Alternatives considered

- **Option:** Why it was not chosen.

## Consequences

What becomes easier, harder, required, or intentionally deferred?

## Reversal criteria

What evidence would justify revisiting this?
```

The body belongs to the Decision record. Cite related Findings, Constraints,
Risks, and Issues through `derives_from` when creating it.
