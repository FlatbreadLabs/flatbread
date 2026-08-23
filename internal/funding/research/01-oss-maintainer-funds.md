# OSS maintainer and infrastructure funds

Checked on 23 August 2026. Every amount, date, status, and applicant rule below comes from a page opened in this run. A missing fact is `UNKNOWN`. Applicant country and legal entity for Flatbread Proof remain unknown, so country-locked and entity-locked programmes stay gated.

## Ranked programs

### GitHub Secure Open Source Fund

Funder — GitHub, with Funding Partners named on GitHub Blog posts (Alfred P. Sloan Foundation, American Express, Chainguard, Datadog, Herodevs, Kraken, Mayfield, Microsoft, Shopify, Stripe, Superbloom, Vercel, Zerodha, 1Password).

Track — GitHub Secure Open Source Fund (session-based security sprint plus year-long check-ins).

Support type — CASH, CLOUD-CREDITS, AI-CREDITS, MENTORSHIP, EXPOSURE.

Award — $10,000 USD per project, paid through GitHub Sponsors, in three parts on the 2025 programme write-up: $6,000 during the three-week sprint, $2,000 at the six-month check-in, $2,000 at the twelve-month check-in. Session 4 (late April 2026) also stated Copilot Pro and $100,000 of Azure credits. Session 5 cash and credit amounts were not restated on a page opened after July 2026. Spend is for security work, training time, and cloud use, not unrestricted maintainer salary.

Strings attached — three-week programme plus six- and twelve-month security check-ins; must use GitHub security features; no equity found.

Applicant type required — current maintainer of an open-source project, or a team of at most three people for one project. Must be 18 or older, have an active GitHub profile, live in a GitHub Sponsors-supported region, not be a GitHub employee, hold a clear open-source licence, show community traction, and have a clear governance structure before kick-off. An individual maintainer can apply. A legal entity is not required. Residence in a Sponsors-supported country is required to be paid. Flatbread Proof has no published governance file, so that bar is a gap.

Status — ROLLING. The official programme FAQ says applications stay open and are considered for later sessions. Session 5 was announced open on 21 July 2026. A second-hand listing (CURIOSS) gave 18 August 2026 as a Session 5 due date; that date was not confirmed on a GitHub page opened in this run.

Deadline — rolling. Next named session after Session 4 (April 2026) is Session 5 (announced July 2026). Exact Session 5 close date UNKNOWN on GitHub’s own pages.

How to apply —

1. Read the programme page and eligibility list.
2. Confirm GitHub Sponsors payout eligibility for the applicant’s country.
3. Add a governance document and a `SECURITY.md` before kick-off if those are still missing.
4. Submit the application from https://github.com/open-source/github-secure-open-source-fund/ (the page says “Submit an application”; the live form URL was not captured as a separate fetch).
5. If selected, complete a virtual interview.

Opportunity value — 46. cash/credits/exposure/research = 8/24/12/2. Cash is $10k. Session 4 Azure credits sit in the $25k–$100k band. The audience is GitHub maintainers and security staff, including TypeScript and AI-stack projects. The programme pays for security work, not memory-graph research.

Confidence — 28, LOW. No published acceptance rate. Sessions 1–2 took 71 projects and 125 maintainers; Session 3 took 67 projects; a later post says 50 projects in Session 4. Alumni include Node.js, webpack, Next.js-adjacent tooling, and widely used libraries. The bar is “demonstrated community traction” and “clear governance.” Flatbread has 64 stars, one named author, and no governance file. A strong security-scoped application can still be considered because the fund asked for maintainers deeper in the tree and solo-critical projects, but the traction and governance gaps keep acceptance well below even odds.

Fit verdict — PLAUSIBLE. The fund pays a solo maintainer and does not need a company, but it buys a security sprint, not Proof’s recall research, and the project still lacks the governance and adoption evidence the FAQ names.

Pitch angle — Proof is a typed, file-backed memory graph for coding agents. Records live as Markdown under `.flatbread-proof/` in the user’s own repository. Agents write through 16 journalled mutations and read digests capped at 25 records, one hop, 50 edges, and 64 KiB. The deliverable for this fund is a three-week security hardening of that write path: a public `SECURITY.md`, private vulnerability reporting, CodeQL on the journal and CLI, secret scanning, a signed-release plan, and a short incident-response note. GitHub would get a small TypeScript agent-tooling project that can show those controls in public, plus a 6- and 12-month check-in. The money pays the maintainer’s time for that sprint. Azure credits, if still offered, pay evaluation machines, not model tokens.

Evidence —
https://github.com/open-source/github-secure-open-source-fund/
https://github.blog/open-source/maintainers/securing-the-supply-chain-at-scale-starting-with-71-important-open-source-projects/
https://github.blog/open-source/maintainers/securing-the-ai-software-supply-chain-security-results-across-67-open-source-projects/
https://github.blog/security/supply-chain-security/investing-in-the-people-shaping-open-source-and-securing-the-future-together/
https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors

### NLnet Restack (Open Internet Stack)

Funder — NLnet Foundation (Stichting NLnet), with European Commission Horizon Europe grant agreement No. 101299072.

Track — Restack, under the Open Internet Stack umbrella.

Support type — CASH, MENTORSHIP.

Award — first proposals €5,000–€50,000. A later proposal may go up to €150,000 only after a smaller Restack or NGI project has finished, published under an open licence, met WCAG, and handled any audit. Lifetime cap per third party is €500,000. Money is a charitable gift for cost-recovery R&D: research, FOSS development, audits, CI, docs, packaging, standards work, events, project management, and essential infrastructure. Commercial rates are not paid.

Strings attached — open/free licence on all results; open-access science; two-stage review; possible security audit on grants above €50,000; memorandum of understanding; EU / Horizon-associated residents get priority given equal proposals. No equity found.

Applicant type required — individual, informal group, or any legal form, including a company, NGO, or public body. A company is not required. A first-time solo maintainer may apply. Inhabitants of the EU and Horizon Europe associated countries are preferred; applicants from elsewhere need “exceptional quality,” unique expertise, and a clear European dimension. Applicant country for this project is UNKNOWN, so that priority rule is a live gate, not a hard ban.

Status — CLOSED. The apply form is not accepting proposals today. NLnet has already named the next window: submissions start 3 September 2026.

Deadline — 3 November 2026, 12:00 CEST. After that, NLnet says future deadlines fall on the third day of every odd month until the budget is used (guide says allocation expected early 2027; the programme itself runs 1 June 2026 to 30 May 2030).

How to apply —

