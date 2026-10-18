---
id: iss-should-lantern-replace-clustered-forward-with-a--7c8zxrdsj59q8hmd
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Should Lantern replace clustered forward+ with a visibility buffer?
kind: question
status: resolved
created_at: '2025-09-03T11:00:00Z'
created_by: Ines Okafor
resolved_by:
  - dec-adopt-a-visibility-buffer-for-all-opaque-geometr--68vchzqgd1avw8q4
---
Lantern shades with clustered forward+. Saltglass cliffs are dense meshes with many small triangles, and quad overdraw is high. Options on the table: keep forward+ and tune it, move to a deferred G-buffer, or move to a visibility buffer. Decide before the vertical slice so the material system can follow.
