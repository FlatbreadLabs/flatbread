---
id: fnd-pr-254-still-omitted-paging-only-has-more-map-an--hk8r9xfee39s64vc
effort: eff-proof-and-contributor-operating-system--ahhgtafvdhg4dfve
title: PR 254 still omitted paging-only has_more map and two tests
kind: gap
created_at: '2026-08-22T16:46:30.481Z'
derives_from:
  - eff-proof-and-contributor-operating-system--ahhgtafvdhg4dfve
superseded_by:
  - fnd-pr-254-completeness-review-asked-for-a-paging-on--r631nr0gnqp9sypt
cites:
  - cit-pr-254-grouped-review-22-aug--cpbe5anhpby3h625
---

The 22 Aug grouping review of PR 254 listed four open 19 Aug notes and one optional harden.

1. CHANGELOG advertised complete and cap_reasons but not that page.has_more is pagination-only.
2. Both reference.md copies still said narrow or page when a hard cap hit. Paging cannot clear displayed_edges.
3. The CLI page-only spawn checked has_more but not next_cursor, and skipped a null cursor on bytes plus summary co-list on relations.
4. Digest unit cases never set hasMore with a hard cap, so summary pagination plus a hard reason was unproven.
5. Optional: renderDigest could still emit has_more true with a null cursor if DigestInput was mis-paired.

None of these said the feature was wrong. They asked to say the Load more rule out loud and lock it.
