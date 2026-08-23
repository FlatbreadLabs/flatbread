## How to use these drafts

- Supply Tony's exact legal name, residence, applicant type, payout country, and contact details.
- Add current npm downloads, dependent packages, named users, contributor counts, and all prior funding; do not estimate them.
- Confirm the time, travel, company, domain-email, fiscal-host, and payout gates before sending.
- Keep each cash or credit request to a distinct work package, and disclose parallel applications when a form asks.
- Recheck every deadline, award term, credit expiry, and application link on the day of submission.

## Shared material

### One-sentence description

Flatbread Proof gives coding agents durable, typed project memory as Markdown in the user's Git repository, with human review through normal diffs and small, bounded reads for later recall.

### 50-word description

Flatbread Proof gives coding agents durable project memory inside Git. It stores issues, findings, decisions, constraints, risks, citations, and blobs as linked Markdown files, then returns small, fixed-size digests. People inspect every change through normal diffs and pull requests. The project is MIT-licensed TypeScript software with no hosted service today.

### 150-word description

Flatbread Proof is durable project memory for coding agents. An agent opens an Effort, a named thread of work, and records issues, findings, decisions, constraints, risks, citations, and supporting blobs as Markdown in the repository. Typed links show which evidence a decision derives from, which record replaces an older one, and which claim is no longer valid. The files stay under user control and pass through normal Git diffs and pull requests. Reads do not dump the whole graph into a prompt. They return bounded digests with at most 25 primary records, one relation hop, 50 shown edges, and 64 KiB. Writes use 16 typed operations behind one journalled command. The public MIT-licensed TypeScript package has a packaged agent skill and already records its own development history. The next step is a public benchmark that tests whether this structure helps later agents recover reasons, reject stale evidence, and make choices.

### Problem statement

Coding agents lose the reasons behind a project when a session ends. The next agent must rebuild them from code, chats, issues, or a large transcript. That costs tokens and can revive stale claims. Proof tests a different approach: keep a small typed graph of durable reasoning beside the code, let people review it in Git, and give later agents only the bounded slice needed for the task.

### Three checkable claims

1. Proof defines 8 record kinds, and Flatbread's own repository uses all 8 across 91 Markdown records.
2. One write command exposes exactly 16 typed mutations, with journal recovery around each save.
3. In an initial 12-run recall test, the unbounded workflow used a median 21 tool calls and the bounded workflow used 10; all 12 answers scored 5/5, with a two-tailed Mann-Whitney result of about 0.0022. This is one question on one graph state, not a broad benchmark.

### Research agenda

First, test whether bounded recall keeps answer quality on status, rationale, supersession, and risk questions across several model families. Next, vary graph size and relation structure to find where the fixed read caps fail and whether typed edges help an agent reject invalidated evidence. Publish provider calls, tokens, latency, cost, task scores, the harness, and the result data so others can repeat the work.

### Budget skeleton

- Maintainer research and engineering — 16 weeks × $2,250: **$36,000**.
- Closed-model API evaluation runs: **$10,000**.
- Open-weight inference and GPU time: **$6,000**.
- Independent task-scoring and statistics review: **$5,000**.
- Dataset cleanup, documentation, and reproducibility release: **$3,000**.
- Total full research package: **$60,000**. Cut whole studies, not review or reporting, for smaller awards.

## Drafts

1. skills.sh / Vercel Labs skills CLI
2. Together AI Startup Accelerator — Build
3. cursor.directory community listing
4. Transformative AI Fund
5. Cursor Marketplace plugin listing
6. FUTO Fellows Program
7. Lightcone Commons quarterly grants
8. GitNation AI Coding Summit CFP
9. Arcee AI Trinity Builders Program
10. Google for Startups Cloud Program — Start
11. Foresight Fellowship
12. Manifund Open Call / AI Safety Regranting

### skills.sh / Vercel Labs skills CLI

**Why this funder** — Vercel Labs defines agent skills as reusable instruction sets and makes public Git repositories installable across many coding agents. Proof already ships a skill, so this route puts the working tool in front of the exact users who need durable coding-agent memory.

