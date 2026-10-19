---
id: iss-skiff-cert-autosave-writes-11-mb-per-minute--z8qh0wed0sga93tw
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: 'Skiff cert: autosave writes 11 MB per minute'
kind: defect
status: resolved
created_at: '2026-05-18T10:00:00Z'
created_by: Priya Natarajan
derives_from:
  - fnd-skiff-pre-certification-found-two-failures-and-o--ehe0e727vmd0d1jj
resolved_by:
  - dec-write-delta-saves-on-skiff--a0g7x2bvk59t82jw
---
Autosave rewrites the whole tide state every 30 seconds, about 11 MB a minute on Skiff. Lot check fails it.
