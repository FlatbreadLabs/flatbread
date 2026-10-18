---
id: iss-full-shader-rebuilds-take-47-minutes-on-the-buil--4bnh1e17snf5y3h6
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Full shader rebuilds take 47 minutes on the build farm
kind: gap
status: resolved
created_at: '2025-09-09T10:00:00Z'
created_by: Liam O'Connell
resolved_by:
  - dec-turn-the-shader-compile-cache-on-for-every-farm--4rr3b12b4sasdmaj
---
A clean rebuild of every Lantern shader permutation takes 47 minutes on the 12-agent farm. There are about 38,000 permutations today and Ines Okafor expects 50,000 by alpha. Yusuf Demir reports that a one-line change to the saltglass refraction shader blocks art iteration for most of an hour, because the farm recompiles every permutation that includes the shared lighting header.
