---
id: fnd-a-thread-pool-with-continuation-waits-keeps-work--3nryg6kq6w7236ae
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: A thread pool with continuation waits keeps workers 93% busy
kind: measurement
created_at: '2026-04-02T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - fnd-priority-lanes-still-leave-workers-28-idle-durin--fhswesk5c086dk1y
  - iss-crash-triage-stalls-because-fiber-stacks-are-unr--dyr12bpb18sav85g
---
Kenji Arakawa prototyped a thread pool where a wait registers a continuation job instead of blocking. The read API now has completion callbacks, which it lacked in October. During a tide turn, workers are idle 7% of the time, against 28% for the lane pool and 5% for fibers. Every stack in a crash dump is a normal thread stack.
