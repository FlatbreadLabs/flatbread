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

The body belongs to the Decision record. Wire epistemic upstream through
`derives_from` when creating it — the Findings, Constraints, Risks, and Issues
this Decision responds to or weighs.

For external evidence (URLs, docs, longform captures), do not paste the source
into the body. Use `WriteBlob` when the payload is longform, then
`WriteCitation`, then pass `cites: ["<cit-id>"]` on the Decision create.
