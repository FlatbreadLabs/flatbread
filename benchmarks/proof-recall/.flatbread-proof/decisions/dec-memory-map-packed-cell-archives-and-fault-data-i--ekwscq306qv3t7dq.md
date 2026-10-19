---
id: dec-memory-map-packed-cell-archives-and-fault-data-i--ekwscq306qv3t7dq
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Memory-map packed cell archives and fault data in
state: rejected
created_at: '2025-09-29T14:30:00Z'
created_by: Rhea Valdés
derives_from:
  - iss-which-read-path-should-streaming-use-on-each-pla--v9wd5sxvfjfsgx9r
rejected_by: dec-read-streamed-assets-through-one-async-request-q--rd5c8rxr5pwz50ds
---
Map the packed archives and let the OS page data in on first touch. Least code, and the OS cache does the work.
