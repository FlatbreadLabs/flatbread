---
id: fnd-gull-s-two-dedicated-threads-sit-idle-70-of-each--qekr5vjr9pand9rs
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Gull's two dedicated threads sit idle 70% of each frame
kind: measurement
created_at: '2026-06-18T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-return-engine-jobs-to-a-thread-pool-with-continu--1zkc1v2x97taf50h
---
On the beta build the two Gull threads are busy only 30% of the frame on Meridian and 34% on Skiff, while the job pool is saturated during tide turns. With fibers gone, a Gull job never resumes on another thread, so the thread-local problem no longer applies.
