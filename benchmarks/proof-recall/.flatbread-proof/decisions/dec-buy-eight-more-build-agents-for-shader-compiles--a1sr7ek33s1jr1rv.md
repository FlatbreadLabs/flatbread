---
id: dec-buy-eight-more-build-agents-for-shader-compiles--a1sr7ek33s1jr1rv
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Buy eight more build agents for shader compiles
state: rejected
created_at: '2025-09-16T10:30:00Z'
created_by: Dara Whitlock
derives_from:
  - iss-how-should-the-farm-stop-recompiling-unchanged-s--b2kcgasfccnydkjp
rejected_by: dec-build-a-content-addressed-shader-compile-cache-s--e65rq9439k7xz5zh
---
Twenty agents instead of 12 would cut a clean rebuild from 47 minutes to about 29. It is the simplest fix, but it scales cost with permutation count and breaks the 12-agent limit before alpha.
