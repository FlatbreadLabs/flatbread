---
id: dec-treat-page-has-more-as-pagination-only--dv24ta688adf262v
effort: eff-proof-and-contributor-operating-system--ahhgtafvdhg4dfve
title: Treat page.has_more as pagination-only
state: accepted
created_at: '2026-08-22T17:41:04.977Z'
---

Context: A Proof read can be incomplete because another page exists or because the digest hit a hard cap. Treating both cases as page.has_more tells callers to page when no cursor can recover the omitted data.

Choice: page.has_more means that another cursor-backed page exists. An input with hasMore: true and no non-empty nextCursor is refused. Hard caps appear through complete and cap_reasons; callers narrow the query or fail closed.

Alternatives: Mark every incomplete read as page.has_more, or allow has_more without a cursor. Both options blur recoverable pagination with terminal truncation and can make callers retry a page that cannot help.

Consequences: The JSON envelope, digest header, and summary share one distinction. Callers page only with a cursor and treat hard caps as walls.

Reversal: Revisit this split only if every incomplete read gains one safe recovery action.
