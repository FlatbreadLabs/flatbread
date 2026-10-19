---
id: fnd-tide-band-cells-need-320-mb-resident-during-a-sp--0erj5eqw3ved35t0
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Tide-band cells need 320 MB resident during a spring tide turn
kind: measurement
created_at: '2026-07-10T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - con-streaming-pool-budget--kca88sgh2j6sxvd5
  - dec-add-a-second-tide-harmonic-for-spring-and-neap-t--1c3s7dtyxvj70gvw
---
With the second harmonic, a spring tide exposes up to 11 coastal cells at once. Keeping them resident through the turn needs 320 MB of the pool. Without a reservation, forecast eviction pushes out cells near the player to make room.
