---
id: rsk-delta-saves-may-outgrow-console-save-slots--8re48mgme427hzds
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Delta saves may outgrow console save slots
state: accepted
created_at: '2026-03-14T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-save-player-changes-as-deltas-keyed-to-the-tide--1qxvc9985c8pzke8
evidence:
  - fnd-delta-saves-reach-6-2-mb-after-40-hours--8g1j04z0vhjwrkyn
likelihood: medium
severity: low
---
Tide-keyed deltas never merge, because two changes at different tide phases cannot collapse into one. A long game could accumulate tens of thousands of deltas.
