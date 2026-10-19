---
id: fnd-rollback-re-simulates-a-4-frame-window-in-1-1-ms--xa30a1cez2brphyf
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: Rollback re-simulates a 4-frame window in 1.1 ms on PC
kind: measurement
created_at: '2025-11-18T14:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - dec-prototype-rollback-netcode-for-co-op--2tx2s2p3sfbwj8x4
invalidated_by:
  - fnd-re-running-tides-every-rollback-frame-costs-4-8--tp4gxe8prh0bh9h4
---
First rollback prototype on Shoal-01, PC, four players. Restoring a snapshot and re-simulating 4 frames takes 1.1 ms in total. Sofia Marchetti calls this cheap enough to grow the window later. Caveat: the tide simulation was frozen for this run, because it was not yet in the snapshot.
