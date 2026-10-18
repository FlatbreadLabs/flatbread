---
id: dec-cap-each-farm-agent-at-6-parallel-shader-compile--q5w4sfjm73tsj8x8
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Cap each farm agent at 6 parallel shader compile jobs
state: accepted
created_at: '2026-02-26T10:00:00Z'
created_by: Liam O'Connell
derives_from:
  - fnd-flaky-nightly-builds-are-compiler-processes-runn--1sabnpb1s7004jkb
---
The remote execution scheduler now caps every agent at 6 parallel shader compiles, whatever its core count. On agents 7 and 11 this keeps peak compiler memory under 26 GB. Cold builds get about 50 seconds slower; flaky failures should stop.
