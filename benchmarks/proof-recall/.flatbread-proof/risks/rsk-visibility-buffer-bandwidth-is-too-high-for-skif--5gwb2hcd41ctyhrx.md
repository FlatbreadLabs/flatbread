---
id: rsk-visibility-buffer-bandwidth-is-too-high-for-skif--5gwb2hcd41ctyhrx
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Visibility buffer bandwidth is too high for Skiff
state: mitigated
created_at: '2026-04-09T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - fnd-visibility-buffer-costs-11-2-ms-on-skiff--s3vphdwnhbh4650s
mitigated_by: dec-visibility-buffer-on-pc-and-meridian-forward-fal--khvgysnhmnkjqe9k
likelihood: medium
severity: high
---
If the visibility buffer stays 2.3 ms slower than forward+ on Skiff, the Skiff port cannot hold its frame rate with saltglass on screen. Skiff becomes a launch platform at beta, so this cannot wait.
