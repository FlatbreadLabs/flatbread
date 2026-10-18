---
id: iss-vertical-slice-runs-at-19-4-ms-on-the-dunes-flyo--p26gahekvspjmv06
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Vertical slice runs at 19.4 ms on the dunes flyover
kind: blocker
status: resolved
created_at: '2025-12-01T09:00:00Z'
created_by: Ines Okafor
derives_from:
  - con-frame-budget--f5qxxq5572878wrp
resolved_by:
  - dec-drop-the-far-sdf-gi-cascade-for-the-vertical-sli--0af6sjseeftc621j
---
Two weeks before the slice, the dunes flyover runs at 19.4 ms on Meridian, 2.8 ms over the Frame budget. SDF GI with all four clipmap cascades and the saltglass forward pass are the two largest passes. The slice cannot ship at this cost.
