---
id: iss-which-job-model-should-the-kestrel-scheduler-use--7ghtksxxrxcsxn3q
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Which job model should the Kestrel scheduler use?
kind: question
status: resolved
created_at: '2025-09-05T10:00:00Z'
created_by: Rhea Valdés
resolved_by:
  - dec-run-engine-jobs-on-a-work-stealing-thread-pool--1pd72x1pxpgwy21x
---
Every Kestrel system will run as jobs: simulation, streaming, decompression, Gull scripts, and render setup. We need to pick the execution model now, because changing it later touches every system that waits on another.