**Draft** — Flatbread Proof gives coding agents durable project memory in the repository they are changing. Its packaged skill teaches an agent to open an Effort, which is one named thread of work, and to save only durable issues, findings, decisions, constraints, risks, citations, and supporting blobs. Those records are Markdown under `.flatbread-proof/`, so a person can inspect them in an ordinary Git diff. Typed links preserve which evidence led to a decision and when a later record replaced or invalidated an older one.

The skill also teaches bounded reads. A digest returns no more than 25 primary records, one relation hop, 50 shown edges, and 64 KiB. This keeps a later agent from loading the full project history into its prompt. Writes use a small typed command surface and a journal, rather than asking the agent to edit internal files by hand.

Flatbread is public, MIT-licensed TypeScript software. The repository contains a valid packaged skill and checks that the shipped skill stays in sync with the runtime. The install target is the public FlatbreadLabs repository, with one command that works through the skills CLI. The listing text and README will show the data model, exact limits, and a short example that creates a decision, links its evidence, and recalls it in a later session.

**Deliverable offered** — A valid public Proof skill, install command, skills.sh page, and five-minute Git-based memory example within two weeks.

**Ask** — Installability and directory discovery for the Proof skill; no cash or credits requested.

**Weakest point** — The route does not promise a featured listing or traffic; the honest value is low-friction install by people already using the skills CLI.

### Together AI Startup Accelerator — Build

**Why this funder** — Together AI offers startup teams credits for inference, fine-tuning, and clusters, plus engineering help with benchmarking and evaluations. Proof needs a measured open-model side of its recall study, and Together's developer audience is close to coding-agent builders.

**Draft** — Flatbread Proof is an MIT-licensed TypeScript tool for durable coding-agent memory. It stores project reasoning as typed Markdown in the user's own Git repository. A later agent reads a bounded graph digest instead of searching a full transcript or loading every record. The core question is measurable: does that structure help an agent recover current decisions, reject invalidated evidence, and act with fewer calls?

We are applying to the Build tier to run the open-weight part of a public evaluation. The harness will present matched repositories to models served by Together AI. One condition will use Proof's typed links and bounded reads. The control will contain the same facts without those relations or limits. Tasks will cover project status, decision rationale, supersession history, and risk synthesis. We will log provider calls, input and output tokens, cache use, latency, cost, and scored task results.

Together credits will pay only for Together-hosted runs. They will not be described as support for closed-model tests. The three hours of engineering help would go to stable model selection, request logging, and a reproducible API adapter. We will publish the adapter, prompts, fixtures, scoring rules, raw results, and a short report. This gives Together a concrete evaluation artifact for long-running agent workflows and gives other builders a repeatable way to test memory design.

**Deliverable offered** — An open Together AI evaluation adapter, matched-repository dataset, and results report within 90 days of credit activation.

**Ask** — Build-tier support: $15,000 in platform credits and three hours of forward-deployed engineering time.

**Weakest point** — Flatbread is not yet a proven startup or incorporated company; the page does not require incorporation, but the program may still reject a solo open-source project.

### cursor.directory community listing

**Why this funder** — cursor.directory accepts public Git repositories and follows the Open Plugins standard. Its audience is Cursor users looking for skills, plugins, and agent tools, which makes it a direct adoption route for Proof.

**Draft** — Flatbread Proof is durable project memory for coding agents, stored as Markdown in the user's own Git repository. The plugin gives Cursor a clear workflow for recording the few facts that should survive a session: issues, findings, decisions, constraints, risks, citations, and supporting blobs. An Effort is one named thread of work that holds those records. Typed links show where a decision came from, which later record supersedes it, and when evidence has been invalidated.

People review every memory change through normal Git diffs and pull requests. There is no hosted memory account and no hidden transcript store. Reads return a bounded digest with fixed caps, so the agent gets the relevant slice instead of the whole graph. Writes go through typed, journalled operations.

