---
id: iss-skiff-cert-blocker-40-hz-mode-misses-frames-in-t--8r81ajkewab5gymr
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: 'Skiff cert blocker: 40 Hz mode misses frames in tide storms'
kind: blocker
status: open
created_at: '2026-08-11T09:00:00Z'
created_by: Priya Natarajan
derives_from:
  - fnd-tide-storms-push-skiff-40-hz-frames-to-28-4-ms-o--28gemvtznv4zztdc
---
Lot check requires a selectable mode to hold its advertised rate. The 40 Hz mode drops to about 35 Hz in storms. Full Skiff submission cannot go in until this is fixed or the mode is pulled.
