---
id: iss-how-should-the-farm-stop-recompiling-unchanged-s--b2kcgasfccnydkjp
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: How should the farm stop recompiling unchanged shaders?
kind: question
status: resolved
created_at: '2025-09-15T09:30:00Z'
created_by: Liam O'Connell
derives_from:
  - con-the-build-farm-stays-at-12-agents-until-alpha--w7e1xfex9z2ycpx1
  - fnd-most-shader-compile-time-on-the-farm-repeats-ide--n7mr2yxxxtzpak35
resolved_by:
  - dec-build-a-content-addressed-shader-compile-cache-s--e65rq9439k7xz5zh
---
The baseline says most of the farm's shader work repeats. We need one approach to stop doing it. Options on the table: a shared content-addressed cache, more agents, or per-agent incremental builds.
