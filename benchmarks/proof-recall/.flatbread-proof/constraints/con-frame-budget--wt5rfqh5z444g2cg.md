---
id: con-frame-budget--wt5rfqh5z444g2cg
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Frame budget
kind: hard
created_at: '2025-10-28T10:00:00Z'
created_by: Priya Natarajan
superseded_by:
  - con-frame-budget--br0qszfg8fys908n
---
Skiff runs at 30 Hz, so each frame gets 33.3 ms of CPU and of GPU time. Meridian runs at 60 Hz and gets 16.6 ms. Captures that miss these numbers on the harbor route block a merge to the console branch.
