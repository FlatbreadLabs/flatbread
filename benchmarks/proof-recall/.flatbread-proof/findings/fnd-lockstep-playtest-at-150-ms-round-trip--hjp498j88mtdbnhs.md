---
id: fnd-lockstep-playtest-at-150-ms-round-trip--hjp498j88mtdbnhs
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: Lockstep playtest at 150 ms round trip
kind: measurement
created_at: '2025-11-12T15:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - con-co-op-must-stay-playable-at-150-ms-round-trip--q330d4g95q7jtt4q
  - dec-use-deterministic-lockstep-for-co-op--h0agvr5m0d8ndj72
---
Sofia Marchetti and Marta Lindqvist ran a four-player lockstep build on the Shoal-01 test map with 150 ms of injected round trip.

Setup:
- Two PC peers at 60 Hz, one Meridian devkit at 60 Hz, one Skiff devkit at 30 Hz.
- Ten minutes of traversal and one tide surge.
- Input delay fixed at 5 frames (75 ms at 60 Hz), the minimum that kept every peer fed.

What we saw:
- Marta Lindqvist rated traversal "mushy" from the first minute. Jumps across saltglass gaps landed late.
- Every peer ran at the speed of the slowest one. The Skiff devkit dropped frames during the tide surge and the whole session waited for it.
- Network traffic was tiny: 1.2 KB/s per peer.

The Skiff devkit stalled the whole session 41 times in 10 minutes. With a handheld in the group, lockstep would feel broken for all four players.
