---
id: dec-prototype-rollback-netcode-for-co-op--2tx2s2p3sfbwj8x4
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: Prototype rollback netcode for co-op
state: superseded
created_at: '2025-11-07T10:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - con-co-op-must-stay-playable-at-150-ms-round-trip--q330d4g95q7jtt4q
  - con-co-op-peers-must-agree-on-tide-state-bit-for-bit--4v0sdbc3t4ywzr3g
  - iss-how-should-co-op-keep-up-to-four-players-in-sync--92t2zfsy3etfzr89
superseded_by:
  - dec-abandon-rollback-netcode-for-co-op--46envrg0v4pdwv7b
---
Each peer predicts remote inputs and simulates ahead. When a late input arrives, the peer restores a snapshot and re-simulates the frames since. Local input never waits on the network, which suits traversal and combat at 150 ms. The cost is re-simulation: everything in the snapshot must run again for every rolled-back frame.