The repository is public, MIT licensed, written in TypeScript, and published on npm. It includes the Proof skill with its record rules, read workflow, and command reference. The listing should point to a short setup guide and a sample repository flow: open an Effort, record a finding and decision, link them, end the session, then ask a later agent to recover the current decision and its reason. This is a plugin for reviewable agent state, not a hosted database or task tracker.

**Deliverable offered** — A compliant public plugin listing, install guide, and end-to-end Cursor example within two weeks.

**Ask** — One community directory listing for the public Flatbread plugin; no cash or credits requested.

**Weakest point** — A listing does not guarantee ranking or traffic; adoption will still depend on a clear demo and real user reports.

### Transformative AI Fund

**Why this funder** — The Transformative AI Fund backs early-stage, failure-tolerant work that may reduce catastrophic risk from advanced AI, including technical research and new infrastructure. Proof is relevant only as an open study of stale evidence and later-agent behaviour, not as a general developer-tool grant.

**Draft** — Flatbread Proof stores durable coding-agent reasoning as a typed graph of Markdown files inside the user's Git repository. A later agent reads a bounded digest rather than an unbounded transcript. Relations state which evidence supports a decision, which record supersedes an older one, and which claim is invalid. This creates a testable safety question: when an agent inherits project memory, does explicit invalidation and bounded recall reduce action based on stale or contradicted evidence?

We seek support for an early empirical study, not a claim that the method is already proven. We will build matched repositories with the same prose in two forms: one with valid typed relations and one with relation fields removed. Agents from several model families will answer status and rationale questions, identify invalidated evidence, and choose an action under a stale constraint. Blinded scoring will measure correct source use, stale-evidence errors, tool calls, tokens, latency, and cost.

The current evidence is a 12-run pilot on one recall question. It found median tool calls of 21 in the unbounded workflow and 10 with the bounded workflow, while all answers scored 5/5. That result sets the design, not the conclusion. We will publish the harness, fixtures, preregistered scoring rules, raw outputs, analysis, and a plain-language report. A negative result will be published on the same terms.

**Deliverable offered** — A preregistered, open stale-evidence benchmark and report within six months, including all prompts, fixtures, scores, and provider-cost logs.

**Ask** — **$60,000** for 16 weeks of maintainer research, model runs, open-weight compute, independent review, and publication.

**Weakest point** — Proof has no demonstrated catastrophic-risk result; the honest case is that this small study may test one neglected failure mode in inherited agent state.

### Cursor Marketplace plugin listing

**Why this funder** — Cursor's Marketplace extends the Agent with reviewed plugins, skills, rules, and related tools. Proof can meet that audience inside the editor where later-session memory is used, while keeping every stored reason visible in Git.

**Draft** — Flatbread Proof gives Cursor agents durable project memory without moving project reasoning into a hosted service. The plugin teaches the agent to create an Effort, meaning one named thread of work, and to record only durable issues, findings, decisions, constraints, risks, citations, and supporting blobs. Each record is Markdown under `.flatbread-proof/`. A person sees the same change in the pull request as any other repository edit.

Typed relations preserve the reasoning between records. A decision can derive from a finding, a new record can supersede an older one, and a claim can be marked invalid. Later reads return bounded digests with hard limits instead of placing the whole history in the prompt. The plugin therefore adds a reviewable memory workflow, not a database, chat archive, or task tracker.

The public repository is MIT licensed and written in TypeScript. The package already ships the agent skill and checks its release files for drift. For Marketplace review, we will provide the plugin manifest, the skill, a concise command reference, and a sample flow that starts in one Cursor session and recalls the current decision in another. We will also document removal: deleting the plugin stops the workflow, while the user's Markdown records remain ordinary files under the user's control.

**Deliverable offered** — A review-ready open-source Cursor plugin, sample workflow, and support page within three weeks.

**Ask** — Manual review and one official Marketplace listing; no cash or credits requested.

**Weakest point** — Proof still needs compliant plugin packaging and has little external adoption evidence; the submission should ask for review, not imply that listing is assured.

