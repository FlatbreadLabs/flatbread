---
id: dec-run-engine-jobs-and-gull-scripts-on-one-thread-p--07pbzvqg00pmnrr3
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Run engine jobs and Gull scripts on one thread pool with continuation waits
state: accepted
created_at: '2026-06-24T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - fnd-gull-s-two-dedicated-threads-sit-idle-70-of-each--qekr5vjr9pand9rs
supersedes:
  - dec-return-engine-jobs-to-a-thread-pool-with-continu--1zkc1v2x97taf50h
---
Fold Gull back into the job thread pool. Gull scripts become ordinary jobs; a script wait registers a continuation like any other job. The two dedicated Gull threads are removed. A Gull job is never moved between threads mid-run, which keeps the VM's thread-local state valid.
