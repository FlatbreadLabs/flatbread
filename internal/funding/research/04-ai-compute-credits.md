# AI and compute credits for Flatbread Proof

Checked on 23 August 2026. Every amount, deadline, and eligibility rule below comes from a page opened in this run. Where a fetch failed or a page hid the fact, the line says `UNKNOWN` or `UNVERIFIED`.

Proof needs paid model calls across several families to run recall evaluations. A credit programme that covers more than one family ranks higher for that reason. Legal entity, country, and academic affiliation are still unknown, so those gates decide many verdicts.

## Ranked programs

### Amazon Research Awards — AWS Agentic AI (Spring 2026)

Funder — Amazon (Amazon Research Awards / AWS).
Track — AWS Agentic AI call for proposals, Spring 2026.
Support type — CASH, AI-CREDITS, CLOUD-CREDITS, MENTORSHIP.
Award — Unrestricted gift, no more than $70,000 USD cash on average, plus AWS Promotional Credits no more than $50,000 USD on average. Final amounts set by the awards panel. Cash is a one-time gift to the PI’s academic institution or organisation. Credits may cover AWS ML tools including Amazon Bedrock. Budget is expected to support one to two graduate students or a postdoc for one year, plus some conference travel and equipment. No administrative overhead in the requested budget.
Credit value and expiry — Up to about $50,000 USD in AWS Promotional Credits. Expiry `UNKNOWN` on the CFP page. Bedrock credits can cover several model families (OpenAI, Anthropic, Meta, Mistral, and others), which matches the project’s cross-model eval design.
Gating requirements — Principal Investigator at an academic institution or organisation that can receive an unrestricted gift. Formal co-PI must be a full-time faculty or permanent researcher. An Amazon employee contact is not required. Independent unincorporated maintainers are outside the stated applicant class.
Strings attached — Open publication and code release expected. Recipients tell ARA about papers, talks, and releases, and give survey or report updates. IP stays with the university; the award is a gift, not a licence grab. Proposals must contain no confidential information. Acknowledge ARA in publications where reasonable.
Applicant type required — Academic faculty / permanent researcher at an academic institution or organisation worldwide. Not an individual hobby project and not a company without that academic PI path.
Status — CLOSED.
Deadline — PASSED: 13 May 2026, 11:59 PM Pacific Time. Decision letters were due August 2026. Next call `UNKNOWN`.
How to apply —

1. Wait for a later CFP on https://www.amazon.science/research-awards (email research-awards@amazon.com to join the CFP list).
2. Use the proposal template (about 4 pages plus appendices).
3. State how the work differs from prior work, which open-source tools you will contribute to, and which AWS ML tools you will use.
4. Include a USD cash budget and, if needed, a Bedrock/AWS credit request with a short justification.
5. Submit through the instructions on that CFP. One proposal per PI per deadline.
   Opportunity value — 64. cash/credits/exposure/research = 26/24/4/10.
   Confidence — 0 (VERY LOW). The project has no academic PI or host institution on file, so it cannot apply. If Tony later affiliates with a lab that can receive the gift, treat this as a LOW-band research call: no published acceptance rate; selection is an internal Amazon panel on scientific quality and community impact.
   Fit verdict — INELIGIBLE. The award is a gift to an academic PI’s institution, and Flatbread has no such affiliation on record.
   Pitch angle — Proof is an MIT-licensed typed memory graph for coding agents. Agents write Issue, Finding, Decision, Constraint, Risk, Citation, and Blob records beside the code, then read a digest capped at 25 records, one hop, 50 edges, and 64 KiB. The Agentic AI call asks for open-source tools and research on agents, including software-engineering agents and how stored structure changes later behaviour. The cash would pay maintainer time to instrument provider calls and run the five recall studies in the research agenda (harder questions, growing graphs, typed edges, token cost, and the 4/4 write gate). The AWS credits would buy Bedrock runs across several model families. The deliverable for Amazon is an open eval harness, public Findings, and code in the Flatbread repository.
   Evidence —
   https://www.amazon.science/research-awards/call-for-proposals/aws-agentic-ai-call-for-proposals-spring-2026
   https://www.amazon.science/research-awards/frequently-asked-questions
   https://aws.amazon.com/blogs/startups/aws-activate-credits-now-accepted-for-third-party-models-on-amazon-bedrock/

### Vercel AI Accelerator

Funder — Vercel, with credits from Vercel, v0, AWS, Anthropic, Cursor, Modal, Hugging Face, OpenAI, and other named partners.
Track — Vercel AI Accelerator (2026 cohort).
Support type — AI-CREDITS, CLOUD-CREDITS, EXPOSURE, MENTORSHIP.
Award — Six-week programme for 40 teams. Partner pool listed as over $8 million. Per-participant amounts published on the programme page include $30,000 Vercel, $5,400 v0, $25,000 AWS, $15,000 Anthropic, $1,000 Cursor, $5,000 Modal, $300 Hugging Face, and further partner credits. Finalists get extra prize credits. The 2026 cohort ran 2 March to 16 April 2026 with a San Francisco demo day.
Credit value and expiry — Anthropic $15,000 plus AWS $25,000 plus Cursor $1,000 plus Modal $5,000 is the AI-relevant core. That stack covers Claude, Bedrock multi-family models, agent-editor spend, and serverless GPUs. Expiry `UNKNOWN` on the accelerator page.
Gating requirements — Must be a Vercel customer, of majority age, able to attend the full six weeks, and not subject to US sanctions. The 2026 call asked for pre-seed ideas. Judged on submission quality, founder background, and impact. Travel to San Francisco for demo day is implied by the event.
Strings attached — Six-week time commitment. Demo day in San Francisco. Applicants must be Vercel customers. No equity term found on the pages opened.
Applicant type required — Early-stage founder / team building an AI application. Company incorporation is `UNKNOWN` on the page. Must already use Vercel.
Status — NEXT-CALL-UNANNOUNCED.
Deadline — PASSED: 16 February 2026. The live page still showed an apply form when opened; the 2026 cohort is finished. Next deadline `UNKNOWN`.
How to apply —

1. Watch https://vercel.com/ai-accelerator and the Vercel startup hub for the next open window.
2. Be a Vercel customer before you apply.
3. Submit the Typeform at https://vercel.typeform.com/to/MV3dplSQ when the next call is live.
4. Commit to the full six weeks if selected.
   Opportunity value — 46. cash/credits/exposure/research = 0/24/16/6. Ranked high because one acceptance buys Claude, Bedrock, Cursor, and Modal in one cohort, which is the multi-family eval the project needs.
   Confidence — 12 (VERY LOW). Forty seats. No applicant count published. The last call wanted pre-seed product teams who can spend six weeks and appear in San Francisco, not a solo open-source research maintainer. Entity status is unknown.
   Fit verdict — WEAK. The credit mix is the best multi-provider bundle on this list, but the format is a startup accelerator with travel and a product-shipping cohort, not a research compute grant.
   Pitch angle — Proof is durable project memory for coding agents, stored as Markdown in the user’s git tree. Vercel’s accelerator is aimed at teams building AI applications with partner models. The ask is a seat so the maintainer can run the same recall tasks on Claude, Bedrock models, and Cursor-hosted agents, then publish the Findings. The funder would get a public TypeScript eval and a demo of bounded agent memory on the Vercel stack.
   Evidence —
   https://vercel.com/ai-accelerator
   https://vercel.com/blog/the-vercel-ai-accelerator-is-back-with-6-million-in-credits

### AWS Activate — Portfolio

