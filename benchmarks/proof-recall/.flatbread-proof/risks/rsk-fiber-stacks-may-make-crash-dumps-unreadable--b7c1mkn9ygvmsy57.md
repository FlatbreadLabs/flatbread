---
id: rsk-fiber-stacks-may-make-crash-dumps-unreadable--b7c1mkn9ygvmsy57
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Fiber stacks may make crash dumps unreadable
state: realized
created_at: '2025-11-28T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - dec-move-engine-jobs-to-fibers--qjkgnm8cex8ydzfq
evidence:
  - fnd-41-of-alpha-crash-reports-have-no-usable-stack--35a50b07ferhf13m
likelihood: medium
severity: high
---
Crash dumps capture thread stacks. A crash inside a fiber shows the worker's scheduler frames, not the job's frames, unless the dump tool walks fiber stacks too. The console vendor plug-in for that is still in beta.
