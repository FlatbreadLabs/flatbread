---
id: dec-save-player-changes-as-deltas-keyed-to-the-tide--1qxvc9985c8pzke8
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Save player changes as deltas keyed to the tide phase
state: accepted
created_at: '2026-02-24T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-run-the-tide-simulation-in-32-32-fixed-point--c5rjfcnmhne4h05e
  - fnd-deltas-saved-at-low-tide-replay-wrongly-at-high--25b4vwytarw8ej50
supersedes:
  - dec-save-player-changes-as-deltas-against-the-tide-f--n38scy1yaarsr8cw
---
Store each delta together with the 32.32 tide phase at which it was made. On load, the tide runs to each delta's phase before that delta applies, so a dig made at low tide lands in low-tide sand. Because the tide is deterministic, replaying to a phase gives the same terrain every time.
