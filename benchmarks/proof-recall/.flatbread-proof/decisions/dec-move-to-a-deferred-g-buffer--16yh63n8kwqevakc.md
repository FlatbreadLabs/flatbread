---
id: dec-move-to-a-deferred-g-buffer--16yh63n8kwqevakc
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Move to a deferred G-buffer
state: rejected
created_at: '2025-09-27T11:00:00Z'
created_by: Yusuf Demir
derives_from:
  - iss-should-lantern-replace-clustered-forward-with-a--7c8zxrdsj59q8hmd
rejected_by: dec-adopt-a-visibility-buffer-for-all-opaque-geometr--68vchzqgd1avw8q4
---
A classic G-buffer: four render targets at 1440p cost 118 MB and about 2.8 ms of bandwidth on Meridian. Artists and tools already understand it. It does not fix overdraw on dense meshes as well as a visibility buffer, because the G-buffer pass still writes every covered quad.
