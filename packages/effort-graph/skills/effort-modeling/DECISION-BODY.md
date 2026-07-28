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

The body belongs to the Decision record. When creating it, use
`derives_from` to link the Findings, Constraints, Risks, and Issues the
Decision responds to or weighs.

For external evidence (URLs, documents, or saved content), do not paste the
source into the body. If needed, save the content with `WriteBlob`, then
create a `WriteCitation`, then pass `cites: ["<cit-id>"]` when creating the
Decision.
