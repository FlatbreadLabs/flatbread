---
id: dec-write-delta-saves-on-skiff--a0g7x2bvk59t82jw
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Write delta saves on Skiff
state: accepted
created_at: '2026-05-22T10:00:00Z'
created_by: Priya Natarajan
derives_from:
  - con-skiff-storage-write-limit--39sn09p505a1s8j7
  - iss-skiff-cert-autosave-writes-11-mb-per-minute--z8qh0wed0sga93tw
---
Autosave on Skiff writes only the tide cells and inventory slots that changed since the last save, plus a full save every 10 minutes. Expected volume: 2.6 MB a minute, including the pipeline cache.
