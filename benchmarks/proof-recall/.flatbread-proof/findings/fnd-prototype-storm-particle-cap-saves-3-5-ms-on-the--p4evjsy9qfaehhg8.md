---
id: fnd-prototype-storm-particle-cap-saves-3-5-ms-on-the--p4evjsy9qfaehhg8
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Prototype storm particle cap saves 3.5 ms on the Skiff CPU
kind: measurement
created_at: '2026-09-08T16:00:00Z'
created_by: Yusuf Demir
derives_from:
  - dec-cap-tide-storm-particles-at-6-000-on-skiff--resze52afjxyxys1
---
Yusuf Demir built the 6,000 particle cap behind a debug flag. On the storm sequence the CPU frame fell from 28.4 ms to 24.9 ms in the 40 Hz mode, 0.1 ms inside budget. Art has not signed off on the thinner storm, and nobody has chosen between the cap and the 30 Hz fallback yet.
