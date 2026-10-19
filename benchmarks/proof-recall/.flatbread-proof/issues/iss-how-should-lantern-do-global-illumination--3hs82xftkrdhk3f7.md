---
id: iss-how-should-lantern-do-global-illumination--3hs82xftkrdhk3f7
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: How should Lantern do global illumination?
kind: question
status: resolved
created_at: '2025-09-15T10:00:00Z'
created_by: Ines Okafor
resolved_by:
  - dec-use-signed-distance-field-gi--yn366zmp3k7snd9w
---
Tides move every 40 minutes and the sun crosses the sky in 90, so baked lighting is out. Candidates: a relit probe grid, signed-distance-field GI, or a hybrid of the two. Light must bounce through saltglass and must not leak through thin glass walls.