Funder — Amazon Web Services.
Track — AWS Activate Portfolio (Pre-Series B).
Support type — CLOUD-CREDITS, AI-CREDITS, MENTORSHIP.
Award — Up to $200,000 USD in Activate Credits for provider-backed startups. Credits apply to more than 200 AWS services and to third-party foundation models on Amazon Bedrock (OpenAI, Anthropic, Meta, Mistral, and others named on AWS pages). Extra credits above $200,000 exist as an invite-only AI-startup path through an account manager.
Credit value and expiry — Up to $200,000 USD. AWS says credits usually expire within 1–2 years depending on the package. This is one of the few large grants that can pay several model families through one Bedrock bill, which is the evaluation design the project needs.
Gating requirements — Organisation ID from an Activate Provider (accelerator, angel, or VC such as those AWS names: a16z, Sequoia, Y Combinator, Carta, Brex, Greylock). Pre-Series B. Most recent funding round within 12 months if funded. Founded in the last 10 years. Functioning company website. AWS account on a paid tier. New to Activate or requesting more than a prior award.
Strings attached — AWS Promotional Credit Terms. Credits do not cover Mechanical Turk, AWS Managed Services, Professional Services, or Training and Certification. No equity term found.
Applicant type required — Startup affiliated with an Activate Provider. Self-funded teams cannot use this tier.
Status — ROLLING.
Deadline — Rolling. Apply within 12 months of the most recent funding date if funded. Decision in about 7–10 business days.
How to apply —

1. Confirm your investor or accelerator is an Activate Provider and collect their Org ID.
2. Create an AWS Builder ID with a professional email at https://aws.amazon.com/startups/credits/.
3. Choose Activate Portfolio and enter the Org ID.
4. Describe the product, funding stage, and company.
5. Link a paid-tier AWS account and submit.
   Opportunity value — 44. cash/credits/exposure/research = 0/30/6/8.
   Confidence — 0 (VERY LOW). No Activate Provider, no funding round, and no legal entity on file.
   Fit verdict — INELIGIBLE. Portfolio requires a provider Org ID that the project does not have.
   Pitch angle — Do not apply until a provider relationship exists. If one appears, pitch Proof as an open agent-memory eval that needs Bedrock’s multi-model API so recall quality can be compared across families on one bill. The deliverable is a public harness and Findings in the repository.
   Evidence —
   https://aws.amazon.com/startups/credits/
   https://aws.amazon.com/aws-startups/learn/everything-you-need-to-know-about-aws-activate-credits/
   https://aws.amazon.com/blogs/startups/aws-activate-credits-now-accepted-for-third-party-models-on-amazon-bedrock/

### Microsoft for Startups

Funder — Microsoft.
Track — Microsoft for Startups (the current single-entry programme that replaced the older Founders Hub path).
Support type — CLOUD-CREDITS, AI-CREDITS, MENTORSHIP, EXPOSURE.
Award — Startup credits from approval, unlocking up to $150,000 USD over time as the startup shows verified progress, Azure adoption, and sustained usage. Investor Network referral can unlock more credits, a dedicated contact, Marketplace, and co-sell help. Credits spend on eligible Azure services, including AI on Azure / Microsoft Foundry.
Credit value and expiry — Up to $150,000 USD. Expiry `UNKNOWN` on the overview page. Azure can host several model families, but the official page does not list which models the credits cover. Treat multi-family coverage as `UNVERIFIED` until billing docs are checked after approval.
Gating requirements — Privately held for-profit company. Software product owned by the company. Headquartered in a country where Azure is available. Lifetime free Azure credits under $350,000. Not Series C or later. Not an educational institution, government body, consultancy, or agency. Not crypto mining. Investor referral code optional for a higher tier.
Strings attached — Build-to-revenue and Marketplace / co-sell path is the programme’s stated aim. No equity term found. Reporting load `UNKNOWN`.
Applicant type required — Privately held for-profit company. Not a non-profit, not a university, not an unincorporated personal project.
Status — ROLLING.
Deadline — Rolling. Applications typically reviewed within three business days.
How to apply —

1. Go to https://startups.microsoft.com and select Get started.
2. Submit the company application.
3. Enter an Investor Network referral code if you have one.
4. After approval, use the Azure Portal to activate credits and add team members.
   Opportunity value — 42. cash/credits/exposure/research = 0/30/6/6.
   Confidence — 0 (VERY LOW). Legal entity is unknown. The page requires a privately held for-profit company.
   Fit verdict — INELIGIBLE until Tony incorporates a for-profit company that owns the software. After that, PLAUSIBLE for the open credit path if Azure is an acceptable eval host.
   Pitch angle — Proof is not a hosted Azure product. Pitch it as a TypeScript agent-memory runtime that needs Azure model calls to measure whether bounded recall changes a later agent’s behaviour. Credits would buy those runs. The deliverable is public Findings and an open harness, not an Azure Marketplace listing, unless the project later chooses that path.
   Evidence —
   https://learn.microsoft.com/en-us/startups/microsoft-for-startups/overview
   https://startups.microsoft.com

### Google for Startups Cloud Program — Scale / AI-first

Funder — Google Cloud / Google for Startups.
Track — Google for Startups Cloud Program, Scale tier and AI startup add-on.
Support type — CLOUD-CREDITS, AI-CREDITS, MENTORSHIP.
Award — Up to $200,000 USD in Google Cloud credits over two years, or up to $350,000 USD for AI-first startups. Year 1: 100% coverage up to $100,000, or up to $250,000 for AI-first. Year 2: 20% coverage up to another $100,000. Extra $150,000 is described for AI-first work on Gemini Enterprise Agent Platform. $12,000 Enhanced Support credits for one year on the early-stage page.
Credit value and expiry — Up to $350,000 USD over two years. Credits cover Gemini and Gemma. Third-party models are billed directly and are not covered. That single-family limit hurts the project’s cross-model evals.
Gating requirements — Recent startup equity funding from an institutional investor or VC (SAFE allowed). Pre-Seed/Seed in the last five years, or Series A in the last 12 months. Founded in the last five years. Not more than $5,000 in prior Google Cloud credits. Public website and company email that matches the domain. GCP billing account. Angel, friends-and-family, crowdfunding, government grants, and prize funding do not qualify for Scale.
Strings attached — Google for Startups Cloud Program Startup Terms. Not for IPOs, acquired companies, schools, governments, nonprofits, personal blogs, consultancies, or token issuers. Credits are not cash.
Applicant type required — VC-funded for-profit startup. Nonprofits and educational institutions are refused.
Status — ROLLING.
Deadline — Rolling. Acceptance at Google Cloud’s discretion.
How to apply —

1. Create a GCP account and billing ID.
2. Apply at https://cloud.google.com/startup/ai or https://cloud.google.com/startup/early-stage with the 18-character billing account ID.
3. Use a company email that matches a public website.
4. Provide funding verification if asked.
   Opportunity value — 40. cash/credits/exposure/research = 0/30/4/6.
   Confidence — 0 (VERY LOW). No institutional equity raise is on file, and nonprofits are excluded.
   Fit verdict — INELIGIBLE. Scale and the AI add-on require VC equity funding and a company Google will not class as a nonprofit or personal project.
   Pitch angle — Only relevant after a qualifying raise. Pitch Gemini-family recall evals and open Findings, and say third-party models will be paid another way because programme credits will not cover them.
   Evidence —
   https://cloud.google.com/startup/ai
   https://cloud.google.com/startup/early-stage
   https://startup.google.com/cloud/

### NAIRR Pilot — Resource Requests to Advance AI Research

