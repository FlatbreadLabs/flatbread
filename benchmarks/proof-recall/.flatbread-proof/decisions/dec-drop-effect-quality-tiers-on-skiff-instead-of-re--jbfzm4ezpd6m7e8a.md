---
id: dec-drop-effect-quality-tiers-on-skiff-instead-of-re--jbfzm4ezpd6m7e8a
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Drop effect quality tiers on Skiff instead of resolution
state: rejected
created_at: '2025-11-05T10:20:00Z'
created_by: Yusuf Demir
derives_from:
  - iss-how-should-skiff-hold-its-frame-budget-when-the--1zdpg3npqmscp42d
rejected_by: dec-scale-skiff-resolution-dynamically-between-540p--jtytvgh2erd32x68
---
Keep 720p and step caustics, fog, and foam down one tier when the GPU runs over. Yusuf Demir prefers this because the saltglass look depends on a sharp image. The tier changes pop visibly, though, and need art sign-off for every biome.