1. Read https://nlnet.nl/restack/eligibility/ and https://nlnet.nl/restack/guideforapplicants/.
2. Draft the short proposal offline (abstract, amount in euro, task breakdown with rates, ecosystem plan).
3. From 3 September 2026, submit at https://nlnet.nl/propose/. Select the Restack call when it appears.
4. Answer the generative-AI disclosure. If a model was used, include dates, prompts, and unedited output.
5. Wait for contact after the deadline. NLnet scores on technical excellence (30%), relevance (40%), and value for money (30%); a weighted score above 5.0/7 is needed to reach stage two.

Opportunity value — 42. cash/credits/exposure/research = 26/0/8/8. A first grant of €50,000 sits in the $25k–$100k cash band; later top-ups can go higher, but the first ask is capped at €50,000. The audience is European digital-commons reviewers and other NGI/OIS grantees, not a TypeScript or agent-tooling crowd. The eligibility list names scientific research and validation of technical solutions, so recall and graph-bound experiments can be paid work.

Confidence — 32, LOW. Across five NGI Zero programmes NLnet funded 1,215 of about 8,500 applications (about 14%). In the first five months of 2026 it received more than 2,500 applications. Restack is a new call with no published Restack-only rate. Fit to “local-first infrastructure” and “productivity tools” is real, but the project is small, has no European legal seat on file, and must show a European dimension if the maintainer lives outside the EU. A tight, costed R&D plan can pass stage one; the volume of applications keeps the chance low.

Fit verdict — PLAUSIBLE. NLnet pays individuals and funds R&D on local-first open infrastructure, and Proof is exactly that, but country is unknown and the first grant is a scoped work package, not unrestricted salary.

Pitch angle — Proof keeps an agent’s durable reasons next to the code as Markdown. An Effort holds Issue, Finding, Decision, Constraint, Risk, Citation, and Blob records. Typed edges (`derives_from`, `supersedes`, `invalidates`, `cites`) record cause and change. Reads return a digest with hard caps so a later agent does not load the whole graph. Restack asks for open building blocks for a competitive, robust internet stack, including local-first infrastructure and productivity tools. The money would pay a first €5,000–€50,000 work package: publish the record model and journal semantics, run a bounded-recall evaluation across three model families, and write the method so another team can repeat it. The funder would get public code, public records, and an open-access write-up of whether typed, capped memory changes a later agent’s tool use. That is a concrete brick in an open stack that does not depend on a hosted memory vendor.

Evidence —
https://nlnet.nl/propose/
https://nlnet.nl/restack/
https://nlnet.nl/restack/eligibility/
https://nlnet.nl/restack/guideforapplicants/
https://nlnet.nl/restack/faq/
https://nlnet.nl/funding.html
https://nlnet.nl/news/2026/20260803-phaseshift.html
https://nlnet.nl/news/2026/20260612-NGIZero-stocktaking.html

### Prototype Fund (Software Sprint), class 03

Funder — Prototype Fund / Open Knowledge Foundation Germany, with funds from the German Federal Ministry of Research, Technology and Space (BMFTR).

Track — Prototype Fund class 03 (regular six-month phase, optional four-month Second Stage).

Support type — CASH, MENTORSHIP, EXPOSURE.

Award — individual: up to €47,500 for six months, or €79,167 for ten months. Team (max four): up to €95,000 for six months, or €158,000 for ten months. Hourly rate capped at €50. Regular phase is 950 hours at €50 for one full-time person. Second Stage: up to €31,667 (individual) or €63,333 (team) for four months. Money pays developer time on a software prototype in data security or software infrastructure. Class 03 regular phase runs 1 June 2027 to 1 December 2027; Second Stage 1 December 2027 to 31 March 2028.

Strings attached — open-source licence; Demo Day after six months; formal grant from BMFTR; teams must form a German GbR; no payments to companies, associations, universities, or other institutions; no subcontracting; no double funding of the same idea. Coaching is offered. No equity found.

Applicant type required — individual developer or a team of at most four natural persons. Individuals must live in Germany, be self-employed or freelance (or be released part-time by an employer), and pay tax in Germany. Teams form a GbR seated in Germany after selection; the managing partner must live in Germany; other funded members may live elsewhere in the EU. Companies, clubs, and universities cannot be payees. Applicant country is UNKNOWN, so this is a hard gate until Tony Ketcham states German residence (individual) or a German-seated GbR (team).

Status — CLOSED. The class 03 form is not open today. The published window is 1 October 2026 to 30 November 2026.

Deadline — 30 November 2026.

How to apply —

1. Confirm German tax residence (individual) or a plan to form a German GbR (team).
2. From 1 October 2026, open the application platform linked from https://www.prototypefund.de/bewerbung.
3. Answer the listed questions in German or English (title, short description, social problem, technical plan, current state, related work, audience, milestones, team names, prior software work with repo links, hours, background, Second Stage request).
4. Wait for jury and BMFTR review (feedback in March 2027 on the published timeline).
5. If selected, attend the formal-application workshop and file the BMFTR application by the end of February 2027.

Opportunity value — 37. cash/credits/exposure/research = 26/0/6/5. An individual award of €47,500 sits in the $25k–$100k cash band. The audience is German civic-tech and infrastructure juries, not mainly TypeScript agent developers. The software-infrastructure track can pay for libraries aimed at other programmers, including evaluation work inside the prototype period, but the frame is a six-month prototype, not a long research programme.

Confidence — 0, VERY LOW. Applicant country is UNKNOWN, and an individual must live in Germany and pay tax there. A programme the project cannot apply to scores 0. If German residence is later confirmed, a revised score would still be LOW: about 30 projects per class, no published applicant count, and a jury test against similar existing open-source products.

Fit verdict — INELIGIBLE until the applicant is a Germany-resident freelancer or a German-seated GbR; PLAUSIBLE after that, because the fund pays solo developers for open software infrastructure.

Pitch angle — Proof is a small TypeScript library that stores an agent’s durable reasons as reviewable Markdown in the user’s git tree. It is infrastructure for other developers, not an end-user app. The Prototype Fund’s software-infrastructure track funds exactly that class of module. A class 03 prototype would ship a tighter recall path: instrumented provider-call logs, a four-task recall suite (status, rationale, supersession, risk synthesis), and public fixtures so others can rerun the 3×2×2 design. The ministry would get a working open prototype, a Demo Day demo, and a six-month public changelog. The money pays one person’s hours at the published €50 cap.

Evidence —
https://www.prototypefund.de/bewerbung
https://www.prototypefund.de/en/
https://www.prototypefund.de/en/funding
https://www.prototypefund.de/en/faq
https://okfn.de/en/projekte/prototypefund/

### Sovereign Tech Fund

Funder — Sovereign Tech Agency GmbH, financed by the German Federal Ministry for Digital Transformation and Government Modernisation; subsidiary of SPRIND.

Track — Sovereign Tech Fund (open application for contracts on open digital base technologies).

Support type — CASH.

