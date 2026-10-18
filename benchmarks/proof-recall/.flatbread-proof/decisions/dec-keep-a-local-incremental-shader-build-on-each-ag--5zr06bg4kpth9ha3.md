---
id: dec-keep-a-local-incremental-shader-build-on-each-ag--5zr06bg4kpth9ha3
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Keep a local incremental shader build on each agent
state: rejected
created_at: '2025-09-16T11:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - iss-how-should-the-farm-stop-recompiling-unchanged-s--b2kcgasfccnydkjp
rejected_by: dec-build-a-content-addressed-shader-compile-cache-s--e65rq9439k7xz5zh
---
Each agent keeps its own build directory and recompiles only what changed since its last job. Cheap to try, but jobs land on different agents each time, so Tomasz Brandt measured only a 19% local hit rate on a two-day trial.
