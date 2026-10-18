---
id: fnd-flaky-nightly-builds-trace-to-cache-server-fetch--v4wsxzj1x72zz8rs
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Flaky nightly builds trace to cache server fetch timeouts
kind: diagnosis
created_at: '2025-12-05T11:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - iss-nightly-builds-fail-about-1-in-9-runs-with-shade--ka2xgkfgaepemgbh
invalidated_by:
  - fnd-flaky-nightly-builds-are-compiler-processes-runn--1sabnpb1s7004jkb
---
The failed jobs all logged a cache fetch that took longer than the 5-second fetch timeout. The cache server's network card peaks at 94% during the 02:00 burst. Tomasz Brandt thinks the slow fetches cascade into job timeouts.
