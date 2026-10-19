---
id: fnd-flaky-nightly-builds-are-compiler-processes-runn--1sabnpb1s7004jkb
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: >-
  Flaky nightly builds are compiler processes running out of memory on agents 7
  and 11
kind: diagnosis
created_at: '2026-02-24T09:00:00Z'
created_by: Liam O'Connell
derives_from:
  - dec-raise-the-shader-cache-fetch-timeout-from-5-seco--4sgdf42ajyct6gt6
  - iss-nightly-builds-fail-about-1-in-9-runs-with-shade--ka2xgkfgaepemgbh
invalidates:
  - fnd-flaky-nightly-builds-trace-to-cache-server-fetch--v4wsxzj1x72zz8rs
---
The 30-second fetch timeout did not help: 4 of the next 31 nightly builds still failed. Every failed job since December ran on agent 7 or agent 11, the two agents with 32 GB of RAM instead of 64 GB. During the 02:00 burst those agents run 16 parallel compiles, the compiler hits the memory limit, and the job hangs until it times out. The slow cache fetches were a symptom of swapping, not the cause.