### FUTO Fellows Program

**Why this funder** — FUTO funds projects that give people more control over technology and challenge dependence on large platform owners. Proof keeps agent memory in local Git files that users can inspect, move, change, and delete without a vendor account.

**Draft** — Flatbread Proof is durable project memory for coding agents that stays with the code. It records issues, findings, decisions, constraints, risks, citations, and supporting blobs as Markdown in the user's repository. An Effort is one named thread of work. Typed links preserve why a decision was made and whether later evidence replaced or invalidated an earlier record. People review those changes through ordinary Git diffs and pull requests.

This design gives the user custody of agent memory. There is no hosted memory service, opaque transcript archive, or proprietary database. A project can move between editors and model providers while keeping the same records. Reads are capped, so a later agent receives a small digest rather than every stored fact.

During three months in Austin, I would turn the current package into a clear local-first workflow that a developer can install, inspect, and remove. The work would include a stable plugin package, migration and backup notes, a local open-weight example, and a public benchmark for later-session recall. The benchmark will compare typed relations with the same prose stripped of relations and will publish both successful and failed cases. FUTO would get a concrete demonstration of user-controlled AI tooling: the memory remains readable when a model subscription ends, and the full project history stays under the same version control as the code.

**Deliverable offered** — A tagged local-first release, open-weight demo, portability guide, and public recall benchmark by the end of the three-month Austin residency.

**Ask** — The full **$40,000** fellowship award, round-trip Austin travel, three months of housing, workspace, and mentorship.

**Weakest point** — The residency requires travel to Austin, and Tony's ability to attend is unknown; confirm that before applying.

### Lightcone Commons quarterly grants

**Why this funder** — Lightcone Commons accepts ambitious public-benefit work from individuals and gives participating funders wide discretion, with much of the current funding focused on shaping advanced AI well. Proof fits only as a narrow, open evaluation of inherited agent state, with a charitable research scope.

**Draft** — Flatbread Proof stores durable coding-agent reasoning as linked Markdown in the user's Git repository. Its records distinguish findings, decisions, constraints, risks, and citations. Relations show which evidence supports a decision and when later work supersedes or invalidates an earlier claim. Reads return a bounded digest instead of the entire graph.

The proposed project asks where those bounds fail as project memory grows. We will create small, medium, and cap-crossing graphs from the same underlying facts. Agents from several model families will answer the same status, rationale, supersession, and risk questions with bounded reads and with unconstrained exploration. We will measure answer errors, stale-evidence use, tool calls, provider calls, tokens, latency, and cash cost. We will also test paging so the result can distinguish a bad cap from a bad retrieval policy.

This is not a request to market a developer product. It is a request to produce public evidence about how later agents use stored reasoning. The current pilot covers only one question and one graph state. It found a drop from 21 to 10 median tool calls without a measured answer-quality loss, but that result may fail on harder tasks. We will publish the harness, graph fixtures, raw outputs, scoring guide, and report even if bounded recall performs worse. The application can remain a living document as the preregistration and pilot data are added.

**Deliverable offered** — An open graph-size and paging benchmark, raw result archive, and report within four months.

**Ask** — **$35,000** for 12 weeks of maintainer time, model runs, independent scoring, and publication.

**Weakest point** — Most current funders focus on AI existential risk, while this study begins as coding-agent evaluation; the application must show the stale-evidence question without claiming a safety result in advance.

### GitNation AI Coding Summit CFP

**Why this funder** — AI Coding Summit is aimed at engineers and technical leaders working on coding agents, context, and production AI workflows. A concrete talk about measured recall reaches a more relevant adoption audience than a broad startup event.

**Draft** — Proposed talk: **Can a coding agent remember why? A measured Git-based approach**

Coding agents can resume code, but they often lose the reasons behind it. The next session searches chat, issues, and files, then may act on a stale decision. Flatbread Proof takes a small, inspectable approach: it stores issues, findings, decisions, constraints, risks, and citations as typed Markdown beside the code. An Effort is one named thread of work. People review the records in normal Git diffs. Later agents read a bounded graph digest rather than the full history.

