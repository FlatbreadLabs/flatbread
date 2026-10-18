// Thread 2: the job system. Thread pool, then fibers, then back to a pool.
const RHEA = 'Rhea Valdés';
const KENJI = 'Kenji Arakawa';
const MARTA = 'Marta Lindqvist';
const LIAM = "Liam O'Connell";
const DARA = 'Dara Whitlock';

export default [
  {
    at: '2025-09-05T10:00:00Z',
    key: 'iss-jobs-model',
    type: 'WriteIssue',
    kind: 'question',
    created_by: RHEA,
    title: 'Which job model should the Kestrel scheduler use?',
    body: `Every Kestrel system will run as jobs: simulation, streaming, decompression, Gull scripts, and render setup. We need to pick the execution model now, because changing it later touches every system that waits on another.`,
  },
  {
    at: '2025-09-08T15:00:00Z',
    key: 'fnd-jobs-survey',
    type: 'WriteFinding',
    kind: 'survey',
    created_by: RHEA,
    derives_from: ['iss-jobs-model'],
    title: 'Fibers hide waits but need custom stacks and debugger support',
    body: `Rhea Valdés surveyed two models. A work-stealing thread pool is simple and every debugger understands it, but a job that waits blocks its worker. Fibers let a job yield on a wait and resume later on any worker, but they need custom stack allocation, and the Meridian and Skiff debuggers show fiber stacks only through a vendor plug-in that is still in beta.`,
  },
  {
    at: '2025-09-10T10:00:00Z',
    key: 'dec-jobs-1',
    type: 'WriteDecision',
    created_by: RHEA,
    derives_from: ['iss-jobs-model', 'fnd-jobs-survey'],
    title: 'Run engine jobs on a work-stealing thread pool',
    body: `Run one worker per hardware thread, minus one for the main thread. Jobs must not block: a job that needs data schedules a follow-up job instead of waiting. This keeps the scheduler small and debuggable for pre-production.`,
  },
  {
    at: '2025-09-10T10:30:00Z',
    key: 'dec-jobs-fibers-early',
    type: 'WriteDecision',
    created_by: KENJI,
    derives_from: ['iss-jobs-model', 'fnd-jobs-survey'],
    title: 'Run engine jobs on fibers from the start',
    body: `Kenji Arakawa proposes fibers from day one. Streaming code is full of waits on I/O and decompression, and rewriting those as follow-up jobs is error-prone. Fibers make a wait a yield.`,
  },
  {
    at: '2025-09-12T17:00:00Z',
    type: 'AcceptDecision',
    decisionId: 'dec-jobs-1',
  },
  {
    at: '2025-09-12T17:05:00Z',
    type: 'ResolveIssue',
    issueId: 'iss-jobs-model',
    resolution: 'resolved',
    resolvedBy: ['dec-jobs-1'],
  },
  {
    at: '2025-10-14T10:00:00Z',
    key: 'fnd-jobs-stalls',
    type: 'WriteFinding',
    kind: 'measurement',
    created_by: KENJI,
    derives_from: ['dec-jobs-1'],
    title: 'Streaming jobs block workers while waiting on reads',
    body: `The no-blocking rule is not holding. Decompression jobs wait for their reads instead of chaining, because the read API has no completion callback yet. On Meridian, workers sit idle for 3.1 ms per frame, and frame-critical jobs queue behind blocked streaming jobs.`,
  },
  {
    at: '2025-10-21T10:00:00Z',
    key: 'dec-jobs-2',
    type: 'WriteDecision',
    created_by: RHEA,
    derives_from: ['fnd-jobs-stalls'],
    supersedes: ['dec-jobs-1'],
    title: 'Run engine jobs on a work-stealing thread pool with priority lanes',
    body: `Keep the thread pool but split it into three lanes: frame-critical, streaming, and background. Waits are allowed only in the streaming lane, so a blocked read never delays a frame-critical job. Two workers serve the streaming lane on every platform.`,
  },
  {
    at: '2025-10-22T09:00:00Z',
    type: 'AcceptDecision',
    decisionId: 'dec-jobs-2',
  },
  {
    at: '2025-11-18T10:00:00Z',
    key: 'fnd-jobs-idle',
    type: 'WriteFinding',
    kind: 'measurement',
    created_by: KENJI,
    derives_from: ['fnd-jobs-stalls', 'dec-jobs-2'],
    title: 'Priority lanes still leave workers 28% idle during tide turns',
    body: `During a tide turn the streaming lane gets 18 cell reloads at once. Both streaming workers block on reads, the lane backs up, and across the pool workers are idle 28% of the time while work waits. Adding streaming workers only moves the problem, because each new worker also blocks.`,
  },
  {
    at: '2025-11-26T10:00:00Z',
    key: 'dec-jobs-3',
    type: 'WriteDecision',
    created_by: RHEA,
    derives_from: ['fnd-jobs-idle', 'fnd-jobs-survey'],
    supersedes: ['dec-jobs-2'],
    title: 'Move engine jobs to fibers',
    body: `Replace the thread pool with a fiber scheduler: 160 fibers with 64 KB stacks, run by one worker thread per hardware thread. A wait yields the fiber and the worker picks up other work. This is the model Kenji Arakawa proposed in September; the lane split showed that blocking waits cannot be scheduled away.`,
  },
  {
    at: '2025-11-27T09:00:00Z',
    type: 'AcceptDecision',
    decisionId: 'dec-jobs-3',
  },
  {
    at: '2025-11-28T10:00:00Z',
    key: 'rsk-fiber-debug',
    type: 'WriteRisk',
    likelihood: 'medium',
    severity: 'high',
    created_by: RHEA,
    derives_from: ['dec-jobs-3'],
    title: 'Fiber stacks may make crash dumps unreadable',
    body: `Crash dumps capture thread stacks. A crash inside a fiber shows the worker's scheduler frames, not the job's frames, unless the dump tool walks fiber stacks too. The console vendor plug-in for that is still in beta.`,
  },
  {
    at: '2026-01-30T10:00:00Z',
    key: 'iss-jobs-gull-crash',
    type: 'WriteIssue',
    kind: 'defect',
    created_by: MARTA,
    title: 'Gull scripts crash after a fiber resumes on another worker',
    body: `Gull scripts that wait (for an animation, a timer, or a tide event) crash at random after resuming. The crash is always inside the Gull VM's register access.`,
  },
  {
    at: '2026-02-04T10:00:00Z',
    key: 'fnd-gull-fiber-tls',
    type: 'WriteFinding',
    kind: 'measurement',
    created_by: MARTA,
    derives_from: ['iss-jobs-gull-crash', 'dec-jobs-3'],
    title: 'The Gull VM reads thread-local registers after fiber migration',
    body: `Marta Lindqvist traced the Gull crashes to thread-local storage. The Gull VM keeps its register file and its current-script pointer in thread-local variables, which was safe on a thread pool because a job never changed threads mid-run.

Under fibers, a Gull script that waits yields its fiber. When the fiber resumes, the scheduler may run it on a different worker thread. The VM then reads the new thread's register file, which belongs to some other script, and either corrupts that script or dereferences a stale pointer.

Moving the VM state out of thread-local storage means touching every native binding, about 1,400 functions. The debugger has the same problem in reverse: it shows the worker's stack, so a script breakpoint lands in scheduler code.

Measured on the alpha build, the failure rate is one crash per 900 script waits, which works out to a crash every four minutes in a four-player session.`,
  },
  {
    at: '2026-02-04T15:00:00Z',
    type: 'Invalidate',
    findingId: 'fnd-gull-fiber-tls',
    targetId: 'dec-jobs-3',
  },
  {
    at: '2026-02-10T10:00:00Z',
    key: 'dec-jobs-4',
    type: 'WriteDecision',
    created_by: RHEA,
    derives_from: ['fnd-gull-fiber-tls', 'iss-jobs-gull-crash'],
    supersedes: ['dec-jobs-3'],
    title:
      'Run engine jobs on fibers and pin Gull scripts to two dedicated threads',
    body: `Keep fibers for engine jobs, but take Gull out of the fiber pool. Gull scripts run on two dedicated threads that never migrate, so the VM's thread-local state stays valid. Engine code that calls into Gull posts a request to those threads.`,
  },
  {
    at: '2026-02-11T09:00:00Z',
    type: 'AcceptDecision',
    decisionId: 'dec-jobs-4',
  },
  {
    at: '2026-02-12T09:00:00Z',
    type: 'ResolveIssue',
    issueId: 'iss-jobs-gull-crash',
    resolution: 'resolved',
    resolvedBy: ['dec-jobs-4'],
  },
  {
    at: '2026-03-16T10:00:00Z',
    key: 'fnd-fiber-crash-stacks',
    type: 'WriteFinding',
    kind: 'measurement',
    created_by: LIAM,
    derives_from: ['rsk-fiber-debug'],
    title: '41% of alpha crash reports have no usable stack',
    body: `Liam O'Connell sampled 600 crash reports from the alpha build. In 246 of them (41%) the crashing thread was a fiber worker and the dump shows only scheduler frames. The vendor fiber plug-in recovers stacks on Meridian but still crashes the dump tool on Skiff.`,
  },
  {
    at: '2026-03-17T09:00:00Z',
    type: 'SetRiskState',
    riskId: 'rsk-fiber-debug',
    state: 'realized',
    evidence: ['fnd-fiber-crash-stacks'],
  },
  {
    at: '2026-03-25T10:00:00Z',
    key: 'iss-blk-crash-triage',
    type: 'WriteIssue',
    kind: 'blocker',
    created_by: DARA,
    derives_from: ['fnd-fiber-crash-stacks'],
    title: 'Crash triage stalls because fiber stacks are unreadable',
    body: `QA cannot route 41% of crashes to an owner. Dara Whitlock marks this as a blocker for the beta certification pass, which needs a crash rate per system.`,
  },
  {
    at: '2026-04-02T10:00:00Z',
    key: 'fnd-jobs-continuations',
    type: 'WriteFinding',
    kind: 'measurement',
    created_by: KENJI,
    derives_from: ['fnd-jobs-idle', 'iss-blk-crash-triage'],
    title: 'A thread pool with continuation waits keeps workers 93% busy',
    body: `Kenji Arakawa prototyped a thread pool where a wait registers a continuation job instead of blocking. The read API now has completion callbacks, which it lacked in October. During a tide turn, workers are idle 7% of the time, against 28% for the lane pool and 5% for fibers. Every stack in a crash dump is a normal thread stack.`,
  },
  {
    at: '2026-04-13T16:00:00Z',
    key: 'dec-jobs-5-dup',
    type: 'WriteDecision',
    created_by: KENJI,
    derives_from: ['fnd-jobs-continuations'],
    title: 'Return engine jobs to the thread pool with continuation waits',
    body: `Draft: go back to a thread pool, waits become continuations.`,
  },
  {
    at: '2026-04-14T09:00:00Z',
    type: 'Retract',
    recordId: 'dec-jobs-5-dup',
    reason:
      "Kenji Arakawa's draft; Rhea Valdés wrote the version under review.",
  },
  {
    at: '2026-04-14T10:00:00Z',
    key: 'dec-jobs-5',
    type: 'WriteDecision',
    created_by: RHEA,
    derives_from: [
      'fnd-fiber-crash-stacks',
      'fnd-jobs-continuations',
      'iss-blk-crash-triage',
    ],
    supersedes: ['dec-jobs-4'],
    title: 'Return engine jobs to a thread pool with continuation waits',
    body: `Retire the fiber scheduler. Engine jobs run on a work-stealing thread pool again, one worker per hardware thread minus one. A job that must wait registers a continuation, and the scheduler runs the continuation when the read, decompression, or job it waits on completes.

Why now: 41% of alpha crash reports had no usable stack, crash triage is blocked for beta, and the continuation prototype keeps workers 93% busy during tide turns, close to the 95% fibers gave. Fibers bought two points of utilisation at the price of unreadable crashes and the Gull thread-local bug.

Migration: Kenji Arakawa converts the streaming and decompression waits first, then simulation. Each system keeps a wait wrapper during the move so both models can run in one build.

Gull keeps its two dedicated threads for now. Marta Lindqvist will measure whether Gull can rejoin the pool once no job ever changes threads mid-run.`,
  },
  {
    at: '2026-04-15T09:00:00Z',
    type: 'AcceptDecision',
    decisionId: 'dec-jobs-5',
  },
  {
    at: '2026-04-15T09:30:00Z',
    type: 'ResolveIssue',
    issueId: 'iss-blk-crash-triage',
    resolution: 'resolved',
    resolvedBy: ['dec-jobs-5'],
  },
  {
    at: '2026-06-18T10:00:00Z',
    key: 'fnd-gull-threads-idle',
    type: 'WriteFinding',
    kind: 'measurement',
    created_by: MARTA,
    derives_from: ['dec-jobs-5'],
    title: "Gull's two dedicated threads sit idle 70% of each frame",
    body: `On the beta build the two Gull threads are busy only 30% of the frame on Meridian and 34% on Skiff, while the job pool is saturated during tide turns. With fibers gone, a Gull job never resumes on another thread, so the thread-local problem no longer applies.`,
  },
  {
    at: '2026-06-24T10:00:00Z',
    key: 'dec-jobs-6',
    type: 'WriteDecision',
    created_by: RHEA,
    derives_from: ['fnd-gull-threads-idle'],
    supersedes: ['dec-jobs-5'],
    title:
      'Run engine jobs and Gull scripts on one thread pool with continuation waits',
    body: `Fold Gull back into the job thread pool. Gull scripts become ordinary jobs; a script wait registers a continuation like any other job. The two dedicated Gull threads are removed. A Gull job is never moved between threads mid-run, which keeps the VM's thread-local state valid.`,
  },
  {
    at: '2026-06-25T09:00:00Z',
    type: 'AcceptDecision',
    decisionId: 'dec-jobs-6',
  },
];
