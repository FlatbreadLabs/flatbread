---
id: dec-use-host-authoritative-sync-for-co-op--17hqrmtja7pn98d6
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: Use host-authoritative sync for co-op
state: accepted
created_at: '2026-04-02T10:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - con-co-op-must-stay-playable-at-150-ms-round-trip--q330d4g95q7jtt4q
  - dec-abandon-rollback-netcode-for-co-op--46envrg0v4pdwv7b
  - fnd-host-authoritative-spike-keeps-tides-off-the-cli--dp9vx6afks514js6
  - iss-how-should-co-op-keep-up-to-four-players-in-sync--92t2zfsy3etfzr89
---
The host runs the only tide simulation and the only physics for shared objects. Clients send inputs and render the host's state with local prediction for their own player. Nothing re-runs tides, so the 4.8 ms cost disappears. Clients see corrections on tide edges at their round trip; Marta Lindqvist will tune how those corrections blend. The snapshot send rate is not chosen yet.
