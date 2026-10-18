---
id: dec-return-engine-jobs-to-a-thread-pool-with-continu--1zkc1v2x97taf50h
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Return engine jobs to a thread pool with continuation waits
state: superseded
created_at: '2026-04-14T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - fnd-41-of-alpha-crash-reports-have-no-usable-stack--35a50b07ferhf13m
  - fnd-a-thread-pool-with-continuation-waits-keeps-work--3nryg6kq6w7236ae
  - iss-crash-triage-stalls-because-fiber-stacks-are-unr--dyr12bpb18sav85g
supersedes:
  - dec-run-engine-jobs-on-fibers-and-pin-gull-scripts-t--rw28cbqfd07rd9te
superseded_by:
  - dec-run-engine-jobs-and-gull-scripts-on-one-thread-p--07pbzvqg00pmnrr3
---
Retire the fiber scheduler. Engine jobs run on a work-stealing thread pool again, one worker per hardware thread minus one. A job that must wait registers a continuation, and the scheduler runs the continuation when the read, decompression, or job it waits on completes.

Why now: 41% of alpha crash reports had no usable stack, crash triage is blocked for beta, and the continuation prototype keeps workers 93% busy during tide turns, close to the 95% fibers gave. Fibers bought two points of utilisation at the price of unreadable crashes and the Gull thread-local bug.

Migration: Kenji Arakawa converts the streaming and decompression waits first, then simulation. Each system keeps a wait wrapper during the move so both models can run in one build.

Gull keeps its two dedicated threads for now. Marta Lindqvist will measure whether Gull can rejoin the pool once no job ever changes threads mid-run.