Award — work described in the application must cost more than €50,000 (current minimum). No maximum was stated on the live programme page. Money is paid under a contract, against invoices tied to progress reports, for development or maintenance of base technologies. Security audits, conference travel, and community events may be included if needed. Payment can take up to 30 days after an approved invoice. Time from submit to contract start is about six months.

Strings attached — contract, legal compliance review, regular progress reports (often with invoices), final impact report. No other public money for the same activities. OSI or FSF licence on code; documentation licences may not be NC or ND. No equity found. Prototype development is excluded.

Applicant type required — the live fund page does not list a closed set of legal forms. It speaks of “the person or persons who submitted the application,” then a contract after legal review. The November 2024 sample form asks who would receive the money (maintainer, contributor, organization, fiscal host) and asks the applicant to confirm they can sign a contract. The Agency FAQ says it works with “people, companies, and FOSS communities everywhere.” A second-hand 2023 Challenges PDF said individuals and teams of all legal forms, inside or outside the EU, with one contractor of record. Treat the current gating fact as: someone who can sign a German public-procurement-style contract, anywhere in the world; a company is not required on the live page, but a fiscal host or other signatory may be needed in practice. UNVERIFIED whether an unincorporated solo maintainer can be the contractor of record without a host — the live page does not say.

Status — ROLLING. The application platform is open again; incoming applications are reviewed on an ongoing basis.

Deadline — rolling. First response within 10 weeks. Full path about six months.

How to apply —

