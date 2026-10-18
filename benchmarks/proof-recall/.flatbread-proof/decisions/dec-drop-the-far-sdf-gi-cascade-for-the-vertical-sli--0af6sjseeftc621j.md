---
id: dec-drop-the-far-sdf-gi-cascade-for-the-vertical-sli--0af6sjseeftc621j
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Drop the far SDF GI cascade for the vertical slice build
state: accepted
created_at: '2025-12-03T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - dec-use-signed-distance-field-gi--yn366zmp3k7snd9w
  - iss-vertical-slice-runs-at-19-4-ms-on-the-dunes-flyo--p26gahekvspjmv06
---
For the slice build only, SDF GI traces three clipmap cascades instead of four. The far cascade covers 512 m to 2 km, where the probe-free fallback looks flat but acceptable. Tomasz Brandt measured the flyover at 16.1 ms with the cut. The fourth cascade comes back after the slice.
