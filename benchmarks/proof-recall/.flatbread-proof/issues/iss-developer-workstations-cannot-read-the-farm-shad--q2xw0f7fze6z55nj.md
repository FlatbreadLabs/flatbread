---
id: iss-developer-workstations-cannot-read-the-farm-shad--q2xw0f7fze6z55nj
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Developer workstations cannot read the farm shader cache
kind: gap
status: deferred
created_at: '2026-03-09T09:00:00Z'
created_by: Yusuf Demir
derives_from:
  - dec-build-a-content-addressed-shader-compile-cache-s--e65rq9439k7xz5zh
resolved_by:
  - fnd-retrospective-on-the-shader-compile-cache--9rpv2a60ach04cx6
---
Only farm agents can reach the cache volume. A developer workstation still compiles every shader locally, about 22 minutes after a fresh sync. Opening read access needs a VPN change and a cache proxy.
