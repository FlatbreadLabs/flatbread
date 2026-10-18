---
id: fnd-most-shader-compile-time-on-the-farm-repeats-ide--n7mr2yxxxtzpak35
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Most shader compile time on the farm repeats identical work
kind: measurement
created_at: '2025-09-12T14:00:00Z'
created_by: Liam O'Connell
derives_from:
  - iss-full-shader-rebuilds-take-47-minutes-on-the-buil--4bnh1e17snf5y3h6
---
Liam O'Connell hashed the compiled output of every permutation over five days of nightly and on-demand builds (61 builds). 61% of permutation compiles produced bytecode identical to the previous build of the same permutation. Another 22% changed only because an unrelated define moved in a shared header. A cache keyed on the right inputs could have skipped roughly 29 of the 47 minutes on an average build.
