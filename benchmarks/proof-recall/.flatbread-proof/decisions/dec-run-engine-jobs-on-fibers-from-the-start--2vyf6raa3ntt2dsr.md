---
id: dec-run-engine-jobs-on-fibers-from-the-start--2vyf6raa3ntt2dsr
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Run engine jobs on fibers from the start
state: rejected
created_at: '2025-09-10T10:30:00Z'
created_by: Kenji Arakawa
derives_from:
  - fnd-fibers-hide-waits-but-need-custom-stacks-and-deb--0ynync38mj13w03k
  - iss-which-job-model-should-the-kestrel-scheduler-use--7ghtksxxrxcsxn3q
rejected_by: dec-run-engine-jobs-on-a-work-stealing-thread-pool--1pd72x1pxpgwy21x
---
Kenji Arakawa proposes fibers from day one. Streaming code is full of waits on I/O and decompression, and rewriting those as follow-up jobs is error-prone. Fibers make a wait a yield.
