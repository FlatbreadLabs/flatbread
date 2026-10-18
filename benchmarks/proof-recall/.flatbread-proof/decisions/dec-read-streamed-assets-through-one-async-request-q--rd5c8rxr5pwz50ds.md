---
id: dec-read-streamed-assets-through-one-async-request-q--rd5c8rxr5pwz50ds
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Read streamed assets through one async request queue per platform
state: accepted
created_at: '2025-09-29T14:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - fnd-skiff-s-file-system-cannot-memory-map-packed-arc--00ecsf304vk38ajb
  - iss-which-read-path-should-streaming-use-on-each-pla--v9wd5sxvfjfsgx9r
---
Every streamed read goes through an async request queue with a priority and a completion callback. Each platform backs the queue with its native async API. One code path, explicit priorities, and no page-fault stalls on the main thread.
