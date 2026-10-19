---
id: dec-run-tern-on-skiff-at-the-performance-preset--74eqayfa83ybqpe3
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Run Tern on Skiff at the Performance preset
state: accepted
created_at: '2025-11-24T10:00:00Z'
created_by: Priya Natarajan
derives_from:
  - fnd-tern-costs-3-9-ms-at-quality-and-2-1-ms-at-perfo--dkbskbqfgfwtryq0
  - iss-which-upscaler-should-skiff-use--jyp1hqdy0ahwfeej
---
Skiff uses Tern, the temporal upscaler the render Effort owns. The render Decision "Ship Tern as Lantern's only upscaler" makes Tern the only upscaler Lantern supports, so Skiff cannot ship a second one without the render team taking it on.

Skiff runs Tern at the Performance preset, a lower quality preset than other platforms use: 2.1 ms against 3.9 ms for Quality. The 1.8 ms saved pays for tide foam on Skiff. Yusuf Demir signed off on the extra foam ghosting after a side-by-side on the handheld screen, where it is hard to see.
