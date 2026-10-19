---
id: fnd-remote-execution-spreads-cache-misses-across-all--120mx6z98n6qfmwh
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Remote execution spreads cache misses across all 12 agents
kind: measurement
created_at: '2025-11-03T13:00:00Z'
created_by: Liam O'Connell
derives_from:
  - dec-build-a-content-addressed-shader-compile-cache-s--e65rq9439k7xz5zh
---
With the cache warm, a typical build still misses about 2,400 permutations. Compiled on the agent that started the job, those misses take 11 minutes. Fanned out to all 12 agents through remote execution, they take 1 minute 50 seconds, plus 25 seconds of scheduling overhead.
