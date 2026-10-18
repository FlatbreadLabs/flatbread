---
id: fnd-visibility-buffer-prototype-timings--qcfzqvyxbxkf2spw
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Visibility buffer prototype timings
kind: measurement
created_at: '2025-09-24T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - fnd-forward-overdraw-on-saltglass-cliffs--q9n76frhz7a7ssnp
cites:
  - cit-timing-table-visibility-buffer-prototype--njktyg0k8aej7kpf
---
The visibility buffer prototype draws the cliffs benchmark opaque work in 4.6 ms against forward+'s 9.0 ms on Meridian. The win comes from shading each pixel once. The prototype packs instance and triangle into 32 bits, which may not be enough for the dunes. Pass-by-pass numbers are in the attached table.
