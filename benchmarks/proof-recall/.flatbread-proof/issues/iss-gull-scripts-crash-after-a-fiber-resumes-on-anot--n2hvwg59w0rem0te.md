---
id: iss-gull-scripts-crash-after-a-fiber-resumes-on-anot--n2hvwg59w0rem0te
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Gull scripts crash after a fiber resumes on another worker
kind: defect
status: resolved
created_at: '2026-01-30T10:00:00Z'
created_by: Marta Lindqvist
resolved_by:
  - dec-run-engine-jobs-on-fibers-and-pin-gull-scripts-t--rw28cbqfd07rd9te
---
Gull scripts that wait (for an animation, a timer, or a tide event) crash at random after resuming. The crash is always inside the Gull VM's register access.
