---
id: rsk-a-bad-cache-entry-could-ship-broken-bytecode-to--9w76xhyz9xy8g5k5
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: A bad cache entry could ship broken bytecode to every build
state: mitigated
created_at: '2025-11-10T11:00:00Z'
created_by: Liam O'Connell
derives_from:
  - con-a-cache-hit-must-give-the-same-bytes-as-a-fresh--3gmcswztxzpmpz83
  - dec-fan-shader-cache-misses-out-to-every-farm-agent--pwrf9w720rf4hd27
mitigated_by: dec-recompile-a-1-in-50-sample-of-cache-hits-and-com--9n176hnc9w0tax3s
likelihood: low
severity: high
---
If an agent with a broken compiler install uploads bad output, every later build fetches it. One poisoned entry for the water shader would reach every platform build until someone noticed.
