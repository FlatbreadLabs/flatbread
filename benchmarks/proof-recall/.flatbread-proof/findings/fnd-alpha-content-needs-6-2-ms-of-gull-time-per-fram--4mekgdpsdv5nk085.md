---
id: fnd-alpha-content-needs-6-2-ms-of-gull-time-per-fram--4mekgdpsdv5nk085
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Alpha content needs 6.2 ms of Gull time per frame
kind: measurement
created_at: '2026-01-14T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - con-gull-script-tick-budget--4p9jp4dj1njf7q9m
  - dec-keep-gull-on-the-tree-walking-interpreter--br1kgzfmw57xmm9m
---
Alpha content has 1,200 crabs, tide-pool creatures, and 40 quest scripts. On Meridian the interpreter needs 6.2 ms per frame, three times the 2.0 ms budget. Time-slicing makes crabs visibly stutter.
