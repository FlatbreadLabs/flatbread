---
id: dec-treat-page-has-more-as-pagination-only--dv24ta688adf262v
effort: eff-proof-and-contributor-operating-system--ahhgtafvdhg4dfve
title: Treat page.has_more as pagination-only
state: accepted
created_at: '2026-08-22T17:41:04.977Z'
derives_from:
  - fnd-pr-254-completeness-review-asked-for-a-paging-on--r631nr0gnqp9sypt
  - iss-pr-254-journal-used-issue-kind-on-a-finding-and--9p7t7amz79y5rn3b
supersedes:
  - dec-address-pr-254-review-as-five-disjoint-file-grou--bx44enbv52ztnrnn
---

Supersedes the prior Decision that named five file owners as the Choice. The file split is how the follow-up was split for review, not the rule that shipped.

Context: PR 254 already exposes complete and cap_reasons. The 22 Aug review asked to document that page.has_more is pagination-only, lock two missing tests, and optionally refuse hasMore without a cursor.

Choice: page.has_more means pagination only. Unpaired hasMore without a nextCursor is refused. Hard caps stay on complete and cap_reasons. Callers page only when page.has_more is true. They use cap_reasons and complete for walls.

Note: the follow-up locked that rule in five file groups: CHANGELOG, both reference.md copies, the CLI spawn, the digest unit, and renderDigest. That split is a working note, not the Choice.

Alternatives: keep the file-split Decision as the accepted record; skip the unpaired-cursor refuse. We kept the refuse because docs already call a null cursor an error.

Reversal: revert the follow-up. Digest cache rebuilds on the next read.
