---
id: dec-recompile-a-1-in-50-sample-of-cache-hits-and-com--9n176hnc9w0tax3s
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Recompile a 1-in-50 sample of cache hits and compare bytes
state: accepted
created_at: '2025-11-11T10:00:00Z'
created_by: Liam O'Connell
derives_from:
  - con-a-cache-hit-must-give-the-same-bytes-as-a-fresh--3gmcswztxzpmpz83
  - rsk-a-bad-cache-entry-could-ship-broken-bytecode-to--9w76xhyz9xy8g5k5
---
Each build recompiles 2% of its cache hits on an idle agent and compares bytes with the cached copy. A mismatch evicts the entry and fails the build loudly. This adds about 40 seconds to a build and should catch a poisoned entry within two or three builds.
