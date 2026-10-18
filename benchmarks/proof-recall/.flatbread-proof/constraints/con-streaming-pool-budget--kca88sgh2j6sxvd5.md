---
id: con-streaming-pool-budget--kca88sgh2j6sxvd5
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Streaming pool budget
kind: hard
created_at: '2026-06-04T11:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - fnd-ports-cut-the-skiff-memory-total-and-streaming-m--1p8b10ttb07jkznx
supersedes:
  - con-streaming-pool-budget--632bkbs79bwj4cr5
superseded_by:
  - con-streaming-pool-budget--8czwb4fjr5p5vpy7
---
The streaming pool may use at most 1.6 GB on every platform, down from 2.0 GB. The reason is the ports Constraint "Skiff memory budget", which fell from 9 GB to 8 GB when Skiff became a launch platform; streaming's share of that cut is 400 MB. One budget for all platforms keeps content tuning in one place, so PC and Meridian take the same 1.6 GB.

How the 400 MB comes back: Kenji Arakawa lowers texture mip residency in the outer ring, compacts audio banks per cell, and drops navigation detail for cells the player cannot reach until the tide falls.

The forecast eviction policy keeps tide-exposed cells resident, so the cut falls on cells behind the player. Expect more reloads when players double back.

Of the 400 MB, texture mips give back 260 MB, audio banks 90 MB, and navigation 50 MB.
