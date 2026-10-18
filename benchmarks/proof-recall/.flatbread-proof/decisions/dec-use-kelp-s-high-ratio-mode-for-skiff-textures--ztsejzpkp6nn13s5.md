---
id: dec-use-kelp-s-high-ratio-mode-for-skiff-textures--ztsejzpkp6nn13s5
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Use Kelp's high-ratio mode for Skiff textures
state: accepted
created_at: '2026-02-20T10:00:00Z'
created_by: Priya Natarajan
derives_from:
  - con-skiff-memory-budget--nf7qbhsnmcn6v479
  - rsk-skiff-runs-out-of-memory-in-dense-districts--p5pv42sgezzjhpfz
---
Encode Skiff textures with Kelp's high-ratio mode instead of the default mode. Priya Natarajan expects it to save about 900 MB on the harbor route. Decode costs 0.3 ms more per streamed tile on Skiff's CPU, and Yusuf Demir sees slight banding on saltglass gradients at handheld size only.
