---
id: iss-loaded-saves-misplace-objects-the-tide-moved--4jy763bv4xn9j5eh
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Loaded saves misplace objects the tide moved
kind: defect
status: resolved
created_at: '2026-02-19T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - fnd-deltas-saved-at-low-tide-replay-wrongly-at-high--25b4vwytarw8ej50
resolved_by:
  - dec-save-player-changes-as-deltas-keyed-to-the-tide--1qxvc9985c8pzke8
---
Objects players moved in tide-dependent terrain reappear buried or shifted after a reload. Repro rate is 62% for saves taken at low tide.