1. Read https://www.sovereign.tech/programs/fund and confirm the work is not a prototype and costs more than €50,000.
2. Create an account on the application platform (sample form points to https://apply.sovereigntechfund.de; that URL was confirmed in search, but a full fetch of the portal timed out).
3. Opt in to email or SMS, or you will not get a receipt.
4. Submit in German or English through the portal only.
5. If the first two review stages pass, scope the work with a programme manager, then wait for expert review and contracting.

Opportunity value — 36. cash/credits/exposure/research = 26/0/6/4. The published floor is €50,000, which sits in the $25k–$100k cash band; larger historic contracts exist but are not a promised range. The audience is German digital-sovereignty staff and other base-technology maintainers, not a TypeScript agent community. Contracts pay maintenance and security, not a free-standing memory-research agenda.

Confidence — 18, VERY LOW. No acceptance rate is published. Selection uses prevalence, relevance, vulnerability, public interest, activities, and expertise. Prevalence is defined as wide use inside other technologies. This repository has 64 stars and no stored dependent count. The fund also says it does not finance prototypes. Proof is a shipped 1.1.0 library, but it is not widely depended on. A solo maintainer can be the applicant on the form, yet the prevalence bar is the real reject.

Fit verdict — WEAK. The fund can pay an individual under a contract and lists developer administration tools as in scope, but it wants prevalent base technology and rejects prototypes, and Proof cannot yet show wide downstream use.

Pitch angle — Proof is an open TypeScript library that other agent tools can depend on: a small, journalled graph of Decisions and Findings that a later agent reads through capped queries. The Sovereign Tech Fund invests in libraries and developer tools that other software sits on. The contract would pay to harden that base layer: recovery tests, an SBOM, a disclosure policy, and a documented API so downstream agent runtimes can pin a stable release. The Agency would get a public contract report and a more reviewable, local-first memory component for European developer tooling. Do not pitch this as a new product idea. Pitch it as maintenance of an existing MIT library, and only after dependents can be named.

Evidence —
https://www.sovereign.tech/programs/fund
https://www.sovereign.tech/faq
https://www.sovereign.tech/news/new-proposals-criteria-process-timeline
https://www.sovereign.tech/public/files/Application-Form-Sovereign-Tech-Fund-1-November-2024.pdf
https://apply.sovereigntechfund.de/

### Sovereign Tech Fellowship

Funder — Sovereign Tech Agency GmbH.

Track — Sovereign Tech Fellowship (2026 cohort; next intake not dated).

Support type — CASH, MENTORSHIP, EXPOSURE.

Award — freelance: 3 to 12 months, 6 to 32 hours per week, hourly rate negotiated to market. Employment (Germany only): two years, 20 to 40 hours per week, €64,000–€82,000 per year full-time on TVöD-Bund, 30 days leave. The 2026 call hired “up to twelve” fellows; the published cohort was 14 people (12 freelance, 2 employed).

Strings attached — not paid twice for the same work; not an application on behalf of an employer (use the Fund instead); active engagement in Agency events and reporting; full-time employed fellows also advise the Agency. Mentoring is voluntary.

Applicant type required — individual only. Freelance: no organisation applying for staff it employs. Employment: must live in Germany and be able to sign a German work contract. Maintainer track: maintainer of or contributor to at least three FOSS projects, and maintainer (merge or release rights) of at least one. Community-manager and technical-writer tracks have their own bars. English required. German not required for the fellowship.

Status — NEXT-CALL-UNANNOUNCED. The 2026 window closed 6 April 2026. The page says the Agency will recruit again after the March 2026 phase and will announce details on social channels and the newsletter. No 2027 date is published.

Deadline — PASSED: 6 April 2026, 23:59 CET. Next deadline UNKNOWN.

How to apply —

1. Watch https://www.sovereign.tech/programs/fellowship and the Agency newsletter.
2. When a portal opens, submit one application in English.
3. Maintainer applicants must show three FOSS projects and merge/release rights on at least one.
4. Freelance applicants must confirm they are not applying for an employer’s headcount.

Opportunity value — 35. cash/credits/exposure/research = 26/0/6/3. A year of freelance time or a €64,000–€82,000 salary sits in the $25k–$100k cash band. The 2026 cohort was Rust and Python heavy; TypeScript agent tooling was not the stated audience. The fellowship pays people to make projects sustainable, including mentoring, not a separate research grant.

Confidence — 0 for the closed 2026 call. For a future call, about 12–14 seats against 170 applications in 2026 (20 employee + 150 freelance) is roughly 8%. That would be LOW even if the three-project and prevalence bars are met. This repository names one author and does not establish three maintained projects.

Fit verdict — INELIGIBLE for the 2026 call (closed). For a later call, WEAK unless the applicant is a maintainer across three FOSS projects and can show those projects as prevalent base technology.

Pitch angle — Hold this pitch until a new window opens and the three-project bar is real. Then: the applicant maintains Proof, a local graph of agent Decisions and Findings that people review in git. The fellowship would buy hours for review, onboarding docs, and contributor mentoring so the project is not a single-person bottleneck. The Agency would get a fellow who can report on how agent-memory tools should be maintained as public infrastructure. Do not apply on behalf of FlatbreadLabs as a company.

Evidence —
https://www.sovereign.tech/programs/fellowship
https://www.sovereign.tech/news/2026-fellowship-applications-open
https://www.sovereign.tech/news/meet-the-2026-sovereign-tech-fellows

### FLOSS/fund (Zerodha)

Funder — Zerodha (Indian brokerage), operating FLOSS/fund.

Track — FLOSS/fund open directory / periodic tranche review.

Support type — CASH.

Award — $10,000 minimum, then multiples of $25,000, up to $100,000 in one year. The fund states up to $1 million per year. Year two (2026) was announced as a fresh $1 million. Money is for sustainability of existing, widely used projects. A public acknowledgement with a link is requested, not required as a legal exclusivity term.

Strings attached — public `funding.json` listing; Indian tax-residency paperwork; disbursal has taken 4–16 weeks. Some 2025 recipients chose GitHub Sponsors to avoid direct paperwork. A GitHub Sponsors partnership was still awaiting Indian regulatory approval in the anniversary post. No equity found.

Applicant type required — individual, project, group, community, or organisation. The applicant or entity must have a bank account and the tax documents needed to receive funds. A company is not required. Very new or low-use projects are not considered.

Status — ROLLING. Listings stay in the directory and are re-evaluated. The FAQ still says the committee reviews at the end of every quarter; the anniversary post said 2025 tranches were late because applications were sporadic.

Deadline — perpetual listing; committee review at quarter end per the FAQ. Next named 2026 tranche date UNKNOWN.

How to apply —

1. Publish a `funding.json` (see fundingjson.org) on the project site or repository.
2. Submit the URL to the FLOSS/fund directory (linked from https://floss.fund/faq/).
3. Wait. There is no status tracker. If selected, complete tax paperwork by email (up to four weeks after that, per the FAQ; 4–16 weeks in 2025 practice).

Opportunity value — 32. cash/credits/exposure/research = 26/0/4/2. The published ask range is $10,000–$100,000. The audience is an Indian brokerage’s committee and the public directory, not a TypeScript agent community. The fund pays sustainability, not a research programme.

Confidence — 16, VERY LOW. About 300 applications in year one. Recipients named in the anniversary post include large, widely used projects (Blender, OpenSSL, OSM, FFmpeg, Krita, Python Software Foundation). The FAQ says new or low-use projects are out. 64 stars and no stored download or dependent count sit below that bar. No acceptance rate is published.

Fit verdict — WEAK. The fund can pay an individual and does not need a company, but it currently selects widely used, impactful projects, and Proof cannot yet show that usage.

Pitch angle — Publish `funding.json` anyway so the listing exists for later review. The text should say Proof is a MIT TypeScript library that keeps agent reasoning in the user’s git tree, with 16 typed writes and capped reads, and that the ask is maintainer time to keep that library current. Name a concrete yearly amount in the allowed steps ($10,000 or $25,000). Do not claim criticality you cannot measure. The funder would get a public acknowledgement and a project that stays maintained. Revisit after dependents and download counts exist.

Evidence —
https://floss.fund/
https://floss.fund/faq/
https://floss.fund/blog/announcing-floss-fund/
https://floss.fund/blog/second-tranche-2025-anniversary/

### NLnet ELFA (Encrypted Local First Architecture)

Funder — NLnet Foundation, Horizon Europe grant agreement No. 101298715.

Track — ELFA open calls (10% of the ELFA budget, stated as €300,000) for auxiliary FOSS aligned with encrypted, local-first collaborative software.

Support type — CASH, MENTORSHIP.

Award — €5,000–€50,000 per proposal. Lifetime cap per third party UNKNOWN on the ELFA pages opened (CodeSupply’s cap is €60,000; do not copy that number here). Eligible work matches the Restack-style list: research, FOSS development, validation, audits, docs, packaging, events.

Strings attached — recognised free/open licence; Open Internet Stack goals; same EU-priority rule as Restack. No equity found.

Applicant type required — no categorical exclusions; individuals and organisations. EU / Horizon-associated residents preferred; others need exceptional quality, unique expertise, and a European dimension.

Status — NEXT-CALL-UNANNOUNCED on the ELFA page (“first call will open up soon”), but NLnet’s shared apply page says several funds open 3 September 2026 with deadline 3 November 2026, 12:00 CEST.

Deadline — 3 November 2026, 12:00 CEST, if ELFA is among the “several funds” on the apply page. The ELFA page itself does not yet name that date.

How to apply —

1. Read https://nlnet.nl/ELFA/ and https://nlnet.nl/ELFA/eligibility/.
2. From 3 September 2026, check https://nlnet.nl/propose/ for an ELFA call option.
3. Submit a short English proposal for auxiliary local-first work, not a GNU Taler or Fediversity idea.

Opportunity value — 27. cash/credits/exposure/research = 16/0/4/7. A first grant of €5,000–€50,000 spans the $5k–$25k and $25k–$100k cash bands; score the common first ask at the lower published bound’s band (16) because the page does not promise the top of the range. ELFA’s own suite is document, mail, and social apps. Exposure to TypeScript agent developers is low. The topic is local-first architecture, which can pay research on offline-first, encrypted project memory.

Confidence — 20, LOW. No ELFA-specific acceptance rate. The core ELFA suite is collaborative end-user apps (editor, mail, calendar, chat). Proof is local-first agent memory in a git tree, not that suite. A proposal would have to be an auxiliary building block (local-first records, sync-free review, bounded recall) with a clear European dimension. That is a stretch, not a match.

Fit verdict — WEAK. Individuals can apply, and local-first is the right phrase, but ELFA’s published suite is encrypted collaborative apps, not agent-memory tooling.

Pitch angle — Only apply if the call text still allows “foundational technologies” as well as the app suite. Then: Proof stores Decisions and Findings on disk as ordinary files so two people, or two agent sessions, can work from the same history without a host. ELFA wants local-first software that works when people are not continuously online. The grant would pay a local-first memory module that an ELFA-style app, or an agent sitting next to one, can read through capped queries. The deliverable is public code and a short evaluation of recall with and without the graph. Do not claim Proof is a document editor or a social network.

Evidence —
https://nlnet.nl/ELFA/
https://nlnet.nl/ELFA/eligibility/
https://nlnet.nl/propose/
https://nlnet.nl/news/2026/20260803-phaseshift.html

### Alpha-Omega seasonal grants

Funder — Alpha-Omega, an OpenSSF / Linux Foundation project, funded by Anthropic, AWS, Citi, GitHub, Google, Google DeepMind, Microsoft, and OpenAI (names from the March 2026 Linux Foundation announcement and the Alpha-Omega site).

Track — Alpha-Omega Seasonal Grant Program (12-week quarters).

Support type — CASH, MENTORSHIP.

Award — UNKNOWN on the live how-to-apply page. A disabled block on that same page mentioned typical $50,000–$100,000 USD; that block is marked `disable_element` and is not treated as current. The live text says amounts vary with the proposal and gives “funding a full-time maintainer,” fuzzing, and hiring auditors as example activities. Monthly public reports and three blog posts are required.

Strings attached — public monthly reports; monthly strategy roundtables; beginning/middle/end blog posts; OSI-approved licence; future funding depends on progress. No equity found.

Applicant type required — standalone project, foundation covering many projects, or core ecosystem service. The grant can go to “the project or organization.” The page does not say an individual can be the payee. UNVERIFIED whether a solo maintainer without a fiscal host can receive the grant.

Status — OPEN for the next submission month. Q3 2026 (July) has closed. Q4 submission is 1–31 October 2026.

Deadline — 31 October 2026 (Q4 submission). Then Q1 2027: 1–31 January 2027.

How to apply —

1. Read https://alpha-omega.dev/grants/how-to-apply/.
2. Between 1 and 31 October 2026, submit the intake form: https://docs.google.com/forms/d/e/1FAIpQLSd2dhZR8qSCRxiHFB12S-qQV4EQ4BC9GkYvFUN5G-gbpLqNdw/viewform
3. If invited, spend November co-writing a Statement of Work with Alpha-Omega staff.
4. Funding decisions in December 2026.

Opportunity value — 24. cash/credits/exposure/research = 16/0/6/2. Cash is scored in the $5k–$25k band because the live page does not state a current amount; a full-time maintainer example could be larger, but that is not a published range. The audience is critical-infrastructure security staff. The grant pays security transformations, not memory-graph research.

Confidence — 12, VERY LOW. No acceptance rate. Evaluation is “degree of security impact” and whether the project is critical infrastructure. 2024 work named Python, OpenJS, RubyGems, Linux, Homebrew. Proof is not that class of dependency. The payee type for a solo maintainer is also unset.

Fit verdict — WEAK. The next window is real and a standalone MIT project may submit, but the programme is for critical-infrastructure security, and Proof is not a widely depended-on runtime.

Pitch angle — Only if the Q4 form still allows standalone projects. Then: Proof’s write path is a journal with rename-based recovery. The security outcome is a public threat model of that journal, fuzzing of the 16 mutations, and a disclosure policy. Alpha-Omega would get monthly public notes and a before/after security posture post. Do not claim Proof is critical internet infrastructure.

Evidence —
https://alpha-omega.dev/grants/how-to-apply/
https://alpha-omega.dev/blog/announcing-the-new-alpha-omega-seasonal-grant-program/
https://openssf.org/press-release/2026/03/17/linux-foundation-announces-12-5-million-in-grant-funding-from-leading-organizations-to-advance-open-source-security/

### NLnet CodeSupply

Funder — NLnet Foundation / CodeSupply consortium, Horizon Europe grant agreement No. 101298846.

Track — CodeSupply open calls (€400,000 reserved for auxiliary FOSS on software-supply-chain metadata).

Support type — CASH, MENTORSHIP.

Award — first proposal up to €50,000. Maximum per proposal €60,000. Lifetime cap per third party €60,000. Programme runs 1 June 2026 to 30 May 2029; new calls until the budget is gone (expected early 2027).

Strings attached — open licence; European dimension as a knock-out; same two-stage scoring as Restack; grants are charitable gifts to individuals, companies, NGOs, or other entities.

Applicant type required — individual or organisation. No categorical exclusions. EU / Horizon-associated residents preferred.

Status — first call “will open up soon” on the CodeSupply page; shared NLnet apply page says several funds open 3 September 2026.

Deadline — 3 November 2026, 12:00 CEST, if CodeSupply appears on the apply form that day.

How to apply —

1. Read https://nlnet.nl/codesupply/guideforapplicants/ and https://nlnet.nl/codesupply/eligibility/.
2. From 3 September 2026, submit at https://nlnet.nl/propose/ if a CodeSupply call is listed.
3. Keep the proposal inside packaging metadata, SBOMs, licence data, or other supply-chain metadata work.

Opportunity value — 23. cash/credits/exposure/research = 16/0/4/3. First grants are €5,000–€50,000. The topic is package metadata, not agent memory. Research is allowed only if it serves CodeSupply’s metadata goals.

Confidence — 15, VERY LOW. No CodeSupply-specific rate. Proof is not a packaging-metadata project. A forced SBOM pitch would be off-scope unless it produces shared supply-chain data.

Fit verdict — WEAK. Individuals can apply, but the published goal is software-package metadata for supply-chain security, not a record graph for agents.

Pitch angle — Do not force this unless the call text is broader than the current page. A honest proposal would have to produce open package metadata or tooling that CodeSupply can ingest. Proof’s own SBOM is a project hygiene task, not a CodeSupply outcome.

Evidence —
https://nlnet.nl/codesupply/
https://nlnet.nl/codesupply/guideforapplicants/
https://nlnet.nl/codesupply/eligibility/
https://nlnet.nl/propose/

### FUTO Fellows

Funder — FUTO.

Track — FUTO Fellows Program.

Support type — CASH, MENTORSHIP, EXPOSURE.

Award — up to $40,000, plus round-trip airfare to Austin, free housing for three months, incubator space, and mentorship. Fellows work from FUTO’s Austin campus. International applicants are welcome; all fellows must travel to Austin.

Strings attached — three-month Austin residency; “exceptional individuals with unique projects.” How-to-apply asks for a CV and answers, but the live page did not render the question list beyond “Requirements.”

Applicant type required — individual. Not a company application.

Status — ROLLING. “Applications are now open” on https://www.futo.org/grants/; fellows page says applications are reviewed on a rolling basis.

Deadline — rolling.

How to apply —

1. Email grantapps@futo.org with a CV and the answers requested on https://futo.tech/grants/fellows.
2. Be ready to spend three months in Austin.

Opportunity value — 23. cash/credits/exposure/research = 16/0/4/3. $40,000 is in the $25k–$100k cash band. The audience is FUTO’s Austin circle (right-to-repair, user-control software), not a TypeScript agent conference. Some research time is possible inside the residency, but the page does not pay for a multi-model evaluation programme.

Confidence — 18, VERY LOW. No acceptance rate. The page says the programme is reserved for exceptional individuals with unique projects. Travel to Austin is mandatory. Applicant country and visa capacity are UNKNOWN.

Fit verdict — PLAUSIBLE as an individual, if the maintainer can live in Austin for three months and accept FUTO’s user-control frame.

Pitch angle — Proof keeps an agent’s reasons in the user’s own repository so a person, not a vendor, holds the memory. That matches FUTO’s stated aim: software that gives people control and challenges a hosted oligopoly. The residency would produce a local-only agent-memory workflow people can run without a cloud account, plus public notes from the three months. The $40,000 pays living and work time in Austin. Do not pitch a hosted service.

Evidence —
https://www.futo.org/grants/
https://futo.tech/grants/fellows

### GitHub Sponsors

Funder — people and organisations who sponsor a GitHub profile. GitHub takes no fee on personal-account sponsorships; up to 6% on organisation-account sponsorships (3% card, 3% GitHub; invoice billing can drop the card fee).

Track — GitHub Sponsors (personal or organisation profile). The Matching Fund is closed (applications after 1 January 2020 are ineligible).

Support type — CASH, EXPOSURE.

Award — UNKNOWN. Sponsors set one-time or monthly amounts. There is no programme award. Realistic income for a 64-star solo project is UNKNOWN and likely small.

Strings attached — GitHub Sponsors Additional Terms. Payouts require residence in a supported region (the docs list includes the United States, Germany, the Netherlands, India, the United Kingdom, and many others). Fiscal hosts on the supported list include Open Source Collective, Open Collective Europe, NumFOCUS, Python Software Foundation, Software in the Public Interest, Hack Club, and Radiant Earth.

Applicant type required — an individual contributor who lives in a supported region, or an organisation that legally operates in a supported region. A company is not required. Applicant country is UNKNOWN.

Status — ROLLING.

Deadline — none. Sign-up is continuous.

How to apply —

1. Confirm the applicant’s country is on the Sponsors region list at https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors.
2. For a personal profile: https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/setting-up-github-sponsors-for-your-personal-account
3. For a project organisation, either attach Stripe Connect or a listed fiscal host at sign-up.
4. Keep `.github/FUNDING.yml` current.

Opportunity value — 18. cash/credits/exposure/research = 8/0/10/0. Cash is scored in the up-to-$5k band because no award is promised. The button sits in front of TypeScript and AI-agent developers on GitHub. It does not pay research.

Confidence — 70, HIGH, for being accepted onto Sponsors if the country is supported (the docs say anyone in a supported region who contributes to open source is eligible). Confidence of meaningful income is much lower and is not the score above. If the country is unsupported, confidence of payout is 0 until a waitlist or fiscal host works.

Fit verdict — STRONG as a payout rail for an individual; WEAK as a source of research-scale cash until adoption grows.

Pitch angle — This is not a grant pitch. It is a public ask: Proof is MIT, file-backed agent memory, reviewed in ordinary pull requests. Sponsors pay maintainer time. Put that in one short profile paragraph and in `FUNDING.yml`.

Evidence —
https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors
https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/using-a-fiscal-host-to-receive-github-sponsors-payouts

### FUTO Microgrants

Funder — FUTO.

Track — FUTO Microgrants.

Support type — CASH.

Award — one-time $1,000–$5,000 for small or early-stage projects. The page says many microgrants are unsolicited staff picks. Cumulative microgrant figure on the page: $60,000+ across 52 projects.

Strings attached — none found beyond FUTO’s public pledges on its about pages (not re-fetched as a full policy). No equity found.

Applicant type required — the grants page invites applications by email and lists small or early-stage projects. It does not require a company. Legendary Grants are separate and “generally reserved for established entities we trust.”

Status — OPEN. “Applications are now open.”

Deadline — rolling. Cadence UNKNOWN.

How to apply —

1. Email grantapps@futo.org from https://www.futo.org/grants/.
2. Describe the project and why it gives users more control.
3. Do not frame this as a Legendary Grant.

Opportunity value — 13. cash/credits/exposure/research = 8/0/4/1.

Confidence — 30, LOW. No rate. The microgrant list includes early and well-known projects. A short, honest email from a solo MIT maintainer matches the stated early-stage band. Selection is discretionary.

Fit verdict — PLAUSIBLE. FUTO pays small cash to early projects and to individuals, and Proof is a small user-controlled tool, not a hosted service.

Pitch angle — Proof stores an agent’s Decisions in the user’s git tree so the next session, and the human reviewer, can see why a change was made. That is user-held memory, not a vendor store. A $1,000–$5,000 microgrant would pay a bounded-recall rerun with provider-token logs and a public Finding. FUTO would get that write-up and a link from the project.

Evidence —
https://www.futo.org/grants/

### thanks.dev

Funder — companies that donate through thanks.dev (the live donor table on 23 August 2026 included Sentry, Codecov, Canonical, and others). thanks.dev takes a commission; Canonical’s 2022 post said 5%. Current fee UNVERIFIED on a full thanks.dev fetch (the homepage timed out; a search extract of https://www.thanks.dev/ was used).

Track — thanks.dev dependency-tree distribution.

Support type — CASH.

Award — UNKNOWN per maintainer. Allocation follows how often a project appears in a donor’s dependency tree (up to three levels, per Canonical’s description). A project with few dependents receives little or nothing.

Strings attached — maintainer must register/claim the project or allocated money does not pay out (stated on Hacker News by the operator and repeated in a 2026 explainer). No equity found.

Applicant type required — a maintainer who can claim the GitHub (or supported) project. A company is not required.

Status — ROLLING.

Deadline — none.

How to apply —

1. Sign in at https://www.thanks.dev/ and claim the repository.
2. Connect a payout method.
3. Leave the project in public dependency graphs (npm `flatbread`, `@flatbread/proof`).

Opportunity value — 12. cash/credits/exposure/research = 8/0/4/0. Cash is scored in the lowest band because no amount is promised and dependents are uncounted.

Confidence — 55, MODERATE, for a successful claim. Confidence of material income is low until npm dependents exist. No published “acceptance” rate; claiming is the bar.

Fit verdict — PLAUSIBLE as a receive rail for a solo maintainer; WEAK as a cash plan at current adoption.

Pitch angle — There is no pitch. Claim the repo so any later corporate drip can land.

Evidence —
https://www.thanks.dev/
https://canonical.com/blog/canonical-thanks-dev-giving-back-to-open-source-developers

### ecosyste.ms Funds

Funder — companies that sponsor an ecosyste.ms ecosystem fund; distribution in partnership with Open Source Collective.

Track — ecosyste.ms Funds.

Support type — CASH.

Award — UNKNOWN. Allocation is by usage among 240 million tracked repositories and 10.7 million packages, published monthly. A 10% fee is stated on the overview page. Payment follows the project’s `funding.yml`.

Strings attached — 10% fee; must declare a funding method. No equity found.

Applicant type required — a project that can receive money through the method in `funding.yml`. A company is not required. OSC hosting is one path.

Status — ROLLING (funds exist; there is no project “call”).

Deadline — none. Set `funding.yml` and wait.

How to apply —

1. Keep a valid `.github/FUNDING.yml`.
2. Read https://funds.ecosyste.ms/overview.
3. There is no application to “join” a fund; usage metrics decide the split.

Opportunity value — 12. cash/credits/exposure/research = 8/0/4/0.

Confidence — 40, MODERATE, that a declared funding method will be honoured if the project is ever allocated a share. Confidence of a share at 64 stars is low. No acceptance rate (this is not a judged call).

Fit verdict — PLAUSIBLE as plumbing; WEAK as income until usage is visible in ecosyste.ms data.

Pitch angle — None. Publish funding metadata.

Evidence —
https://funds.ecosyste.ms/
https://funds.ecosyste.ms/overview

### Open Source Collective fiscal hosting

Funder — not a grant maker. Open Source Collective is a US 501(c)(6) fiscal host (EIN 82-2037583). It takes a 10% host fee on incoming funds.

Track — OSC fiscal sponsorship on Open Collective.

Support type — CASH (receive and pay out other people’s money), EXPOSURE.

Award — none from OSC itself. Hosting is the legal wrapper that can receive invoices, hold a bank path, sign contracts, take GitHub Sponsors as an organisation, and accept some grants that need a legal recipient.

Strings attached — 10% host fee; payment-processor fees; Terms of Fiscal Sponsorship; project should live under a GitHub organisation, not only a personal account; preferably two Open Collective admins. Contributions to OSC-hosted collectives are not US charitable deductions.

Applicant type required — an open-source project that meets OSC legitimacy, licence, and governance rules. Applicant should be a maintainer, not only a contributor. No US company is required; OSC is the legal recipient. Solo projects on a personal GitHub account fail the “organizational repository” rule until the repo moves under an org.

Status — ROLLING. Applications reviewed weekly.

Deadline — none.

How to apply —

1. Read https://docs.oscollective.org/interested-in-joining-osc/acceptance-criteria.md and the fee page.
2. Move the canonical repo to a GitHub organisation if it is still personal.
3. Prefer two admins.
4. Apply at https://opencollective.com/opensource/apply/intro (GitHub verification or manual).

Opportunity value — 10. cash/credits/exposure/research = 8/0/2/0. OSC does not award cash; it is scored as a low cash rail because it is the usual legal wrapper for later grants.

Confidence — 50, MODERATE. OSC says projects that meet the criteria and do not conflict with the Terms are likely to be approved. The organisational-repo rule is the current fail.

Fit verdict — STRONG as infrastructure for a solo maintainer who will later need a legal payee; not a grant.

Pitch angle — None. Apply so later funders can write a cheque to OSC for Flatbread Proof.

Evidence —
https://opencollective.com/opensource/apply
https://docs.oscollective.org/how-to-apply
https://docs.oscollective.org/interested-in-joining-osc/acceptance-criteria.md
https://docs.oscollective.org/welcome-and-introduction-to-osc/fees.md
https://docs.oscollective.org/campaigns-and-partnerships/github-sponsors

### Drips

Funder — whoever streams ERC-20 tokens to a Drip List that includes the repository.

Track — Drips Network project claim and dependency splits.

Support type — CASH.

Award — UNKNOWN. Funds settle monthly on Ethereum (last Thursday) or daily on Filecoin and OP Mainnet. Nothing arrives unless someone streams to the project or a list that contains it.

Strings attached — Ethereum wallet; `FUNDING.json` on the default branch; public on-chain splits. This is crypto, not a bank grant.

Applicant type required — a maintainer who can commit `FUNDING.json` and control an Ethereum address. No company required.

Status — ROLLING.

Deadline — none.

How to apply —

1. Open the Drips app, connect a wallet, Projects → Claim project.
2. Commit the generated `FUNDING.json` to the default branch.
3. Set maintainer and dependency splits.
4. Collect from the wallet when funds appear.

Opportunity value — 10. cash/credits/exposure/research = 8/0/2/0.

Confidence — 60, HIGH, for a successful claim if the maintainer can commit the file. Confidence of income is separate and low.

Fit verdict — PLAUSIBLE as a claimable rail; WEAK as a plan for maintainer salary.

Pitch angle — None. Claim if the project is willing to hold an Ethereum address.

Evidence —
https://docs.drips.network/
https://docs.drips.network/get-support/claim-your-repository/

### FUTO Legendary Grants

Funder — FUTO.

Track — Legendary Grants.

Support type — CASH.

Award — UNKNOWN per project. The page says more than $5 million across 20 projects, reserved for established open-source projects and traditional nonprofits with significant impact, with an ongoing relationship.

Strings attached — ongoing relationship; reserved for entities FUTO already trusts. No equity found.

Applicant type required — established entity FUTO trusts. A new unincorporated solo project is outside the stated band.

Status — OPEN for contact (same apply mailbox).

Deadline — rolling.

How to apply —

1. Email grantapps@futo.org.
2. Expect this track to be declined unless FUTO already knows the project.

Opportunity value — 20. cash/credits/exposure/research = 16/0/3/1. Per-project amount UNKNOWN; “large-scale” is the only published size word.

Confidence — 8, VERY LOW. The page says these grants are generally reserved for established entities they trust. Recipients on the page include Signal, Tor, Ladybird, CalyxOS, NetBSD.

Fit verdict — WEAK. The mailbox is open, but the stated track is for established entities, not a 64-star solo library.

Pitch angle — Do not lead with this track. If FUTO replies to a microgrant or fellows email and asks for a larger relationship, then describe Proof as user-held agent memory and name a concrete multi-year maintenance deliverable.

Evidence —
https://www.futo.org/grants/

## Screened out

- NGI Zero Commons Fund — thirteenth and final call closed 1 June 2026; no new applications. https://nlnet.nl/commonsfund/
- NGI Zero Core — eighth and final call closed 1 October 2024. https://nlnet.nl/core/
- NGI Mobifree — ninth and final call closed 1 December 2025; mobile-software remit. https://nlnet.nl/mobifree/
- NGI TALER — fourteenth and final call closed 1 August 2026; GNU Taler payments only. https://nlnet.nl/taler/
- NGI Fediversity — twelfth and final call closed 1 August 2026; Nix/NixOS hosting stack only. https://nlnet.nl/fediversity/
- NGI Zero Review — ended 31 July 2026; services only for projects that already had an NGI grant. https://nlnet.nl/NGI0/review/
- Mozilla Open Source Support (MOSS) — indefinite hiatus since the 2020 Mozilla restructuring; not accepting applications. https://www.mozilla.org/en-US/moss/
- Mozilla Builders Accelerator — last published dates are 2024 (apply by 1 August 2024). https://builders.mozilla.org/programs/
- Mozilla MIECO — named only as a 2023 past programme on the Builders site; no 2026 apply page opened. https://builders.mozilla.org/programs/
- Mozilla Technology Fund — MOSS page points here; the Foundation MTF pages that loaded describe 2022–2024 AI/environment cohorts, not a 2026 maintainer call. A full 2026 MTF call page was not opened successfully. https://www.mozilla.org/en-US/moss/
- Mozilla Pioneers — closed 16 February 2026; pays people to build Mozilla products, not to maintain independent FOSS. https://newproducts.mozilla.org/mozilla-pioneers/
- GitHub Accelerator 2024 — applications closed 5 March 2024; no 2025 or 2026 cohort page found. https://accelerator.github.com/
- GitHub Sponsors Matching Fund — eligibility passed; applications after 1 January 2020 are ineligible. https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors
- GitHub Fund — M12/GitHub venture vehicle for pre-seed and seed companies; equity, not a maintainer grant. https://accelerator.github.com/
- Open Technology Fund Internet Freedom Fund — remit is circumvention, censorship research, and digital security in repressive contexts, not agent-memory developer tooling. https://www.opentech.fund/funds/internet-freedom-fund/
- OTF Free and Open Source Software Sustainability Fund — not accepting applications; remit is the internet-freedom tool stack. https://www.opentech.fund/funds/free-and-open-source-software-sustainability-fund/
- Sovereign Tech Resilience — services (audits, debt, CRA), not maintainer cash; same prevalence bar as the Fund; May 2026 standards-pilot text is a different track. https://www.sovereign.tech/programs/bug-resilience
- Microsoft FOSS Fund — Microsoft employees nominate and vote; maintainers cannot apply. Up to $12,500 per quarter. https://github.com/microsoft-sponsorships/microsoft-foss-fund
- Indeed FOSS Contributor Fund — Indeed employees nominate and vote. https://github.com/indeedeng/FOSS-Contributor-Fund
- Google Open Source Peer Bonus — Googlers nominate external contributors; no public self-apply form on the winner page. https://opensource.google/programs-and-services/peer-bonus/winner
- Open Source Pledge — companies pledge $2,000 per FTE developer per year; the Pledge does not take applications from maintainers or handle funds. https://opensourcepledge.com/about
- Polar — the live homepage is a usage-billing product, not an open-source maintainer grant. https://polar.sh/
- NumFOCUS Small Development Grants — only NumFOCUS sponsored or affiliated projects; new fiscal-host applications paused. https://numfocus.org/programs/small-development-grants
- Digital Infrastructure Insights Fund — last opened RFP found is 2024 cohort 4; no 2026 call page opened. https://infrastructureinsights.fund/wp-content/uploads/2024/11/Press-Relase-Digital_Infrastructure_Insights_Fund_Cohort_4.pdf
- Alfred P. Sloan Foundation Open Source in Science — letters to technology@sloan.org; programme is research-software institutions and incentives, not a general TypeScript maintainer fund, and prefers organisations. https://sloan.org/programs/digital-technology/open-source-in-science
- NLnet Open Social Fund and Research and Higher Education Technology Fund — listed as active-family pages on https://nlnet.nl/funding.html but “New funds will become active after the summer”; not enough opened detail to rank as current, scoped calls.

## Leads not yet checked

- Tidelift Lifter programme after the Sonar acquisition — https://tidelift.com/lifter loaded a JavaScript wall; current maintainer terms and whether new packages can join are unchecked.
- thanks.dev full maintainer FAQ and current fee schedule — homepage fetch timed out; only a search extract and Canonical’s older 5% figure were used.
- GitHub Secure Open Source Fund live application form and Session 5 close date — official FAQ says rolling; CURIOSS’s 18 August 2026 date is second-hand.
- Sovereign Tech application portal contents beyond the 2024 PDF sample — https://apply.sovereigntechfund.de/ fetch timed out.
- Prototype Fund English application handbook for class 03 — the German page still pointed at a class 02 (autumn 2025) PDF.
- Mozilla Foundation Incubator / Democracy x AI 2026 — closed 16 March 2026; not an OSS-maintainer fund, left as a Mozilla side lead only.
- FUTO “what is FUTO” pledges and Legendary Grant amounts — about page not fully opened.
- Stripe, Sentry, and Antithesis direct maintainer programmes beyond Pledge / thanks.dev / SOSF partnership mentions.
- OpenJS Foundation project funds — OpenJS is a recipient of STF and Alpha-Omega money, not a window for an external TypeScript library; no independent apply page was opened.
- Software Freedom Conservancy, Software in the Public Interest, and The Commons Conservancy as alternate fiscal hosts.
- FOSS United / other Indian community votes that the FLOSS/fund anniversary said may appear in year two.
- NLnet office hour 26 August 2026 (“Ask us Anything”) — useful for Restack scoping, not a fund.
- Repeat, Comet, Fastly, AWS, and Cloudflare open-source credit or sponsorship pages — not opened.
- Chan Zuckerberg Initiative open-source calls — not opened.

## Coverage note

Opened and read, in whole or in substantial extract: NLnet apply, Restack, Restack eligibility, Restack guide, Restack FAQ, funding index, phase-shift news, NGI stocktaking news, Commons Fund, Core, ELFA, ELFA eligibility, CodeSupply, CodeSupply guide, CodeSupply eligibility, TALER, Fediversity, Mobifree, NGI0 Review; Sovereign Tech Fund, Fund process post, Agency FAQ, Fellowship, 2026 fellowship news, 2026 fellows announcement, Fund sample form, Resilience criteria/programme pages; GitHub SOSF repo FAQ (via search extract), three GitHub Blog SOSF/security posts, GitHub Accelerator, GitHub Sponsors docs; Prototype Fund German apply page (full), English home/funding/FAQ (search extracts; some English fetches were blocked by bunny.net); OTF Internet Freedom Fund and FOSS Sustainability Fund; Alpha-Omega how-to-apply and seasonal-grant blog; FUTO grants and Fellows; FLOSS/fund home, FAQ, launch post, anniversary post; Open Source Pledge home and about; OSC apply, how-to-apply, acceptance criteria, fees, GitHub Sponsors docs; Drips claim docs; ecosyste.ms Funds home and overview (overview via search extract; home fetch timed out); Microsoft FOSS Fund README; Indeed FOSS Fund repo; Google OSPB winner page; Polar home; NumFOCUS SDG; Sloan technology pages; DIIF 2024 PDFs.

Kept in Ranked: 16 programmes that still have a receive path or a dated next window (including fiscal-host and drip rails). Screened out: 26 named tracks that are closed, off-remit, nomination-only, or equity-only.

Coverage is thin on: current Tidelift terms; live GitHub SOSF Session 5 form and Azure amount; Sovereign Tech portal fields after 2024; Prototype Fund class 03 English handbook; Mozilla MTF 2026 (page timeouts); corporate funds that never publish an apply URL (Stripe, Sentry direct, Antithesis); JS-foundation internal funds; US 501(c)(3) hosts other than OSC. TypeScript-specific maintainer funds beyond GitHub’s general programmes were not found as a separate cash call. Applicant country and legal entity remain the largest eligibility holes for every EU and Sponsors-gated programme.
