---
name: effort-modeling
description: Sharpen a project's vocabulary and planning through one-question-at-a-time grilling, then journal Decisions, Constraints, Findings, Issues, and Risks into the Flatbread Effort Graph. Use when a plan needs durable reasoning instead of ADRs.
disable-model-invocation: true
---

# Effort modeling

Use this discipline while a plan or design is being shaped. Store planning
records in the Effort Graph. Keep project terms in a glossary such as
`CONTEXT.md` or `docs/glossary.md`.

## Resume before asking

From the project root, use the `effort-graph` skill's bounded reads:

1. `flatbread effort list --status active`
2. For the relevant Effort, inspect open Issues and blocking Decisions.
3. Read a record or digest when a prior conclusion affects the question.

Look up facts in code instead of asking. Put decisions to the user; do not
answer them autonomously.

## During the grill

Ask one question at a time. Offer a recommendation, wait for the user's
answer, and resolve prerequisite choices before dependent ones.

- Challenge a term that conflicts with the glossary.
- Sharpen vague or overloaded terms.
- Use concrete edge cases to test relationships and scope.
- Compare a claim about behavior with the code and surface contradictions.
- Update the relevant project glossary when vocabulary resolves. Keep it free
  of implementation details and planning rationale.

## Journal the right speech act

Use `flatbread effort write` for the current Effort, following
[the Effort Graph reference](../effort-graph/reference.md):

- **Finding** — evidence about code, users, or runtime behavior.
- **Issue** — a question, defect, gap, or blocker needing attention.
- **Constraint** — a sticky hard or soft boundary.
- **Risk** — a prospective negative outcome with likelihood and severity.
- **Decision** — a proposed or accepted commitment among alternatives.

### Two kinds of links

Use these links for different purposes:

- **`cites`** — links a record to a **Citation** for an external URL,
  document, or saved source. Records never cite Blobs directly.
- **`derives_from`** — links a record to the Findings, Constraints, Risks,
  and Issues that informed it.

A Decision typically uses `derives_from` for project reasoning and `cites` for
outside sources.

### External evidence (URL or longform)

When a Finding, Issue, Decision, Constraint, or Risk rests on an external source,
create a Citation instead of copying the source into the record body:

1. **`WriteBlob`** — only when you need to save large or non-text content
   (markdown, JSON, an image, and so on).
2. **`WriteCitation`** — body is often the URL string; pass optional `blob` and
   `role` when needed.
3. **Create the record** — pass `cites: ["<cit-id>"]` when creating the
   Finding, Issue, Decision, Constraint, or Risk. You cannot add a citation
   later, so create the Citation first.

Record a Decision when it is hard to reverse, surprising without context, and
the result of a real trade-off. Create it as proposed while the user is still
deciding; call `AcceptDecision` only after they commit. Always pass
`"rejectSiblings": false` unless deliberately closing every competing proposal.

Use the long-form body template in [DECISION-BODY.md](./DECISION-BODY.md) when
the rationale would otherwise be lost. The body is the durable explanation;
do not create an ADR alongside it.

## Finish

Capture accepted Decisions, unresolved Issues, and material Findings before
ending the session. For an immediate verification read, use the generation
returned by the mutation with `--strict-min-generation`.
