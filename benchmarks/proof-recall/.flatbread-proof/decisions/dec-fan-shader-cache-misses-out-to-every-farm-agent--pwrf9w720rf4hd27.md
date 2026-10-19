---
id: dec-fan-shader-cache-misses-out-to-every-farm-agent--pwrf9w720rf4hd27
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Fan shader cache misses out to every farm agent through remote execution
state: accepted
created_at: '2025-11-04T10:00:00Z'
created_by: Liam O'Connell
derives_from:
  - con-the-build-farm-stays-at-12-agents-until-alpha--w7e1xfex9z2ycpx1
  - fnd-remote-execution-spreads-cache-misses-across-all--120mx6z98n6qfmwh
---
Every shader compile that misses the cache becomes a remote job any idle agent can take. Results upload to the cache, so the next build hits. This keeps us inside the 12-agent limit while making a cold build tolerable.
