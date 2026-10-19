---
id: iss-objects-pop-in-for-one-frame-when-the-tide-uncov--6165dkqm91r63ckf
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Objects pop in for one frame when the tide uncovers them
kind: defect
status: resolved
created_at: '2026-03-10T10:00:00Z'
created_by: Yusuf Demir
derives_from:
  - dec-move-to-gpu-driven-two-phase-occlusion-culling--6dre481mabxsw6ee
resolved_by:
  - dec-mark-tide-exposed-instances-visible-for-one-fram--157jf1cesjt3nkrc
---
When a tide step uncovers rocks and wrecks, they are missing from the previous frame's depth pyramid and from the first culling phase, and appear one frame late. Visible as a flash at the waterline.
