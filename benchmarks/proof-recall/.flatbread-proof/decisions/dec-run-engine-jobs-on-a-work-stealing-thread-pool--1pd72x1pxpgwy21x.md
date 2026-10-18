---
id: dec-run-engine-jobs-on-a-work-stealing-thread-pool--1pd72x1pxpgwy21x
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Run engine jobs on a work-stealing thread pool
state: superseded
created_at: '2025-09-10T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - fnd-fibers-hide-waits-but-need-custom-stacks-and-deb--0ynync38mj13w03k
  - iss-which-job-model-should-the-kestrel-scheduler-use--7ghtksxxrxcsxn3q
superseded_by:
  - dec-run-engine-jobs-on-a-work-stealing-thread-pool-w--8zpbcym92dkh87f1
---
Run one worker per hardware thread, minus one for the main thread. Jobs must not block: a job that needs data schedules a follow-up job instead of waiting. This keeps the scheduler small and debuggable for pre-production.