This talk will show the workflow and the first controlled result. In 12 runs across three model families, an unbounded recall flow used a median 21 tool calls. The bounded flow used 10. All answers in that small test scored 5/5, but the test covered only one question and one graph state. I will explain that limit, not hide it.

The useful part for attendees is the method. I will show how to decide what deserves durable memory, how typed `supersedes` and `invalidates` links prevent old claims from looking current, and how hard read caps change agent behaviour. I will close with the next benchmark: harder rationale and risk tasks, larger graphs, provider token logs, and matched data with and without relations. Attendees will leave with an MIT-licensed package, a reproducible fixture, and a scoring sheet they can apply to their own agent workflow.

**Deliverable offered** — A conference talk, public slides, demo repository, and reproducible 12-run fixture ready before the November 2026 event.

**Ask** — One speaker slot at AI Coding Summit NYC or online; no fee is assumed, and travel support must be confirmed separately.

**Weakest point** — The pilot is small; the talk works only if it teaches the method and states the limits instead of presenting a settled benchmark.

### Arcee AI Trinity Builders Program

**Why this funder** — Arcee created this credit grant for developers, researchers, and open-source builders with clear plans, community impact, and limited inference budget. It names agent loops, evaluations, and real systems, which closely matches Proof's open recall benchmark.

**Draft** — Flatbread Proof is durable project memory for coding agents. It stores project reasoning as typed Markdown in the user's Git repository and returns small graph digests to later sessions. An Effort is one named thread of work. Relations state which finding supports a decision, which new record supersedes an old one, and which evidence is invalid. The research question is whether that structure changes a later agent's answer and action.

We request Trinity API access for a controlled, public evaluation. The first task set will cover status recall, decision rationale, supersession history, invalidated evidence, and risk synthesis. Each task will run against matched repositories: one with valid typed relations and one with the same prose but no relations. A second set will vary graph size and bounded-read paging. We will record API calls, input and output tokens, latency, task scores, and failure cases.

The harness will be instrumented before credits start so the 90-day window is used for runs, not setup. We will use only Trinity-family credits for this work and report the exact model and settings. The output will include an OpenAI-compatible Trinity adapter, fixtures, prompts, scoring rules, raw results, and a short report. All code and data that we can publish safely will use a permissive licence. Results and practical model feedback will be shared with Arcee, whether they support or reject the memory design.

**Deliverable offered** — A public Trinity benchmark adapter, dataset, result archive, and model feedback report within the 90-day credit term.

**Ask** — The **50–200 million token** request tier for Trinity API inference.

**Weakest point** — The requested token band must be justified by an instrumented pilot; apply only after measured per-run use supports it.

### Google for Startups Cloud Program — Start

**Why this funder** — The Start tier gives unfunded early startups a small year-long Google Cloud budget, technical resources, and entry to its startup community. For Proof, the honest use is a bounded Gemini-side pilot and result logging, not moving the local product into a hosted service.

**Draft** — Flatbread Proof gives coding agents durable project memory as Markdown in the user's Git repository. It records issues, findings, decisions, constraints, risks, and citations, then links them so a later agent can recover why a choice was made and whether evidence is stale. An Effort is one named thread of work. Reads return bounded digests rather than loading the full graph.

We are building a public evaluation of this approach across model families. Google Cloud credits would fund the Gemini part of that work and the storage of non-sensitive aggregate run logs. The pilot will compare bounded recall with unconstrained exploration on status, rationale, supersession, and risk tasks. It will record provider calls, tokens, cache use, latency, cost, and scored answers. A matched test will remove typed relations while keeping the prose fixed.

The product itself remains local-first. User records stay in the repository, and no hosted Flatbread service is part of this request. Google Cloud would be an evaluation backend, not a required runtime. We will publish the harness, Gemini adapter, prompts, synthetic fixtures, scoring guide, and results. The current package is MIT licensed, written in TypeScript, and public on GitHub and npm. Before applying, we will provide the required public company site, matching domain email, GCP billing account, and exact applicant details.

