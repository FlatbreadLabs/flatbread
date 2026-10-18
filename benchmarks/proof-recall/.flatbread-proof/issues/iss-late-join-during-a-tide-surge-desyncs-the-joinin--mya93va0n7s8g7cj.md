---
id: iss-late-join-during-a-tide-surge-desyncs-the-joinin--mya93va0n7s8g7cj
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: Late join during a tide surge desyncs the joining player
kind: defect
status: open
created_at: '2026-01-26T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - con-co-op-peers-must-agree-on-tide-state-bit-for-bit--4v0sdbc3t4ywzr3g
  - dec-prototype-rollback-netcode-for-co-op--2tx2s2p3sfbwj8x4
---
A player who joins while a surge is rising receives tide cells from a snapshot that is up to 7 frames old. In 6 of 20 tries the joiner saw a dry path the others saw flooded. Kenji Arakawa suspects the join snapshot skips cells that are still streaming in.
