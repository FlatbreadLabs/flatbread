---
id: fnd-fibers-hide-waits-but-need-custom-stacks-and-deb--0ynync38mj13w03k
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Fibers hide waits but need custom stacks and debugger support
kind: survey
created_at: '2025-09-08T15:00:00Z'
created_by: Rhea Valdés
derives_from:
  - iss-which-job-model-should-the-kestrel-scheduler-use--7ghtksxxrxcsxn3q
---
Rhea Valdés surveyed two models. A work-stealing thread pool is simple and every debugger understands it, but a job that waits blocks its worker. Fibers let a job yield on a wait and resume later on any worker, but they need custom stack allocation, and the Meridian and Skiff debuggers show fiber stacks only through a vendor plug-in that is still in beta.