Funder — US National Science Foundation, US Department of Energy, and named private partners including OpenAI, Anthropic, Google, Microsoft, Amazon, NVIDIA, Groq, Cerebras, and Hugging Face (partner list on the pilot home page, fetch of the home page timed out; partner names also appear in secondary pages opened for this run — treat the full live partner list as `UNVERIFIED` until https://nairrpilot.org/ is reopened).
Track — NAIRR Pilot Resource Requests to Advance AI Research.
Support type — AI-CREDITS, CLOUD-CREDITS.
Award — Twelve months of allocated compute, models, platforms, or educational resources from the NAIRR catalog. No cash. Amount is proposal-specific. Some partner models, datasets, and platforms are listed as usable without a proposal.
Credit value and expiry — Dollar value `UNKNOWN`. Allocation lasts 12 months. Unused allocations can be cut. Partner catalog may include commercial model credits; confirm on https://nairrpilot.org/ before naming a provider.
Gating requirements — US-based researcher or educator at a US-based institution: university (graduate students need a faculty letter), nonprofit, federal or federally funded lab, state/local/tribal agency, or a startup/small business that already has a federal grant. Institutional email required. Personal Gmail is refused.
Strings attached — Results must be open and publishable. PI name, affiliation, title, and abstract are posted. Updates at 1 month and 6 months, plus a three-page final report. Usage data may be shared with agencies. Commercial IP must be discussed with the resource provider.
Applicant type required — US-based researcher at a US institution, or a US startup that already holds a federal grant. Independent maintainers with no US institutional email do not qualify.
Status — ROLLING.
Deadline — Open from 6 May 2024 until the pilot ends or resources run out. Monthly review: submit by the 15th for a decision by the end of the next month.
How to apply —

1. Read https://nairrpilot.org/nairr-pilot-proposal-instructions and the resource catalog.
2. Write a three-page PDF (no proprietary content).
3. Submit on the NAIRR Pilot submission site with an institutional email.
4. Justify GPU-hours or credit units with benchmarks.
   Opportunity value — 38. cash/credits/exposure/research = 0/24/4/10. High research score because the call funds open AI methods and open-source tools, and partner credits could span several labs.
   Confidence — 0 (VERY LOW). No US institutional affiliation or federal grant is on file.
   Fit verdict — INELIGIBLE until a US institution or federal-grant small business is the applicant.
   Pitch angle — If a US lab hosts the work, ask for model credits to test whether typed relations change a later agent’s decisions, and whether the 25-record digest holds as the graph grows. Deliverable: open Findings, code, and the required NAIRR reports.
   Evidence —
   https://nairrpilot.org/opportunities/allocations
   https://nairrpilot.org/nairr-pilot-proposal-instructions
   https://nairrpilot.org/startup-project

### Nebius AI Lift (via NVIDIA Inception)

Funder — Nebius, in collaboration with NVIDIA Inception.
Track — Nebius AI Lift for NVIDIA Inception members.
Support type — CLOUD-CREDITS, AI-CREDITS, EXPOSURE.
Award — Up to $150,000 in Nebius cloud credits, plus $10,000 for inference-related workloads, plus discounted long-term plans and priority GPU access. The $10,000 inference line and some extras were described as perks for Inception startups joining in the first three months after the GTC 2025 announcement; whether that window is still open is `UNKNOWN`.
Credit value and expiry — Up to $160,000 combined if both lines still apply. Expiry `UNKNOWN`. Credits are Nebius GPUs and inference, not OpenAI or Anthropic APIs.
Gating requirements — NVIDIA Inception membership, then Nebius startup acceptance. Nebius’s current startups page says the selective Nebius for Startups credit path is by application through a Nebius VC partner only. So there are two gates: Inception, and either the older Inception AI Lift path or a VC-partner path.
Strings attached — No equity term found on the pages opened. Co-marketing possible. Long-term spend discounts imply a later paid relationship.
Applicant type required — AI startup. VC-partner path requires a Nebius VC partner. Inception path requires whatever Inception itself requires (NVIDIA describes applicants as companies at any funding stage).
Status — ROLLING.
Deadline — Rolling. First-three-months extras may have expired; treat as `UNKNOWN`.
How to apply —

1. Apply to NVIDIA Inception at https://www.nvidia.com/en-us/startups/ (application hub also advertised at https://programs.nvidia.com/phoenix/application).
2. From the Inception portal, request Nebius / AI Lift partner credits.
3. Or, if you have a Nebius VC partner, apply through that partner as the current startups FAQ requires.
   Opportunity value — 38. cash/credits/exposure/research = 0/30/4/4.
   Confidence — 5 (VERY LOW). Entity unknown, no VC partner, and the live startups FAQ now points at VC-partner applications. GPU credits also do not buy frontier API evals.
   Fit verdict — INELIGIBLE for the current VC-partner credit path. WEAK even after Inception, because Proof’s blocker is multi-family API tokens, not a GPU cluster.
   Pitch angle — Only useful if the project later trains or hosts its own models. That is not the current eval plan.
   Evidence —
   https://nebius.com/blog/posts/ai-lift-startups-innovation-with-nvidia
   https://nebius.com/startups
   https://www.nvidia.com/en-gb/startups/

### EuroHPC JU — AI for Science and Collaborative EU Projects

Funder — EuroHPC Joint Undertaking.
Track — AI for Science and Collaborative EU Projects Access Mode.
Support type — CLOUD-CREDITS.
Award — Free access time on EuroHPC AI-optimised supercomputers for six months. No cash. Resources listed in node-hours on the call page. Leonardo and MeluXina were marked unavailable due to demand when the page was opened.
Credit value and expiry — Euro value `UNKNOWN`. Allocation lasts six months. Access is meant to start within one month of the cut-off.
Gating requirements — Scientific users, public-sector users, or industrial users already on an EU R&I project (Horizon Europe or Digital Europe). Applicants established in an EU Member State, a Participating State, or a Horizon 2020-associated country (the FAQ lists those countries, including the United Kingdom). Other industry users are sent to the Industrial Innovation modes.
Strings attached — Acknowledge the resources, join dissemination events, and file progress and final reports. Access is free of charge.
Applicant type required — Academic, research institute, public authority, or industry on a funded EU R&I project, established in an eligible European or associated country. Not an unaffiliated solo maintainer outside those countries.
Status — OPEN.
Deadline — Multiple cut-offs. Next dates on the call page: 31 August 2026, 30 October 2026, and 11 December 2026, 10:00 CET.
How to apply —

1. Read the PDFs on https://www.eurohpc-ju.europa.eu/eurohpc-ju-call-proposals-ai-science-and-collaborative-eu-projects_en (full call details, terms, technical guidelines, access policy).
2. Use the Project Scope and Plan template.
3. Submit on the EuroHPC access platform before a cut-off.
4. Evaluation is technical review plus peer review on excellence, innovation and impact, and implementation. Awards are first-arrived, first-served among those that pass.
   Opportunity value — 36. cash/credits/exposure/research = 0/24/2/10.
   Confidence — 0 (VERY LOW). Country and institutional home are unknown. Supercomputer hours also do not replace Claude or GPT API evals.
   Fit verdict — INELIGIBLE until the applicant is a scientific or public user in an eligible country. Even then WEAK for API-token evals.
   Pitch angle — Only if the project later needs large open-weight runs on European HPC. That is not the current five-study plan.
   Evidence —
   https://www.eurohpc-ju.europa.eu/eurohpc-ju-call-proposals-ai-science-and-collaborative-eu-projects_en
   https://www.eurohpc-ju.europa.eu/ai-factories/faqs-ai-factories_en

### Together AI Startup Accelerator

Funder — Together AI.
Track — Together AI Startup Accelerator (Build / Scale / Grow).
Support type — AI-CREDITS, CLOUD-CREDITS, MENTORSHIP, EXPOSURE.
Award — Build (up to $5M raised): up to $15,000 platform credits and 3 hours of forward-deployed engineering. Scale ($5M–$10M): up to $30,000 and 6 hours. Grow (over $10M): up to $50,000 and 10 hours. Credits cover serverless inference, dedicated endpoints, fine-tuning, and instant clusters. Credits do not apply to Reserved GPU Clusters.
Credit value and expiry — Up to $15,000 for a project with no raise. Expiry `UNKNOWN`. Together hosts many open models, not first-party Claude or GPT. Useful as one family in a multi-provider eval, not as the whole matrix.
Gating requirements — Selection-based programme for startups. Tiers are set by capital raised. The page does not say incorporation is required, and it does not say a raise is required for Build. A company website and application details are requested.
Strings attached — No equity term found. Joint GTM and VC-network introductions are offered. Selection is discretionary.
Applicant type required — Startup building on Together AI. Worldwide. Funding stage from pre-seed to growth, including teams that have raised nothing, if they fit Build.
Status — ROLLING.
Deadline — Rolling. Review time `UNKNOWN`.
How to apply —

1. Open https://www.together.ai/startup-accelerator.
2. Fill the application form on that page (company, product, funding).
3. Wait for Together to reply and provision credits if accepted.
   Opportunity value — 30. cash/credits/exposure/research = 0/16/8/6. Exposure is to Together’s stated 800,000+ developers, which includes AI-app builders.
   Confidence — 38 (LOW). No published acceptance rate. Build is the only tier that does not demand a raise. The page still frames a “startup” and a selection bar. A solo MIT library with no company may be refused. No legal entity is on file.
   Fit verdict — PLAUSIBLE for the Build tier if Tony applies as a startup and accepts open-weight-only credits.
   Pitch angle — Proof needs open-weight runs next to closed-model runs so recall quality can be compared. Together credits would pay the open-weight side: same tasks, same graphs, models Together actually hosts. The deliverable is a public eval report and any Together-side cookbook the engineers help ship in the three free hours.
   Evidence —
   https://www.together.ai/startup-accelerator

### OpenRouter for Startups

Funder — OpenRouter.
Track — OpenRouter for Startups.
Support type — AI-CREDITS.
Award — Up to $5,000 USD in universal inference credits across 500+ models, plus 0% processing fees for 12 months (platform and BYOK fees).
Credit value and expiry — Up to $5,000 USD. Most credits expire 6 months after issuance. Fee waiver lasts 12 months. This is the strongest small grant for the project’s design: one API, many families (frontier and open), so one credit pool can run the three-family recall matrix.
Gating requirements — Pre-Series B. Building an AI-native product full-time. Referred by an approved OpenRouter partner. Public company website. Professional email that matches the company domain and belongs to a named person (no admin@ aliases). OpenRouter account with less than $500 lifetime spend. Have not received startup credits before. Credits once per applicant.
Strings attached — Credits are promotional, non-transferable, no cash. No NDA on applications. Standard OpenRouter terms also apply. Contact startups@openrouter.ai.
Applicant type required — Early-stage startup / founder referred by an approved partner (VC, accelerator, or ecosystem org). Not a cold individual application.
Status — ROLLING.
Deadline — Rolling. Decision often within a few days per the terms page (terms fetch timed out; the programme page itself states rolling review).
How to apply —

1. Get a referral from an approved OpenRouter partner. Partners apply via the form linked from https://openrouter.ai/startup-program.
2. Create an OpenRouter account on a company-domain email.
3. Submit the form on https://openrouter.ai/startup-program.
4. If approved, credits and the fee waiver attach to that account.
   Opportunity value — 30. cash/credits/exposure/research = 0/8/14/8. Highest exposure-to-agent-developers among the small grants, and the only small grant that natively spans many model families.
   Confidence — 0 (VERY LOW) without a partner referral. With a partner, LOW-to-MODERATE: no published rate, but the bar is a checklist plus discretion.
   Fit verdict — INELIGIBLE until an approved partner refers the project. After a referral, STRONG on technical fit.
   Pitch angle — Proof compares recall across model families. OpenRouter is the one bill that can do that. Credits would run the 48-run harder-question study and the 36-run graph-growth study through one router. The deliverable is a public write-up that names models and token cost, which also shows OpenRouter as the eval fabric.
   Evidence —
   https://openrouter.ai/startup-program
   https://openrouter.ai/startup-program-terms

### Modal for Startups

Funder — Modal Labs.
Track — Modal for Startups (Seed to Series A).
Support type — CLOUD-CREDITS, MENTORSHIP, EXPOSURE.
Award — Official page says “thousands of free GPU credits” as a one-time grant. Exact dollar cap `UNKNOWN` on the official page. Credits are for Modal compute (GPU, CPU, storage, endpoints). A separate Academics programme exists; dollar terms were not visible in the collapsed FAQ.
Credit value and expiry — Dollar figure `UNKNOWN` on the official page. Duration FAQ exists on the page but did not render in the fetch. Treat expiry as `UNKNOWN`. Modal is serverless GPU, not Claude or GPT.
Gating requirements — New to Modal. Seed to Series A requires either any VC funding from Modal’s partner network or more than $1 million VC from any fund. Series B+ is a custom tier above $30 million or post-Series B with a partner VC. Cannot reapply in the same tier. Payment method required (FAQ heading present).
Strings attached — One-time grant. Payment method on file. No equity term found.
Applicant type required — VC-funded startup. Not an unfunded individual or open-source project.
Status — ROLLING.
Deadline — Rolling.
How to apply —

1. Create a Modal account at https://modal.com.
2. Apply at https://modal.com/startups.
3. Document the raise and the VC (partner list is in the page FAQ).
   Opportunity value — 28. cash/credits/exposure/research = 0/16/6/6. Credits subscore uses the “thousands” official wording as the $5k–$25k band; the exact cap is unpublished.
   Confidence — 0 (VERY LOW). No VC raise on file.
   Fit verdict — INELIGIBLE. Both published Seed–A paths require venture funding.
   Pitch angle — Do not apply. Modal would only help if the project later hosted its own eval workers on GPUs, which is not the current plan.
   Evidence —
   https://modal.com/startups

### Anthropic — AI for Science

Funder — Anthropic.
Track — Anthropic’s AI for Science Program.
Support type — AI-CREDITS.
Award — Up to $20,000 in Claude API credits for 6 months, applied to a Console organisation. Standard model suite only. Not the Claude web app. No non-public models. No fine-tuning.
Credit value and expiry — Up to $20,000 USD for 6 months. Claude family only, so it covers one of the families in the eval matrix, not all of them.
Gating requirements — Researchers in academia or nonprofit organisations, attached to a research institution. Evaluated on scientific merit, impact, feasibility, team credentials, and biosecurity. Life sciences are the stated focus; computer science is listed among supported fields.
Strings attached — Standard Usage Policy still applies. No individual replies to rejected applicants. Credits are API-only.
Applicant type required — Academic or nonprofit researcher at a research institution. Not a for-profit startup and not an unaffiliated individual.
Status — ROLLING.
Deadline — Reviewed on the first Monday of each month.
How to apply —

1. Create a Claude Console organisation.
2. Open the application form linked from https://support.claude.com/en/articles/11199177-anthropic-s-ai-for-science-program.
3. Describe the team and the scientific project.
4. If you have many collaborators, apply once and share the organisation ID.
   Opportunity value — 26. cash/credits/exposure/research = 0/16/2/8.
   Confidence — 0 (VERY LOW). No academic or nonprofit institution is on file. Computer-science agent-memory work is allowed as a field but is not the focus Anthropic says it prefers.
   Fit verdict — INELIGIBLE without a research-institution applicant. A rare-disease thematic call closed 2 August 2026 and is the wrong topic.
   Pitch angle — Only after a university or nonprofit hosts the work. Then ask for Claude credits to measure whether typed edges change a later agent’s decisions. Deliverable: open Findings and a methods note.
   Evidence —
   https://support.claude.com/en/articles/11199177-anthropic-s-ai-for-science-program
   https://www.anthropic.com/news/rare-disease-research-grants

### TPU Research Cloud

Funder — Google.
Track — TPU Research Cloud (TRC).
Support type — CLOUD-CREDITS.
Award — Temporary free Cloud TPU quota on the recipient’s Google Cloud project. Google states a pool of more than 1,000 Cloud TPU devices. Host VMs and Cloud Storage are not free. Not compatible with Vertex AI workflows; use GCE tutorials. Dollar value `UNKNOWN`.
Credit value and expiry — TPU hours at no charge; other GCP services billed. Duration described as temporary. Expiry `UNKNOWN` on the official FAQ. TPUs do not serve Claude or GPT. They help only if the project trains or runs its own models.
Gating requirements — Anyone may express interest. Approval is rolling. Need a GCP project. Must share results (papers, open source, or posts), give Google feedback, accept Google terms, and follow Google AI Principles.
Strings attached — Public sharing of TRC-supported research. Feedback to Google. Suggested acknowledgement: “Research supported with Cloud TPUs from Google’s TPU Research Cloud (TRC).”
Applicant type required — Researcher (the FAQ says anyone can express interest). No university requirement published on the FAQ. A GCP account with billing is still needed for non-TPU charges.
Status — ROLLING.
Deadline — Rolling invitations.
How to apply —

1. Sign up at https://sites.research.google/trc.
2. If invited, attach free TPU quota to a GCP project as the welcome mail instructs.
3. For questions, trc-support@google.com.
   Opportunity value — 26. cash/credits/exposure/research = 0/16/2/8. Credits subscore is the $5k–$25k band because Google publishes no dollar cap.
   Confidence — 25 (LOW). No acceptance rate. The form is open, but Proof’s evals are API-token work, so the technical match is poor even if admitted.
   Fit verdict — WEAK. Easy to apply, wrong hardware for the current recall studies.
   Pitch angle — Apply only if the project later ports an open model eval to JAX or PyTorch on TPU. That is not study 1–5 as written.
   Evidence —
   https://sites.research.google/trc/about/
   https://sites.research.google/trc/faq/

### Vercel Open Source Program

Funder — Vercel.
Track — Vercel Open Source Program (quarterly cohort).
Support type — CLOUD-CREDITS, EXPOSURE.
Award — $3,600 Vercel platform credits over 12 months, plus an OSS Starter Pack of third-party credits, plus community support. The Starter Pack page lists partner offers (for example Daytona $1,000 compute, Langfuse $200/month for 6 months, Neon $1,000, Tembo $400). Those are hosting, eval, and data credits, not frontier model APIs. Marketplace AI providers are not covered by the Vercel credits.
Credit value and expiry — $3,600 over 12 months, then the project graduates. Partner pack expiries vary by vendor. This does not buy Claude or GPT tokens.
Gating requirements — Active open-source project. Hosted on Vercel or intended to be. Measurable impact or growth potential. A published Code of Conduct (the repository currently has none). Credits used only for the open-source work. Funded companies are steered to the Startups Programme instead.
Strings attached — Credits only for the OSS project. After 12 months you leave so new projects can enter. Need a Code of Conduct.
Applicant type required — Open-source project or nonprofit that is fully open source. Startups with OSS projects may apply; funded OSS companies are told to use Startups instead. Individual maintainers are allowed.
Status — CLOSED.
Deadline — Applications were closed when the page was opened on 23 August 2026, with the note that they will reopen in August. Treat the next window as imminent or already slipping: check the page. Cadence is four times a year.
How to apply —

1. Add a Code of Conduct to the repository.
2. Have or plan a Vercel-hosted surface (docs or explorer).
3. Apply at https://vercel.com/open-source-program when the form reopens.
4. Questions: Vercel Community open-source category, or sponsorships@vercel.com from the related guide.
   Opportunity value — 24. cash/credits/exposure/research = 0/8/14/2. Exposure is to TypeScript and Next.js maintainers, which is the adoption audience, not the eval budget.
   Confidence — 40 (MODERATE). No published acceptance rate. Spring 2026 listed a large cohort of mostly UI and docs projects. Proof is MIT and active, but it is not hosted on Vercel and it has no Code of Conduct. Hosting-on-Vercel is a real product-scope clash.
   Fit verdict — WEAK for compute. PLAUSIBLE for exposure if the project adds a Code of Conduct and a Vercel-hosted docs or explorer site.
   Pitch angle — Ask for platform credits to keep a public Proof explorer or docs online, not to fund model evals. Name the Starter Pack only for side tools (Langfuse traces, Neon if needed). The deliverable is a public TypeScript demo, not a hosted memory service.
   Evidence —
   https://vercel.com/open-source-program
   https://oss-starter-pack.vercel.com/
   https://vercel.com/blog/vercel-open-source-program-spring-2026-cohort
   https://vercel.com/kb/guide/can-vercel-sponsor-my-open-source-project

### Baseten AI Startup Program

Funder — Baseten.
Track — Baseten for Startups / AI Startup Program.
Support type — AI-CREDITS, CLOUD-CREDITS, MENTORSHIP, EXPOSURE.
Award — Up to $25,000 in credits for Dedicated Inference or Training, plus up to $2,500 for Model APIs. Support response in a few business hours, events, and GTM amplification.
Credit value and expiry — Up to $27,500 USD combined. Expiry `UNKNOWN`. Baseten inference, not first-party Claude or GPT.
Gating requirements — AI-first product. Seed to Series A. Founded less than 5 years ago. Net-new Baseten customer with no prior Baseten credits. The page says the programme is for early-stage AI-first and VC-funded startups.
Strings attached — No equity term found. GTM and events implied.
Applicant type required — VC-funded AI-first startup, Seed to Series A, company younger than five years.
Status — ROLLING.
Deadline — Rolling.
How to apply —

1. Open https://www.baseten.co/startup-program/.
2. Submit the join form on that page.
   Opportunity value — 24. cash/credits/exposure/research = 0/16/4/4.
   Confidence — 0 (VERY LOW). No Seed–A raise on file.
   Fit verdict — INELIGIBLE. VC-funded Seed-to-Series-A company is required.
   Pitch angle — Do not apply.
   Evidence —
   https://www.baseten.co/startup-program/

### AWS Activate — Founders

Funder — Amazon Web Services.
Track — AWS Activate Founders (self-funded).
Support type — CLOUD-CREDITS, AI-CREDITS.
Award — $1,000 USD to start. Select participants may later receive additional credits up to $5,000. Same Bedrock third-party model coverage as other Activate credits.
Credit value and expiry — $1,000 to $5,000 USD. Expiry usually 1–2 years per AWS’s Activate credits article. Covers Bedrock models from several families, so even the small tier can run a thin cross-model pilot.
Gating requirements — Self-funded. New to Activate credits. Functioning company website. Founded in the last 10 years. AWS account on a paid tier (payment method on file).
Strings attached — Promotional Credit Terms. Same service exclusions as Portfolio. No equity term found.
Applicant type required — Self-funded startup with a public website. Incorporation is not spelled out; a paid AWS account and a website are.
Status — ROLLING.
Deadline — Rolling. About 7–10 business days to a decision.
How to apply —

1. Create an AWS Builder ID at https://aws.amazon.com/startups/credits/.
2. Choose Activate Founders.
3. Describe the product and confirm self-funded status.
4. Link a paid-tier AWS account and submit.
   Opportunity value — 20. cash/credits/exposure/research = 0/8/4/8.
   Confidence — 48 (MODERATE). No published acceptance rate. The Founders bar is the lowest AWS publishes: website, age, self-funded, paid account. Many applicants still fail on “functioning company website” or on looking like a personal blog. Entity unknown.
   Fit verdict — PLAUSIBLE. Small money, but it is the only multi-family API path that does not demand a VC, a university, or a partner code.
   Pitch angle — Proof needs Bedrock so one account can call several foundation models for the same recall tasks. $1,000 is enough to instrument provider calls and repeat the existing 12-run design with real token logs (research agenda item 4). The deliverable is a public Finding with model, token, and cost columns.
   Evidence —
   https://aws.amazon.com/startups/credits/
   https://aws.amazon.com/aws-startups/learn/everything-you-need-to-know-about-aws-activate-credits/
   https://aws.amazon.com/aws-startups/learn/applying-for-aws-activate-credits-a-step-by-step-guide/
   https://aws.amazon.com/blogs/startups/aws-activate-credits-now-accepted-for-third-party-models-on-amazon-bedrock/

### NVIDIA Inception

Funder — NVIDIA.
Track — NVIDIA Inception.
Support type — CLOUD-CREDITS, MENTORSHIP, EXPOSURE.
Award — Free membership. Preferred pricing on some NVIDIA hardware and software. Free cloud credits from NVIDIA and partners, requested in the member portal. Deep Learning Institute training. No published dollar amount.
Credit value and expiry — Dollar value `UNKNOWN`. Credits are issued by partners after membership, not as a fixed NVIDIA grant. GPU-cloud credits, not Claude or GPT APIs.
Gating requirements — Apply as a company/startup. Any funding stage. No application fee, deadline, or cohort. Keep company and product details updated to keep benefits.
Strings attached — No equity, no membership fee. Portal hygiene required.
Applicant type required — Startup / company. NVIDIA’s copy speaks of “your company.” Unincorporated status is `UNKNOWN` as a hard rule on the pages opened.
Status — ROLLING.
Deadline — Rolling. No cohorts.
How to apply —

1. Submit the application at https://www.nvidia.com/en-us/startups/ (Apply to Inception).
2. After acceptance, open the Inception portal and request partner cloud credits (Nebius, AWS, and others as listed in the portal at that time).
   Opportunity value — 18. cash/credits/exposure/research = 0/8/6/4. Credits subscore is the lowest non-zero band because NVIDIA publishes no figure.
   Confidence — 42 (MODERATE). No published rate. The programme is free and says any funding stage. A thin website and an unclear company identity are the likely failure modes. Credits themselves are a second, partner-side review.
   Fit verdict — PLAUSIBLE as a door to partner credits. WEAK as a direct eval grant.
   Pitch angle — Join so the portal can be used to request partner credits later. Do not plan the recall studies on Inception alone.
   Evidence —
   https://www.nvidia.com/en-us/startups/
   https://www.nvidia.com/en-gb/startups/
   https://www.nvidia.com/en-us/startups/faq/

### OpenAI Researcher Access Program

Funder — OpenAI.
Track — Researcher Access Program.
Support type — AI-CREDITS.
Award — Up to $1,000 of OpenAI API credits for publicly available models. Official application pages returned a JavaScript challenge in this run; the figures below are from the official form and FAQ text returned by search of those URLs and should be re-opened in a browser before applying.
Credit value and expiry — Up to $1,000 USD. Valid 12 months. Cannot be extended or renewed. OpenAI models only.
Gating requirements — Researcher with an active affiliation to an academic institution or other research organisation, or a nonprofit doing research (not operations). Must be in a country the API supports. Especially aimed at early-stage researchers with limited resources.
Strings attached — Sharing and publication policy applies. Credits stay on the approved account and institution; a move requires a new application. Quarterly review.
Applicant type required — Affiliated academic or research-organisation researcher, or research nonprofit. Not an unaffiliated open-source maintainer.
Status — ROLLING.
Deadline — Submit any time. Reviewed in March, June, September, and December. Credits land 4–6 weeks after the decision. Next review window: September 2026.
How to apply —

1. Read https://openai.com/form/researcher-access-program/ and the FAQ at https://help.openai.com/en/articles/10139500-researcher-access-program-faq (both pages challenged automated fetch).
2. Apply via the SurveyMonkey Apply portal linked from that form (search results also named grants.openai.com and openai.smapply.org — confirm in a browser).
3. Describe the research question, planned API use, and affiliation.
   Opportunity value — 18. cash/credits/exposure/research = 0/8/2/8.
   Confidence — 0 (VERY LOW). No qualifying affiliation on file. Official pages were not fully opened (JS challenge), so treat current terms as `UNVERIFIED` until a browser session confirms them.
   Fit verdict — INELIGIBLE without an academic or research-org affiliation. Scope (responsible deployment, risk, societal impact) is also a stretch for a developer-tool recall study.
   Pitch angle — Only with a host lab. Frame the work as measuring whether stored agent reasoning changes later behaviour, and whether bounded recall reduces waste. Deliverable: open methods and Findings, using only public models, inside one year.
   Evidence —
   https://openai.com/form/researcher-access-program/
   https://help.openai.com/en/articles/10139500-researcher-access-program-faq
   https://grants.openai.com/prog/openai_researcher_access_program/

### Hugging Face — ZeroGPU hosting and Community GPU Grants

Funder — Hugging Face.
Track — Spaces ZeroGPU free hosting, plus Community GPU Grants for hardware upgrades.
Support type — CLOUD-CREDITS, EXPOSURE.
Award — Free personal accounts in good standing (verified email, older than 30 days) may host up to 2 ZeroGPU Spaces. Community GPU Grants cover a hardware upgrade for a public Space; the apply control sits in Space hardware settings. No dollar stipend.
Credit value and expiry — No dollar credit. Daily GPU quota: 5 minutes for a free account, 40 minutes for PRO. ZeroGPU is Gradio-only shared RTX Pro 6000 time for demos, not batch eval jobs. Community grants are for public demos, not private or commercial tools.
Gating requirements — Public Space. Community grants target open research demos, hobby projects, educational tools, or institutional showcases when the author cannot pay. Private, commercial, or closed-source work is steered to PRO.
Strings attached — Public demo. Gradio SDK. Hardware billing stops if you pause or drop to CPU.
Applicant type required — Individual Hugging Face user or org. Personal, company, or academic project labels are used in grant discussions. No company required for ZeroGPU hosting.
Status — ROLLING.
Deadline — Rolling. Grant review can take days.
How to apply —

1. Create a public Gradio Space and select ZeroGPU if you qualify for the free hosting cap.
2. For a dedicated GPU grant, open the Space hardware settings and use the Community GPU Grant control described at https://huggingface.co/docs/hub/en/spaces-gpus#community-gpu-grants.
3. Or open a Community Tab discussion titled `Apply for a GPU community grant: <Personal|Company|Academic> project` with a description and justification.
   Opportunity value — 18. cash/credits/exposure/research = 0/8/8/2. Exposure is to Hugging Face model users, not a substitute for API evals.
   Confidence — 55 (MODERATE). No published grant rate. Free ZeroGPU hosting for two Spaces is a stated entitlement for accounts in good standing, not a contest. A grant for always-on or non-Gradio eval workers is unlikely.
   Fit verdict — WEAK. Useful for a public demo Space. Useless as the eval budget.
   Pitch angle — Ship a small public demo of bounded recall, then ask for a grant only if the demo needs a GPU the free ZeroGPU cap cannot give. Do not run the 48-run studies here.
   Evidence —
   https://huggingface.co/docs/hub/en/spaces-zerogpu
   https://huggingface.co/docs/hub/en/spaces-gpus

### Google Cloud research credits (academic)

Funder — Google (Google for Education / Google Cloud).
Track — Google Cloud research credits / Academic Research Grants.
Support type — CLOUD-CREDITS.
Award — Official eligibility page states PhD students may apply for up to $1,000. Faculty and postdoc ceilings were not restated on the eligibility page opened; the application form itself does not print a faculty cap. A Google-hosted tips PDF linked from search states faculty up to $5,000 and one award per year — treat that faculty figure as `UNVERIFIED` unless the PDF is accepted as a Google source (https://services.google.com/fh/files/emails/kickstart_your_research_with_google_cloud_credits_tips_on_applying.pdf).
Credit value and expiry — Credits expire 365 days from coupon redemption or when spent. Must activate within 60 days of the stated project start. Non-transferable. Not for commercial or personal use. Most Google Cloud products, including AI/ML services; Gemini-versus-third-party rules for this academic coupon are `UNKNOWN`.
Gating requirements — Faculty, PhD student, or postdoctoral researcher at a regionally accredited academic institution or a nonprofit research institution whose mission is open science, in a listed country. For-profit institutions are refused. Master’s students are not eligible. Institutional profile link required. GCP billing account required before apply.
Strings attached — Credits only for the described project. After expiry you must have another funding plan (the form asks).
Applicant type required — Faculty, PhD student, or postdoc at an eligible academic or nonprofit research institution in a listed country.
Status — ROLLING.
Deadline — Rolling. Google’s tips PDF says decisions in 4–6 weeks (`UNVERIFIED` if you discount that PDF).
How to apply —

1. Create a Google Cloud billing account.
2. Estimate cost with the pricing calculator.
3. Submit https://edu.google.com/intl/ALL_us/programs/credits/research/ from an institutional email, with a ≤250-word proposal.
   Opportunity value — 18. cash/credits/exposure/research = 0/8/2/8.
   Confidence — 0 (VERY LOW). No academic appointment on file.
   Fit verdict — INELIGIBLE.
   Pitch angle — Only with a PhD or faculty host. Then ask for Cloud credits to run Gemini-side evals and store traces.
   Evidence —
   https://edu.google.com/intl/ALL_us/programs/credits/research/
   https://support.google.com/google-cloud-higher-ed/answer/10324705?hl=en

### Claude for Startups

Funder — Anthropic.
Track — Claude for Startups / Claude Startups Program.
Support type — AI-CREDITS, EXPOSURE, MENTORSHIP.
Award — Official page does not publish a dollar amount. Credits and priority (highest) API rate limits are for companies that received equity funding from an institutional investor, were founded in the last four years, and have not already received Anthropic startup credits. Credits are first-party Claude API via Claude Console only. Not Bedrock. Not Vertex.
Credit value and expiry — Amount `UNKNOWN` on the official page. Expiry `UNKNOWN`. After the programme, standard API pricing. Claude family only.
Gating requirements — Anyone early-stage can join the community programme. Credits require institutional equity funding, age under four years, a Claude Console account, a company email, a website, and a short product description. Mention a partner VC or accelerator for extra benefits.
Strings attached — No equity term found. No Bedrock/Vertex use of these credits.
Applicant type required — Early-stage founder or startup. Credits: equity-funded company with institutional investment.
Status — ROLLING.
Deadline — Rolling. Form described as about two minutes.
How to apply —

1. Create a Claude Console account (API console, not claude.ai).
2. Apply on https://claude.com/programs/startups with a company email.
3. Mention the investor if you have one.
   Opportunity value — 18. cash/credits/exposure/research = 0/8/6/4. Credits subscore uses the lowest non-zero band because Anthropic withholds the figure.
   Confidence — 0 (VERY LOW) for credits (no institutional raise). Community membership without credits may still be possible; that path publishes no compute value.
   Fit verdict — INELIGIBLE for credits. WEAK for community-only membership.
   Pitch angle — Do not expect Claude credits from this track without a priced round. If a raise happens, apply immediately and spend the credits on the Claude slice of the eval matrix.
   Evidence —
   https://claude.com/programs/startups

### Google Gemini Academic Program

Funder — Google (Gemini API / Google AI).
Track — Gemini Academic Program.
Support type — AI-CREDITS.
Award — Gemini API credits and higher rate limits. Dollar amount `UNKNOWN` on the official docs page. Monthly review. Credits granted and removed at Google’s discretion.
Credit value and expiry — Amount and expiry `UNKNOWN`. Gemini family only.
Gating requirements — Faculty, staff, PhD students, or equivalent at a valid academic institution or academic research organisation, in supported countries.
Strings attached — Discretionary grant and removal. Listed interest areas include evaluations and benchmarks, which matches the project’s measurement work.
Applicant type required — Academic affiliation.
Status — ROLLING.
Deadline — Monthly review. No published calendar day.
How to apply —

1. Read https://ai.google.dev/gemini-api/docs/gemini-for-research.
2. Use the Apply now control on that page (destination form not captured in the fetch).
   Opportunity value — 16. cash/credits/exposure/research = 0/8/2/6. Credits subscore is the lowest non-zero band because the dollar cap is unpublished.
   Confidence — 0 (VERY LOW). No academic affiliation.
   Fit verdict — INELIGIBLE. Strong topical match (evaluations and benchmarks) if a university later hosts the work.
   Pitch angle — With a lab, ask for Gemini API credits to run the bounded-versus-unbounded recall tasks and publish a community eval. Deliverable: an open benchmark write-up, not a product pitch.
   Evidence —
   https://ai.google.dev/gemini-api/docs/gemini-for-research

### Anthropic — External Researcher Access Program

Funder — Anthropic.
Track — External Researcher Access Program.
Support type — AI-CREDITS.
Award — $1,000 in Claude API credits on success. Rare special cases may receive more. Standard models only. Not the Claude web app. Not non-public models.
Credit value and expiry — $1,000 USD. Expiry `UNKNOWN` on the help article. Claude only.
Gating requirements — Alignment / AI-safety researchers working on topics Anthropic calls high priority. Other research fields are explicitly out of scope for free credits. Must be in a country where Claude is available. Thousands of applications in a single week; no replies to rejected applicants.
Strings attached — Standard Usage Policy. No jailbreak exemption. Contact researcheraccess@anthropic.com only for urgent approved-credit problems.
Applicant type required — AI-safety / alignment researcher. Institutional affiliation is not required in the same words as AI for Science, but the programme is for that research topic, not for product evals.
Status — ROLLING.
Deadline — Reviewed on the first Monday of each month.
How to apply —

1. Open the application form linked from https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program.
2. Describe the team and the safety/alignment topic.
3. If you hear nothing after the Monday review, treat it as a rejection.
   Opportunity value — 16. cash/credits/exposure/research = 0/8/2/6.
   Confidence — 0 (VERY LOW). Proof is not an AI-safety research programme. Anthropic says other fields should buy credits.
   Fit verdict — INELIGIBLE. Wrong research topic.
   Pitch angle — Do not reframe Proof as alignment work to chase $1,000.
   Evidence —
   https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program

### Fireworks for Startups

Funder — Fireworks AI.
Track — Fireworks for Startups.
Support type — AI-CREDITS, MENTORSHIP, EXPOSURE.
Award — Credits that expire after one year. Dollar amount `UNKNOWN` on the official page. Higher rate limits. Credits cover on-demand inference, image, speech, embeddings, fine-tuning, and on-demand GPU deployments. Not reserved GPUs, professional services, or premium support.
Credit value and expiry — Amount `UNKNOWN`. Expiry 1 year. Open-weight and Fireworks-hosted models, not first-party Claude or GPT.
Gating requirements — Registered company with a working website. Privately held for-profit. Founded in the last 5 years. Venture-backed with more than $500,000 in funding. Not Series D or later.
Strings attached — No equity term found. Pay-as-you-go after credits end.
Applicant type required — Registered for-profit company, VC-backed above $500,000, younger than five years.
Status — ROLLING.
Deadline — Rolling. Questions: startups@fireworks.ai.
How to apply —

1. Create a Fireworks account.
2. Fill the form on https://fireworks.ai/startups.
   Opportunity value — 16. cash/credits/exposure/research = 0/8/4/4. Credits subscore is the lowest non-zero band because the official page hides the dollar figure.
   Confidence — 0 (VERY LOW). The $500,000 venture-funding rule blocks this project.
   Fit verdict — INELIGIBLE.
   Pitch angle — Do not apply.
   Evidence —
   https://fireworks.ai/startups

### Google for Startups Cloud Program — Start (unfunded)

Funder — Google Cloud / Google for Startups.
Track — Google for Startups Cloud Program, Start tier (not equity-backed).
Support type — CLOUD-CREDITS, EXPOSURE.
Award — Up to $2,000 USD in credits over one year, plus technical resources and the startup community. Same Gemini/Gemma coverage rules as other programme credits unless a later term says otherwise; third-party models are not covered on the Scale page, and Start does not contradict that.
Credit value and expiry — Up to $2,000 USD over one year. Gemini/Gemma only for model spend if the Scale note applies programme-wide — confirm at award. Not enough for the full five-study plan.
Gating requirements — Early-stage, not yet backed with startup equity funding. GCP account and billing ID. Public company website. Company email that matches the website domain. Founded within 5 years of applying for this tier (the page also says 10 years for Scale). Flatbread’s public repository dates to November 2021, which is inside five years as of August 2026, if Google accepts the repo date as founding.
Strings attached — Programme terms. Nonprofits, schools, governments, personal blogs, and consultancies are listed as rejected on the Scale/AI pages; treat Start as likely under the same exclusions until told otherwise.
Applicant type required — Early startup without institutional equity funding. Company-style website and matching email. Not clearly open to a bare GitHub user.
Status — ROLLING.
Deadline — Rolling.
How to apply —

1. Create a GCP billing account.
2. Apply through https://startup.google.com/cloud/ / the Google for Startups Cloud flow with website and matching email.
   Opportunity value — 14. cash/credits/exposure/research = 0/8/2/4.
   Confidence — 35 (LOW). No published rate. Matching company email and “not a personal blog” are the likely fails. Entity unknown.
   Fit verdict — PLAUSIBLE if Tony can show a company website and domain email. WEAK as an eval grant because $2,000 is Gemini-only and small.
   Pitch angle — Use Start only to pay Gemini-side pilot runs and Cloud logging. Do not move the product onto GCP.
   Evidence —
   https://startup.google.com/cloud/
   https://cloud.google.com/startup/ai

### Runpod Startup Program — Starter Tier

Funder — Runpod.
Track — Runpod Startup Program, Starter Tier.
Support type — CLOUD-CREDITS.
Award — $1,000 in credits usable across Pods, Serverless, Clusters, Public Endpoints, or Storage. Growth Tier is a $50,000 deposit plus $25,000 bonus under a 12-month contract and is not a grant.
Credit value and expiry — $1,000 USD. Expiry `UNKNOWN`. GPU time, not frontier APIs.
Gating requirements — Selective. Venture backing strongly preferred (Seed to Series B+). Holistic review; bootstrapped teams are told to use self-serve pay-as-you-go. New customers preferred. Ready to onboard now.
Strings attached — No published acceptance rate; the page says they cannot accept everyone. Growth Tier is a paid commit, not free compute.
Applicant type required — Startup, ideally venture-backed, with a real AI workload.
Status — ROLLING.
Deadline — Rolling.
How to apply —

1. Open https://www.runpod.io/startup-program and use Apply now.
2. If rejected, use ordinary pay-as-you-go.
   Opportunity value — 14. cash/credits/exposure/research = 0/8/2/4.
   Confidence — 15 (VERY LOW). Official copy prefers funded startups and calls the programme selective.
   Fit verdict — WEAK. $1,000 of GPU does not buy the multi-family API evals. Acceptance odds look poor without a raise.
   Pitch angle — Skip unless you already need Runpod GPUs for a self-hosted model. That is not the current plan.
   Evidence —
   https://www.runpod.io/startup-program

## Screened out

- OpenAI for Startups (direct credits) — official page https://openai.com/startups/ is a JavaScript wall in this run; search extracts say credits go through VC partners and a VC-partner form exists at https://openai.com/form/vc-partnerships-application/. No self-serve grant for an unfunded maintainer was verified on a page we could read.
- Microsoft AI for Good Open Call 2025 — Washington-state Azure-credit call, deadline 17 February 2025, closed. Not a live 2026 global credit programme. https://www.geekwire.com/2025/microsoft-launches-5m-grant-program-for-ai-projects-in-wa-state-as-part-of-50th-anniversary/ (second-hand press; no open 2026 global AI for Good credit call found on a Microsoft page).
- Cerebras YC Startup Deal — official page limits eligibility to Y Combinator startups. https://www.cerebras.ai/yc-startup-deal
- Runpod Growth Tier — not a grant; it requires a $50,000 upfront commit to receive $25,000 bonus credits. https://www.runpod.io/startup-program
- Cloudflare Workers AI / AI Gateway — prepaid credits you buy (5% fee). No open-source or research grant found. https://developers.cloudflare.com/ai-gateway/features/unified-billing/
- Fly.io open-source credits — Fly documents equity grants and donations to projects it depends on, not a public credit application. https://fly.io/docs/about/open-source/
- Cursor legacy student discount — new sign-ups ended 25 June 2026. https://cursor.com/help/account-and-billing/student-discount
- Cursor undergraduate event credits — campus and online events for students, not this project. https://cursor.com/students
- Hugging Face paid ZeroGPU credits — $1 per 10 minutes after quota, for PRO/Team/Enterprise, not a grant. https://huggingface.co/docs/hub/en/spaces-zerogpu
- EuroHPC Large Scale Access (industry) — temporarily closed / industry users needing more than 50,000 GPU hours; academia is sent to AI for Science. https://www.eurohpc-ju.europa.eu/large-scale-access-ai-factories_en
- Anthropic AI for Science rare-disease call — closed 2 August 2026, 11:59 PM PST; biology/biotech tracks only. https://www.anthropic.com/news/rare-disease-research-grants
- Modal Series B+ / Scaling tier — requires >$30M or post-Series B and a partner VC. https://modal.com/startups
- AWS Activate Credits for AI Startups (invite-only above $200,000) — account-manager path after Portfolio. https://aws.amazon.com/startups/credits/
- Google Cloud Free Trial as a research grant — not reviewed as a programme; Start/Scale/research credits are the grant tracks.
- Ordinary provider free tiers (new-account coupons, Groq developer tier, Cerebras daily token trial, OpenRouter free models) — not credit programmes.

## Leads not yet checked

- OpenAI for Startups live terms and any Ramp or partner dollar figures — https://openai.com/startups/ would not render (JS challenge). Do not use blog dollar amounts until the official page loads.
- Groq for Startups — aggregator pages cite about $10,000 and a 90-day expiry; https://home.cloud.groq.io/apply-to-groq-for-startups did not show those figures. Re-open groq.com/startups in a browser.
- Replicate startup credits — third-party write-ups cite $1,000–$10,000 at replicate.com/startups; no official page was successfully fetched.
- Lambda Labs research or startup credits — third-party pages cite lambda.ai/research and up to $5,000; official page not opened.
- OpenRouter programme terms PDF-quality text — https://openrouter.ai/startup-program-terms fetch timed out; eligibility on the main programme page was used instead.
- Modal for Academics dollar cap and expiry — FAQ on https://modal.com/startups did not expand in the fetch.
- Cursor credits for master’s, PhD, academic researchers, and educators — form at https://anysphere.typeform.com/to/bgTJGDeA. Amount `UNKNOWN`. Needs academic status the project does not have.
- Other agent-vendor credits (Claude Code campus deals, Windsurf, Continue, Copilot) — not opened beyond Cursor.
- NAIRR resource catalog line items (which partner issues how many API dollars) — catalog not opened; home page fetch timed out.
- EuroHPC Fast Lane and Playground access modes — mentioned in the FAQ, not read in full.
- Google Gemini Academic Program application form destination and dollar cap — Apply control not followed.
- NVIDIA Inception portal’s current partner-credit menu (AWS, Nebius, others) — members-only.
- Together AI application form field list and review SLA — form on the accelerator page was not captured field-by-field.
- Amazon Research Awards next cycle (Fall 2026 or later) and the rules-and-eligibility URL (https://www.amazon.science/research-awards/rules-and-eligibility returned 404).
- Vercel AI Accelerator next-cohort date — 2026 recap blog fetch timed out; search extract said applications open later this year (`UNVERIFIED`).

## Coverage note

Pages opened or attempted: 40+ official programme, FAQ, or call pages across OpenAI, Anthropic, Google (Cloud Start/Scale/AI, TRC, research credits, Gemini Academic), Microsoft for Startups, AWS Activate and Bedrock, Amazon Research Awards, NVIDIA Inception, Hugging Face Spaces, NAIRR, EuroHPC, Vercel OSS and AI Accelerator, Together AI, Modal, Fireworks, Baseten, Runpod, Cerebras, OpenRouter, Nebius, Cursor, Cloudflare, and Fly.io. Kept in the ranked list: 26 tracks. Screened out: 16. Left unchecked: the leads above.

Coverage is thinnest where official sites used JavaScript walls (OpenAI startups and researcher portals, parts of NVIDIA, OpenRouter terms, Modal FAQs) and where inference hosts publish no dollar figure (Fireworks, Claude for Startups, Modal, NVIDIA partner credits). Lambda, Replicate, and Groq still need a successful official-page load. No standalone Gemini-API grant for non-academic, non-VC applicants was found beyond Google for Startups Cloud credits. No Cursor, Cloudflare, or Fly.io research-credit programme for this project was found.

The only apply-now tracks that do not immediately fail an entity, VC, partner, or university gate are AWS Activate Founders (small, but multi-family via Bedrock), Together AI Build (open weights, selection-based), NVIDIA Inception (door to partner credits), Hugging Face ZeroGPU/community grants (demos only), Google Cloud Start ($2,000, Gemini-side, needs a company email), and watching Vercel OSS when the August window actually opens. Everything large enough to fund the full eval agenda is gated on a university, a US institution, a federal grant, a VC, or a partner referral. The highest-leverage unlocks, in order, are: an OpenRouter partner referral, an AWS Activate Provider Org ID, a for-profit company for Microsoft, and an academic or nonprofit host for ARA, NAIRR, Anthropic Science, and Gemini Academic.
