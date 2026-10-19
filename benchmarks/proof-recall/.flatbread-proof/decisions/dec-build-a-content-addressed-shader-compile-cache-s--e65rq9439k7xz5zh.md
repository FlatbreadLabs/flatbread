---
id: dec-build-a-content-addressed-shader-compile-cache-s--e65rq9439k7xz5zh
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Build a content-addressed shader compile cache shared by all farm agents
state: accepted
created_at: '2025-09-16T10:00:00Z'
created_by: Liam O'Connell
derives_from:
  - fnd-most-shader-compile-time-on-the-farm-repeats-ide--n7mr2yxxxtzpak35
  - iss-how-should-the-farm-stop-recompiling-unchanged-s--b2kcgasfccnydkjp
---
Store each compiled permutation on the shared volume under a hash of its inputs. Any agent that needs a permutation fetches it if the hash exists, and compiles and uploads it if not. This attacks the 61% of repeat work directly and needs no new hardware. The hard part is the key: a key that misses an input ships stale bytecode, and a key that over-includes gets no hits.
