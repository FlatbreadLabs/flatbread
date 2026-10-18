---
id: dec-run-engine-jobs-on-a-work-stealing-thread-pool-w--8zpbcym92dkh87f1
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Run engine jobs on a work-stealing thread pool with priority lanes
state: superseded
created_at: '2025-10-21T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - fnd-streaming-jobs-block-workers-while-waiting-on-re--sn2bmfdgjeqwkk3p
supersedes:
  - dec-run-engine-jobs-on-a-work-stealing-thread-pool--1pd72x1pxpgwy21x
superseded_by:
  - dec-move-engine-jobs-to-fibers--qjkgnm8cex8ydzfq
---
Keep the thread pool but split it into three lanes: frame-critical, streaming, and background. Waits are allowed only in the streaming lane, so a blocked read never delays a frame-critical job. Two workers serve the streaming lane on every platform.
