---
id: dec-use-deterministic-lockstep-for-co-op--h0agvr5m0d8ndj72
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: Use deterministic lockstep for co-op
state: rejected
created_at: '2025-11-07T11:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - con-co-op-peers-must-agree-on-tide-state-bit-for-bit--4v0sdbc3t4ywzr3g
  - iss-how-should-co-op-keep-up-to-four-players-in-sync--92t2zfsy3etfzr89
rejected_by: dec-prototype-rollback-netcode-for-co-op--2tx2s2p3sfbwj8x4
---
Every peer waits for every other peer's input for a frame before simulating it. Simple and cheap on CPU, and determinism is already required for tides. The cost is input delay equal to half the round trip, and the slowest peer gates everyone.
