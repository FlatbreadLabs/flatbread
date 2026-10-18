---
id: fnd-priority-lanes-still-leave-workers-28-idle-durin--fhswesk5c086dk1y
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Priority lanes still leave workers 28% idle during tide turns
kind: measurement
created_at: '2025-11-18T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - dec-run-engine-jobs-on-a-work-stealing-thread-pool-w--8zpbcym92dkh87f1
  - fnd-streaming-jobs-block-workers-while-waiting-on-re--sn2bmfdgjeqwkk3p
---
During a tide turn the streaming lane gets 18 cell reloads at once. Both streaming workers block on reads, the lane backs up, and across the pool workers are idle 28% of the time while work waits. Adding streaming workers only moves the problem, because each new worker also blocks.
