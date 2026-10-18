---
id: dec-raise-the-shader-cache-fetch-timeout-from-5-seco--4sgdf42ajyct6gt6
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Raise the shader cache fetch timeout from 5 seconds to 30 seconds
state: accepted
created_at: '2025-12-08T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - fnd-flaky-nightly-builds-trace-to-cache-server-fetch--v4wsxzj1x72zz8rs
---
A longer fetch timeout should ride out the 02:00 network peak. A fetch that takes 30 seconds is still faster than recompiling most permutations.
