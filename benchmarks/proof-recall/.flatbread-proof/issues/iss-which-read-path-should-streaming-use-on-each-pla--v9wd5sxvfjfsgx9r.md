---
id: iss-which-read-path-should-streaming-use-on-each-pla--v9wd5sxvfjfsgx9r
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Which read path should streaming use on each platform?
kind: question
status: resolved
created_at: '2025-09-22T10:00:00Z'
created_by: Kenji Arakawa
resolved_by:
  - dec-read-streamed-assets-through-one-async-request-q--rd5c8rxr5pwz50ds
---
Streaming needs one read path that works on PC, Meridian, and Skiff. The choice is between an explicit async request queue and memory-mapping the packed cell archives and letting page faults pull data in.
