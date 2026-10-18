---
id: fnd-each-save-upgrade-step-costs-under-5-ms--qs1rweqqgj7kweem
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Each save upgrade step costs under 5 ms
kind: measurement
created_at: '2026-03-11T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-save-player-changes-as-deltas-keyed-to-the-tide--1qxvc9985c8pzke8
invalidated_by:
  - fnd-a-40-hour-save-takes-1-9-s-to-upgrade-through-si--gw6ahjtssbrm2jwx
---
A prototype upgrade step that renames one delta field runs in 3 ms on a 2-hour test save. Marta Lindqvist expects every step to cost under 5 ms, so a chain of upgrades is free at load time.
