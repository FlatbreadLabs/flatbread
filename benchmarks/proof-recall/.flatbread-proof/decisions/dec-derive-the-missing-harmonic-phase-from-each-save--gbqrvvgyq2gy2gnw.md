---
id: dec-derive-the-missing-harmonic-phase-from-each-save--gbqrvvgyq2gy2gnw
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Derive the missing harmonic phase from each save's world clock
state: proposed
created_at: '2026-07-17T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-stamp-each-save-with-a-schema-version-and-upgrad--nbg1h8g1bhn2ks8w
  - iss-beta-saves-lack-the-second-tide-harmonic-s-phase--gmhrjdy35pjfq651
---
Add an upgrade step that computes the second harmonic's phase from the save's world clock, as if the harmonic had always existed, and replays each delta against the two-harmonic tide. Deltas made on a sand bar that the new tide never exposes are dropped and listed in the save log.
