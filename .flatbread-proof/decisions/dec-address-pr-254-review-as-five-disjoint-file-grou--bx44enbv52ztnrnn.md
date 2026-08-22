---
id: dec-address-pr-254-review-as-five-disjoint-file-grou--bx44enbv52ztnrnn
effort: eff-proof-and-contributor-operating-system--ahhgtafvdhg4dfve
title: Address PR 254 review as five disjoint file groups
state: superseded
created_at: '2026-08-22T16:46:40.750Z'
derives_from:
  - fnd-pr-254-still-omitted-paging-only-has-more-map-an--hk8r9xfee39s64vc
superseded_by:
  - dec-treat-page-has-more-as-pagination-only--dv24ta688adf262v
---

Context: PR 254 already exposes complete and cap_reasons. The 22 Aug review asked to document that page.has_more is pagination-only and to lock two missing tests, plus optional refuse of hasMore without a cursor.

Choice: one follow-up branch with five exclusive file owners.

1. CHANGELOG Unreleased now says page.has_more is pagination-only; use cap_reasons and complete for hard caps. primary_records stays an in-process signal after the CLI slice.
2. Both reference.md copies (source plus skills:sync) now say page only when page.has_more; hard caps that paging cannot clear mean narrow or fail closed.
3. CLI completeness spawn now asserts a non-null next_cursor on page-only list, a null cursor on bytes, and summary names displayed_edges and pagination together on relations.
4. Digest unit now covers displayed_edges plus hasMore/nextCursor, and refuses hasMore without a cursor.
5. renderDigest treats pagination as present only when hasMore is true and nextCursor is a non-empty string. It does not OR the 25-record wall back into has_more.

Alternatives: amend PR 254 in place; skip optional refuse. We kept the refuse because docs already call a null cursor an error.

Reversal: revert this follow-up. Digest cache rebuilds on the next read.
