---
id: dec-save-player-changes-as-deltas-against-the-tide-f--n38scy1yaarsr8cw
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Save player changes as deltas against the tide-free baseline
state: superseded
created_at: '2025-12-05T11:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - fnd-a-full-world-snapshot-save-is-310-mb--2c7a78gjb54ygkj4
  - iss-how-should-save-games-store-the-changing-world--kpdhcdkax56a7b7d
superseded_by:
  - dec-save-player-changes-as-deltas-keyed-to-the-tide--1qxvc9985c8pzke8
invalidated_by:
  - fnd-deltas-saved-at-low-tide-replay-wrongly-at-high--25b4vwytarw8ej50
---
Save only what players changed, as deltas against the shipped world with the tide removed. Loading applies the deltas to the baseline, then runs the tide forward to the saved time. Saves shrink to a few hundred kilobytes.
