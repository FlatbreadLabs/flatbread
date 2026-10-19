---
id: dec-move-engine-jobs-to-fibers--qjkgnm8cex8ydzfq
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Move engine jobs to fibers
state: superseded
created_at: '2025-11-26T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - fnd-fibers-hide-waits-but-need-custom-stacks-and-deb--0ynync38mj13w03k
  - fnd-priority-lanes-still-leave-workers-28-idle-durin--fhswesk5c086dk1y
supersedes:
  - dec-run-engine-jobs-on-a-work-stealing-thread-pool-w--8zpbcym92dkh87f1
superseded_by:
  - dec-run-engine-jobs-on-fibers-and-pin-gull-scripts-t--rw28cbqfd07rd9te
invalidated_by:
  - fnd-the-gull-vm-reads-thread-local-registers-after-f--1qser43b9j8ac5pf
---
Replace the thread pool with a fiber scheduler: 160 fibers with 64 KB stacks, run by one worker thread per hardware thread. A wait yields the fiber and the worker picks up other work. This is the model Kenji Arakawa proposed in September; the lane split showed that blocking waits cannot be scheduled away.
