---
id: dec-run-engine-jobs-on-fibers-and-pin-gull-scripts-t--rw28cbqfd07rd9te
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Run engine jobs on fibers and pin Gull scripts to two dedicated threads
state: superseded
created_at: '2026-02-10T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - fnd-the-gull-vm-reads-thread-local-registers-after-f--1qser43b9j8ac5pf
  - iss-gull-scripts-crash-after-a-fiber-resumes-on-anot--n2hvwg59w0rem0te
supersedes:
  - dec-move-engine-jobs-to-fibers--qjkgnm8cex8ydzfq
superseded_by:
  - dec-return-engine-jobs-to-a-thread-pool-with-continu--1zkc1v2x97taf50h
---
Keep fibers for engine jobs, but take Gull out of the fiber pool. Gull scripts run on two dedicated threads that never migrate, so the VM's thread-local state stays valid. Engine code that calls into Gull posts a request to those threads.
