---
id: dec-add-a-second-tide-harmonic-for-spring-and-neap-t--1c3s7dtyxvj70gvw
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Add a second tide harmonic for spring and neap tides
state: accepted
created_at: '2026-07-06T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-run-the-tide-simulation-in-32-32-fixed-point--c5rjfcnmhne4h05e
  - iss-tides-feel-identical-every-cycle--e8kc5aah7z7ff50z
---
Add a second harmonic with a period of seven 40-minute cycles to the fixed-point tide simulation. The tide state gains one more 32.32 phase value. The sine table is reused, so determinism holds.
