---
id: dec-use-a-4-frame-rollback-window--pqe4hvbgmbp0dmh9
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: Use a 4-frame rollback window
state: superseded
created_at: '2025-11-20T10:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - dec-prototype-rollback-netcode-for-co-op--2tx2s2p3sfbwj8x4
  - fnd-rollback-re-simulates-a-4-frame-window-in-1-1-ms--xa30a1cez2brphyf
superseded_by:
  - dec-use-a-7-frame-rollback-window--ewptan6y616adtfw
---
Roll back at most 4 frames (67 ms at 60 Hz). Inputs later than that stall the peer. At 1.1 ms per full rollback this costs almost nothing, and covers same-region play.
