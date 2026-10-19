---
id: fnd-the-gull-vm-reads-thread-local-registers-after-f--1qser43b9j8ac5pf
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: The Gull VM reads thread-local registers after fiber migration
kind: measurement
created_at: '2026-02-04T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-move-engine-jobs-to-fibers--qjkgnm8cex8ydzfq
  - iss-gull-scripts-crash-after-a-fiber-resumes-on-anot--n2hvwg59w0rem0te
invalidates:
  - dec-move-engine-jobs-to-fibers--qjkgnm8cex8ydzfq
---
Marta Lindqvist traced the Gull crashes to thread-local storage. The Gull VM keeps its register file and its current-script pointer in thread-local variables, which was safe on a thread pool because a job never changed threads mid-run.

Under fibers, a Gull script that waits yields its fiber. When the fiber resumes, the scheduler may run it on a different worker thread. The VM then reads the new thread's register file, which belongs to some other script, and either corrupts that script or dereferences a stale pointer.

Moving the VM state out of thread-local storage means touching every native binding, about 1,400 functions. The debugger has the same problem in reverse: it shows the worker's stack, so a script breakpoint lands in scheduler code.

Measured on the alpha build, the failure rate is one crash per 900 script waits, which works out to a crash every four minutes in a four-player session.
