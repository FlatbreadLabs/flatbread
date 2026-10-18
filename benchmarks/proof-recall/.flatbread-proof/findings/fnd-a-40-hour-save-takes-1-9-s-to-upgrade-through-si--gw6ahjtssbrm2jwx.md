---
id: fnd-a-40-hour-save-takes-1-9-s-to-upgrade-through-si--gw6ahjtssbrm2jwx
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: A 40-hour save takes 1.9 s to upgrade through six steps
kind: measurement
created_at: '2026-07-20T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-stamp-each-save-with-a-schema-version-and-upgrad--nbg1h8g1bhn2ks8w
  - fnd-each-save-upgrade-step-costs-under-5-ms--qs1rweqqgj7kweem
invalidates:
  - fnd-each-save-upgrade-step-costs-under-5-ms--qs1rweqqgj7kweem
---
The 5 ms estimate came from a 2-hour save with a field rename. Real steps rewrite every delta, and a 40-hour save holds 35,400 of them. Upgrading such a save through the six steps written so far takes 1.9 s on Skiff, on top of the 2.9 s load.