**Deliverable offered** — A public Gemini evaluation adapter, bounded-recall pilot, and provider-cost report within six months.

**Ask** — The Start tier maximum of **$2,000 in Google Cloud credits for one year**.

**Weakest point** — Flatbread's company status, public company site, matching email, and billing account are not established; do not submit until all four facts are true.

### Foresight Fellowship

**Why this funder** — Foresight supports early-career builders through mentors, funder introductions, technical workshops, seminars, and Secure AI networks. Proof's benchmark can benefit from expert challenge and a public platform, even though the fellowship states no cash stipend.

**Draft** — I maintain Flatbread Proof, an MIT-licensed TypeScript tool for durable coding-agent memory. It stores project reasoning as typed Markdown in the user's own Git repository. An Effort is one named thread of work, holding findings, decisions, constraints, risks, and citations. Typed relations show which evidence led to a decision and when a later record superseded or invalidated an earlier claim. Later reads are bounded so an agent cannot simply load the whole graph.

My fellowship project would study a Secure AI question: how should a later agent handle inherited reasoning when some evidence is stale, contradicted, or missing? I will build matched repository tasks with and without explicit relations, vary graph size, and test several model families. Measures will include stale-evidence errors, correct source use, tool calls, tokens, latency, and task outcomes. The current 12-run pilot is useful but narrow; it covers one recall question and one graph state.

Foresight's value is the research network and review, not compute funding. I would use seminar feedback to sharpen the threat model and scoring rules, seek mentors who work on evaluations and secure multi-agent systems, and present both positive and negative results. The public outputs will be a benchmark harness, synthetic dataset, preregistration, result report, and fellowship seminar. The software and study artifacts will remain open so other agent builders can repeat the tests.

**Deliverable offered** — A fellowship seminar, open Secure AI benchmark, and research report during the year-long 2028 cohort.

**Ask** — A 2028 Fellowship place, paid travel to one technical workshop and one Vision Weekend, seminar access, mentoring, and funder introductions; no cash stipend requested.

**Weakest point** — Tony must personally confirm that the program's early-career bar fits; the page gives no cash for maintainer time or model runs.

### Manifund Open Call / AI Safety Regranting

**Why this funder** — Manifund accepts public-benefit proposals from individuals and uses flexible regrantors to fund early AI-safety work, including benchmarks. Proof can offer a small, public experiment on whether a memory-writing rule changes what a later agent remembers and does.

**Draft** — Flatbread Proof is durable project memory for coding agents, stored as typed Markdown beside the code. An Effort is one named thread of work. Agents can record issues, findings, decisions, constraints, risks, and citations, while relations preserve where a claim came from and whether it is current. Reads return bounded digests to keep later recall small.

This proposal tests the write side. Proof's skill tells an agent to save a record only when it has future need, durable effect, causal value, and unique signal. That rule may improve future memory, or it may discard useful context. We will run four writing cases with and without the gate across three model families. A later agent will receive each resulting graph and answer questions about the current decision, its reason, stale evidence, and blocking risks. We will score recall, noise, wrong causal links, tool calls, tokens, and cost.

The work is separate from the graph-size and provider-credit studies in our other drafts. Manifund support would pay for the writing experiment, later-reader runs, scoring review, and publication. We will post the proposal publicly, name other applications, and set a minimum that funds a complete smaller design. The deliverable will include prompts, synthetic repositories, raw outputs, scoring rules, analysis, and a short report. We will publish a null or negative result on the same schedule.

**Deliverable offered** — An open write-gate benchmark and report within 12 weeks of funding.

**Ask** — **$25,000**, with a **$15,000 minimum**, for eight weeks of maintainer time, model runs, independent scoring, and publication.

**Weakest point** — The link to catastrophic risk is indirect; the proposal should focus on stale and wrong inherited reasoning and let regrantors judge its safety value.
