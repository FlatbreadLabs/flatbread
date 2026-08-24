# Open-source and individual AI-credit routes for Proof

Checked on 23 August 2026. Every amount, deadline, and eligibility sentence below comes from a page opened in this run or from a file in this repository. Where a fetch failed or a page hid the fact, the line says `UNKNOWN` or `UNVERIFIED` and why.

The applicant is one person, Tony Ketcham, working as FlatbreadLabs. He keeps his full-time job. Proof is a public-good library. Money is for evaluation spend, collaborator time, and project costs, not a salary replacement. Comped AI spend is first. The live blocker is recall evaluations across several model families. Country, legal entity, and employer name remain `UNKNOWN`. Do not guess the employer. Write “Tony’s employer”.

This file does not repeat the first run’s finding that most large credit programmes are startup or university programmes. It looks for open-source, individual-researcher, and free-tier routes those programmes sit on top of.

## Ranked programs

### GitHub Secure Open Source Fund

Funder — GitHub, with funding partners named on GitHub Blog posts (Alfred P. Sloan Foundation, American Express, Chainguard, Datadog, Microsoft, Shopify, Stripe, Vercel, Zerodha, and others on the programme page).
Track — GitHub Secure Open Source Fund.
Support type — CASH, AI-CREDITS, CLOUD-CREDITS, EXPOSURE, MENTORSHIP.
Award — $10,000 USD per project through GitHub Sponsors, in three parts: $6,000 during the three-week sprint, $2,000 at the six-month check-in, $2,000 at the twelve-month check-in. The live FAQ also lists free GitHub Copilot and Autofix access, and $10,000 in Azure credits. “Eligible projects have potential to receive up to $150,000 in free Azure infrastructure credits from Microsoft for Startups.” That higher Azure line needs a for-profit company on the Microsoft for Startups path and is not the default award.
Credit value and expiry — $10,000 Azure credits, expiry `UNKNOWN` on the FAQ. Copilot Pro, if granted, is $10 USD per month with a 1,000 GitHub AI Credit base on the Copilot plans page. Azure credits are described as “cloud infrastructure,” not as model-API tokens. Treat multi-family Bedrock-style spend on Azure as `UNVERIFIED` until an award letter says which Azure SKUs are eligible. Six and twelve months of check-ins leave enough calendar time for evening and weekend evals; the three-week sprint does not.
Open-source route — Open-source programme. Quote: “Anyone who is a current maintainer of an open source project. You can also apply as a team for a given open source project (max of 3 people).”
Time commitment — Official FAQ: “Selected participants must be able to commit 15 hours over a 3-week period, including weekly instruction, workshops, and focused work toward project-specific security milestones. Meetings are scheduled in Pacific Standard Time. Participants must also be available to commit 2.5 hours at both the 6-month and 12-month check-ins, totaling 20 hours for the program overall.” That is part-time. It does not require leaving employment.
Time cost to apply — About one to two working days if the repository still lacks `SECURITY.md`, a code of conduct, and a governance note. The form itself is a short application plus a later virtual interview.
IP and employment terms — Cash is paid to maintainers through GitHub Sponsors. That is outside income. Tony must check his employment agreement and, if needed, a lawyer before accepting a Sponsors payout. The FAQ requires agreement to the programme Code of Conduct and Privacy Statement. No IP assignment to GitHub was found on the programme page. The $150,000 Azure path would sit under Microsoft for Startups terms, which the first report recorded as a privately held for-profit company gate.
Applicant type required — Individual maintainer or team of at most three. Age 18 or older. Active GitHub profile. Residence in a GitHub Sponsors-supported region. Not a GitHub employee. Clear open-source licence. “Open source first project with demonstrated community traction and adoption.” “Clear governance structure prior to kick-off.” Country of residence is `UNKNOWN`.
Status — ROLLING.
Deadline — The official FAQ says applications are “open on a rolling basis and will be considered for all Program Sessions.” A GitHub Blog post on Session 4 also says “Apply for Session 5 of the GitHub Secure Open Source Fund before August 24.” That date is 24 August 2026, tomorrow. Treat Session 5 as ending tomorrow on the blog’s wording, and later sessions as still open under the FAQ.
How to apply —

1. Read https://github.com/open-source/github-secure-open-source-fund/ and confirm the applicant’s country is on the GitHub Sponsors region list.
2. Add a governance note and a `SECURITY.md` if those are still missing. The repository scan in `internal/funding/research/00-proof-fit-brief.md` found neither a `GOVERNANCE` file nor a `SECURITY.md`.
3. Click “Submit an application” / “Apply now” on that programme page. The raw form URL was not captured as a separate page.
4. Complete the virtual interview if invited.
   Opportunity — 34. credits/contributors/cash/research = 10/12/10/2 (was 30 in the first report). It moved up because this profile values a 20-hour sprint over a full-time fellowship, and because the live FAQ now states $10,000 Azure plus Copilot rather than leaving Session 5 credits unconfirmed. Cash starts at 14 for the $5k–$25k band, then subtract 4 for the three-week PST workshops and two later check-ins. Azure infrastructure credits add nothing toward model-API evals until an award letter says otherwise; Copilot Pro is the only scored AI line (band: up to $5k).
   Confidence — 8 LOW. No acceptance rate. Session 4 took 50 projects. The FAQ wants “demonstrated community traction and adoption” and governance before kick-off. The first report recorded about 64 stars and no stored download or dependent count. Residence in a Sponsors region is `UNKNOWN`.
   Fit verdict — PLAUSIBLE. It admits a solo maintainer, does not demand full-time work, and the time load is small. It buys a security sprint, not the recall matrix.
   Pitch angle — Pitch security of the write path, not agent-memory research. Proof stores typed Markdown beside the code and writes through 16 journalled mutations. The three-week deliverable is a public `SECURITY.md`, private disclosure contact, CodeQL on the journal and CLI, secret scanning, and a short incident-response note. The $10,000 pays Tony’s evening hours for that sprint. Copilot, if granted, can run security review and a thin OpenAI-family slice of the recall harness. Do not claim Azure will pay Claude or GPT tokens unless the award letter says so.
   Evidence —
   https://github.com/open-source/github-secure-open-source-fund/
   https://github.blog/open-source/maintainers/what-50-open-source-projects-taught-us-about-security-in-the-ai-era/
   https://docs.github.com/en/copilot/get-started/plans

### Gemini API free tier and Gemini CLI free tier

Funder — Google.
Track — Gemini Developer API Free tier, plus Gemini CLI personal-account free tier.
Support type — AI-CREDITS.
Award — Gemini Developer API: “Start building free of charge with generous limits.” Free-tier rows for Gemini 3.7 Flash, 3.6 Flash, 3.5 Flash, and 3.5 Flash-Lite list input and output as “Free of charge.” Paid Flash 3.7 prices, for comparison, are $0.75 input and $3.75 output per 1M tokens through 31 December 2026. Gemini CLI README: “Free tier: 60 requests/min and 1,000 requests/day with personal Google account.” The CLI also documents a Gemini API key path at “1000 requests/day with Gemini 3 (mix of flash and pro).”
Credit value and expiry — No coupon expiry. Limits reset; the rate-limits page says RPD quotas reset at midnight Pacific time. Free-tier content “Used to improve our products: Yes.” A part-time maintainer can spread a 48-run study across several evenings inside the 1,000-request daily CLI cap. Dollar value of that free capacity is not published as a credit grant. One family only: Gemini.
Open-source route — General free tier, not an open-source programme. Quote from the pricing page: “Free. For developers and small projects getting started with the Gemini API.” No company, university, or download threshold is stated.
Time commitment — None after sign-up. Rate limits only.
Time cost to apply — Zero. Create a Google account and an AI Studio API key, or sign in to Gemini CLI.
IP and employment terms — Free-tier prompts and outputs “may be used to provide, improve, and develop Google products” on the pricing page. Do not send employer secrets or unpublished Proof internals on the free tier. Tony must check his employment agreement before pasting work code into a free Google product. Paid tier lists “Content not used to improve our products.” No ownership assignment was found.
Applicant type required — Individual with a Google account. Academic affiliation is not required for the free tier. The Gemini Academic Program is a separate, faculty/PhD track and is screened out below.
Status — OPEN.
Deadline — None. Standing free tier.
How to apply —

1. Open https://ai.google.dev/gemini-api/docs/pricing and create a key in Google AI Studio.
2. For agent runs, install Gemini CLI from https://github.com/google-gemini/gemini-cli and sign in with a personal Google account.
3. Watch live limits in AI Studio. The rate-limits page does not print a fixed free-tier RPM/TPM table; it says “View your active rate limits in AI Studio.”
   Opportunity — 28. credits/contributors/cash/research = 20/0/0/8. Not in the first report as a ranked programme. Scored in the $5k–$25k credits band because 1,000 CLI requests per day is enough to run the five-study agenda on evenings and weekends, at no application cost. Add nothing beyond Gemini. This is the cheapest Gemini-family slice of a cross-family eval.
   Confidence — 90 VERY HIGH for access. A personal Google account is the published gate. Confidence that free-tier quota will cover every run in a busy month is lower, because Colab-style free compute is not guaranteed and Gemini’s numeric free RPM/TPM table is account-specific.
   Fit verdict — STRONG. No company, no application, no full-time rule. One family only.
   Pitch angle — No pitch. Turn the key on, instrument provider calls, and run the Gemini slice of studies 1, 2, and 4. Publish Findings. Move to the paid Gemini tier only if free-tier data-use or quota becomes a problem.
   Evidence —
   https://ai.google.dev/gemini-api/docs/pricing
   https://ai.google.dev/gemini-api/docs/rate-limits
   https://github.com/google-gemini/gemini-cli
   https://ai.google.dev/gemini-api/docs/gemini-for-research

### Groq Cloud Free plan

Funder — Groq.
Track — Groq Cloud Free plan (self-serve developer tier, not Groq for Startups).
Support type — AI-CREDITS.
Award — $0 plan with model-specific free rate limits. The official rate-limits page lists a Free Plan table. Named free-plan rows include `openai/gpt-oss-120b` and `openai/gpt-oss-20b` at 30 RPM, 1,000 RPD, 8,000 TPM, 200,000 TPD; `qwen/qwen3.6-27b` at the same caps; `groq/compound` and `groq/compound-mini` at 30 RPM, 250 RPD, 70,000 TPM. The models page prices the paid Developer plan at $0.15 / $0.60 per 1M tokens for GPT-OSS 120B and $0.075 / $0.30 for GPT-OSS 20B. No credit-card requirement is stated on the rate-limits page.
Credit value and expiry — No coupon. Standing free tier. 200,000 tokens per day on GPT-OSS 120B is enough for a bounded recall study if Tony spreads runs over evenings. A 90-day startup-credit expiry does not apply here. One open-weight stack, not Claude or GPT-closed.
Open-source route — General free tier, not an open-source programme. Quote from the rate-limits page: “Need higher rate limits? Upgrade to Developer plan.” The Free Plan is the default self-serve tier. `groq.com/startups` returned HTTP 404 in this run, so there is no verified Groq open-source credit programme.
Time commitment — None. Rate limits only.
Time cost to apply — Zero. Create a Groq Cloud account at https://console.groq.com/.
IP and employment terms — Sign-up accepts the Groq Services Agreement and Privacy Policy. No IP assignment or outside-employment warranty was found on the rate-limits or models pages. Tony must still check whether his employment agreement restricts sending project code to a third-party API.
Applicant type required — Individual developer. No company or university is stated for Free.
Status — OPEN.
Deadline — None.
How to apply —

1. Create an account at https://console.groq.com/.
2. Create an API key.
3. Call `openai/gpt-oss-120b` or `qwen/qwen3.6-27b` inside the Free Plan caps.
4. Read live limits on the account Limits page. The docs say exact limits can differ by organisation.
   Opportunity — 28. credits/contributors/cash/research = 20/0/0/8. Not ranked as a free tier in the first report. The $5k–$25k credits band is the usable multi-month capacity of 200,000 TPD, not a cash coupon. This free tier beats a Groq startup coupon for this applicant: no form, no 90-day burn, no company.
   Confidence — 88 VERY HIGH for access. The Free Plan is published. Confidence that 8,000 TPM is enough for long agent traces is lower; a single fat prompt can exhaust the minute budget.
   Fit verdict — STRONG. Individual, no application, open-weight family for the eval matrix.
   Pitch angle — No pitch. Use Groq for the open-weight side of studies 1–4. Log tokens and latency. Do not wait for a startup form that 404s.
   Evidence —
   https://console.groq.com/docs/rate-limits
   https://console.groq.com/docs/models
   https://console.groq.com/

### Together AI Startup Accelerator — Build

Funder — Together AI.
Track — Together AI Startup Accelerator, Build tier.
Support type — AI-CREDITS, CLOUD-CREDITS, EXPOSURE, MENTORSHIP.
Award — Build (up to $5M raised): up to $15,000 platform credits and 3 hours of forward-deployed engineering. Credits cover serverless inference, dedicated endpoints, fine-tuning, and instant clusters. Credits do not apply to Reserved GPU Clusters. Scale and Grow tiers need $5M–$10M and over $10M raised.
Credit value and expiry — Up to $15,000. Expiry `UNKNOWN` on the accelerator page. Together hosts many open models, not first-party Claude or GPT. Useful as the open-weight family, not the whole matrix. A part-time maintainer can spend $15,000 of inference over months if expiry is not short; confirm expiry before accepting.
Open-source route — Startup programme, not an open-source programme. Quote: “A targeted selection-based program for startups.” Schema.org on the same page: “Pre-seed to growth-stage AI startups.” The separate Research Credits page is invite-only for “students conducting research projects outside of formal classes” and is screened out below.
Time commitment — After acceptance, `UNKNOWN` beyond using credits and optional engineering hours. The page does not require full-time work or relocation. Joint GTM and a VC-network introduction are offers, not a founding mandate. Treat time as `UNKNOWN` after looking at the accelerator page; ask Together before accepting.
Time cost to apply — About half a day. Company, product, and funding fields on https://www.together.ai/startup-accelerator.
IP and employment terms — No equity term found. No IP-assignment clause on the accelerator page. A “startup” application may still ask Tony to describe a company. Check the employment agreement before signing anything that warrants he owns the product or can take outside credits.
Applicant type required — Startup, including teams that have raised nothing, if they fit Build (“Up to $5M raised”). Worldwide. Incorporation is not spelled out. A solo MIT library with no company may be refused.
Status — ROLLING.
Deadline — Rolling. Review time `UNKNOWN`.
How to apply —

1. Open https://www.together.ai/startup-accelerator.
2. Fill the application (company, product, funding).
3. Wait for Together to provision credits if accepted.
   Opportunity — 30. credits/contributors/cash/research = 20/6/0/4 (was 30 in the first report). The headline number is unchanged. The new rubric still lands in the $5k–$25k credits band. Contributors dropped a little because Together’s 800,000-developer GTM is user reach, not a second maintaining organisation. Research dropped because the page sells product scale, not evaluation science.
   Confidence — 22 LOW. No acceptance rate. The page still frames a startup. Tony is not leaving his job to run a company. Build does not require a raise, but selection is discretionary.
   Fit verdict — PLAUSIBLE for open-weight credits if Tony applies as a startup and Together accepts a one-person library. WEAK as a life plan.
   Pitch angle — Proof needs open-weight runs next to Gemini and one closed family. Together credits pay the hosted-open-weight side: same tasks, same graphs. The three engineering hours can help wire the eval harness to Together’s API. Deliverable: a public Finding that names Together models and token cost.
   Evidence —
   https://www.together.ai/startup-accelerator
   https://www.together.ai/research-credits-program-request

### OpenAI Codex for Open Source

Funder — OpenAI.
Track — Codex for Open Source, including the Codex Open Source Fund.
Support type — AI-CREDITS.
Award — Six months of ChatGPT Pro with Codex for “day-to-day coding, triage, review, and maintainer workflows.” Conditional Codex Security for core maintainers with write access. “API credits through the Codex Open Source Fund for projects that use Codex in pull request review, maintainer automation, release workflows, or other core OSS work.” The live programme page does not publish a per-project dollar cap. The first report’s “up to $25,000” figure was not on any page opened in this run; treat that amount as `UNVERIFIED` and do not repeat it as fact. The page does say the Codex Open Source Fund is “$1 million.”
Credit value and expiry — ChatGPT Pro for six months. Retail ChatGPT Pro price was not loaded (https://openai.com/chatgpt/pricing returned a JavaScript wall). API-credit amount and expiry `UNKNOWN`. Six months is enough calendar time for a part-time eval if the credits may be spent on API evals. The published use is maintainer automation, not a research grant. OpenAI models only.
Open-source route — Open-source programme. Quote: “If you're a core maintainer or run a widely used public project, apply. If your project doesn't fit the criteria but it plays an important role in the ecosystem, apply anyway and explain why.” No star, download, or dependent number is published. Terms say OpenAI “may consider factors such as repository usage, ecosystem importance, evidence of active maintenance, role or permissions, and Program capacity.”
Time commitment — None stated after acceptance beyond using the tools. No full-time or relocation rule in the terms.
Time cost to apply — Under half a day. The form asks for GitHub username, public repo URL, primary or core maintainer role, a 500-character “why this repository qualifies” field, optional API-credit use, and an OpenAI Organization ID.
IP and employment terms — Benefits are “personal, limited, non-transferable, and have no cash value” and “may not be sold, assigned, sublicensed, exchanged, or shared.” No exclusivity: OpenAI may develop similar ideas. No duty of confidentiality on the application. Recipients are responsible for taxes. Tony must check whether his employment agreement treats ChatGPT Pro or API credits as outside compensation, and whether he may put employer or project code into OpenAI tools.
Applicant type required — Individual with a ChatGPT account and a public GitHub repository. Primary or core maintainer. No company required.
Status — ROLLING.
Deadline — Rolling. “We review applications on a rolling basis and notify selected applicants by email.”
How to apply —

1. Make the GitHub profile and repository public.
2. Create or identify the OpenAI organisation that would receive API credits.
3. Submit https://openai.com/form/codex-for-oss/.
4. Agree to https://learn.chatgpt.com/docs/codex-for-oss-terms.
   Opportunity — 24. credits/contributors/cash/research = 10/8/0/6 (was 22 in the first report). It moved slightly up because this profile values agent-tool credits (Codex / ChatGPT Pro) that cost Tony no extra time, and because the official page now states the $1 million fund without a published per-project cap. Credits stay in the up-to-$5k band until a dollar figure is on a page we opened. Research rose because Codex can run the agent side of the recall studies, not only PR bots.
   Confidence — 8 VERY LOW. No acceptance rate. “Widely used” is undefined. The first report recorded about 64 stars and no stored download count. Near-miss projects may still apply and explain ecosystem role.
   Fit verdict — PLAUSIBLE to apply, WEAK to count on. The route admits an individual maintainer. The traction bar is the risk.
   Pitch angle — Proof is MIT-licensed typed memory for coding agents. Ask for ChatGPT Pro so Codex can run maintainer workflows that read and write Proof records, and ask for API credits to repeat the 12-run recall design with provider logs. Deliverable: an open harness and a Finding. Do not invent a $25,000 ask.
   Evidence —
   https://developers.openai.com/community/codex-for-oss
   https://openai.com/form/codex-for-oss/
   https://learn.chatgpt.com/docs/codex-for-oss-terms

### Claude for Open Source

Funder — Anthropic, PBC.
Track — Claude for Open Source Program.
Support type — AI-CREDITS, EXPOSURE.
Award — Six months of complimentary Claude Max 20x. Official consumer pricing lists Max “From $100 Per month” with “Choose 5x or 20x more usage than Pro.” Pro includes Claude Code. The terms do not grant API credits. The marketing page and terms describe a Claude.ai / Max subscription, not Console API credits. Cap: 10,000 approved recipients unless Anthropic raises it.
Credit value and expiry — Six months from activation. Activation link expires 90 days after the gift code is sent. After six months the complimentary plan ends; a prior paid plan resumes unless cancelled. Six months is enough for evening evals if Claude Code under Max can drive the agent runs. This is not a token pool for the Anthropic API. Claude family only.
Open-source route — Open-source programme. Quote from the live page: “Maintainers and library authors: You maintain packages that others build on: 500 or more dependent repos, 100 or more dependent packages, or 200,000 or more combined monthly downloads across any registry (npm, PyPI, crates.io, RubyGems, or similar).” Other published tracks: listed committer on a named foundation or language project; 100 or more PRs merged into repos the applicant does not own in 12 months; 20 or more unique external contributors with merged PRs in 12 months; OpenSSF criticality score of 0.4 or above. “Don't quite fit? If you maintain something the ecosystem quietly depends on, apply anyway.” Blog posts that said 5,000 GitHub stars or 1 million npm downloads are second-hand and do not match the official terms opened in this run.
Time commitment — None after acceptance. Individual use only. Account sharing is prohibited.
Time cost to apply — Under half a day. GitHub OAuth, a short use plan, and up to 500 words on why the applicant qualifies.
IP and employment terms — Subscription is personal, non-transferable, no cash value. Anthropic may identify the recipient publicly by name, GitHub username, and project. Optional co-marketing. Existing paid billing pauses and later resumes. Overage charges may still apply. Tony must check his employment agreement before a public “programme recipient” listing, and before using Claude on code his employer may claim. No API-licence warranty was found because this is not an API grant.
Applicant type required — Natural person, not a company. Age 18 or majority. Resident of a country where Claude.ai is available. GitHub account in good standing and at least two years old. Public OSS activity in the last 90 days. At least one OSI-approved licence. Not an Anthropic employee or household member.
Status — ROLLING. The official terms say the application period “remains open until Anthropic closes it.” Second-hand blogs that named 30 June 2026 as a close date are not on the official terms or marketing page opened today; those pages still say apply now.
Deadline — Rolling until Anthropic closes the programme or hits 10,000 recipients. No calendar close date on the official pages opened today.
How to apply —

1. Read https://www.anthropic.com/claude-for-oss-terms.
2. Apply at https://claude.com/open-source-max (terms also name this URL) or the live form at https://claude.com/contact-sales/claude-for-oss. Sign in with GitHub.
3. If the numeric bars are missed, use the Ecosystem Impact Track and explain dependents and role.
   Opportunity — 22. credits/contributors/cash/research = 10/6/0/6. Not in the first report. Credits stay in the up-to-$5k band: Max “from $100/month” times six is $600 at the floor, and the benefit is a subscription, not API tokens. Research is non-zero only if Claude Code on Max can run the agent studies. Contributors reflect a public recipient listing, not a second organisation.
   Confidence — 12 VERY LOW. No acceptance rate. The 10,000 cap and discretionary review are published. Proof’s stored download and dependent counts are a gap in `00-proof-fit-brief.md`. The Ecosystem Impact Track exists, but Anthropic “will contact you only if your application is approved.”
   Fit verdict — PLAUSIBLE to apply on the discretionary track. WEAK to plan the eval budget on it. The published numeric bars are likely missed. The benefit is Claude Code / Max, not API credits.
   Pitch angle — Apply as the maintainer of an MIT agent-memory library that coding agents already write through. Ask for Max so Claude Code can run the Claude slice of the recall matrix and maintainer review. Say plainly that the project is early and name the typed graph and the 12-run Finding. Do not reframe Proof as alignment work.
   Evidence —
   https://claude.com/contact-sales/claude-for-oss
   https://claude.com/open-source-max
   https://www.anthropic.com/claude-for-oss-terms
   https://www.anthropic.com/pricing

### AWS Activate — Founders

Funder — Amazon Web Services.
Track — AWS Activate Founders (self-funded).
Support type — AI-CREDITS, CLOUD-CREDITS.
Award — $1,000 USD to start. Select participants may later receive additional credits up to $5,000. Activate credits apply to more than 200 AWS services and, per an AWS startups blog opened in the first report and still the published Bedrock story, to third-party foundation models on Amazon Bedrock. This run re-opened https://aws.amazon.com/startups/credits/ only through the first-report trail; the Founders amounts above are the figures on that official credits page as recorded in `internal/funding/README.md`. Reconfirm the live page before applying.
Credit value and expiry — $1,000 to $5,000. AWS’s Activate credits article, as recorded in the first report, says credits usually expire within 1–2 years. That window is long enough for evening evals. Multi-family coverage through Bedrock is the reason this small grant still ranks.
Open-source route — Startup programme, not an open-source programme. Quote from the first-report capture of the official page, still the live credits URL: self-funded startup with a functioning company website, founded in the last 10 years, AWS account on a paid tier. No OSS-maintainer track was found on AWS in this run.
Time commitment — None found after acceptance beyond using credits. No full-time or relocation rule on the credits pages cited.
Time cost to apply — About one day: Builder ID, paid AWS account, website, short product description.
IP and employment terms — AWS Promotional Credit Terms. No equity term found in the first report. A paid AWS account and a “company website” may look like a commercial product to Tony’s employer. Check the employment agreement before opening a paid cloud account in his own name and before warranting that he owns the software.
Applicant type required — Self-funded startup with a public website. Incorporation is not spelled out. Entity status is `UNKNOWN`.
Status — ROLLING.
Deadline — Rolling. About 7–10 business days to a decision, per the first report’s official how-to page.
How to apply —

1. Create an AWS Builder ID at https://aws.amazon.com/startups/credits/.
2. Choose Activate Founders.
3. Describe the product and confirm self-funded status.
4. Link a paid-tier AWS account and submit.
   Opportunity — 22. credits/contributors/cash/research = 10/4/0/8 (was 20 in the first report). It moved two points because this profile values the only self-serve multi-family API path more than startup optics. Credits stay in the up-to-$5k band.
   Confidence — 15 VERY LOW. No acceptance rate. “Functioning company website” and “startup” are the likely fails for a personal MIT library.
   Fit verdict — PLAUSIBLE. Small money. It is still the only apply-now coupon this run found that can put several closed-model families on one bill without a VC, a university, or a partner code.
   Pitch angle — Proof needs Bedrock so one account can call several foundation models for the same recall tasks. $1,000 is enough to instrument provider calls and repeat the existing 12-run design with real token logs. Deliverable: a public Finding with model, token, and cost columns.
   Evidence —
   https://aws.amazon.com/startups/credits/

### Lambda Research Grant

Funder — Lambda.
Track — Lambda Research Grant.
Support type — CLOUD-CREDITS, EXPOSURE, MENTORSHIP.
Award — “Offering qualifying researchers up to $5,000 in cloud credits to develop and showcase their work using Lambda's Instances, with select research to be featured on our website.”
Credit value and expiry — Up to $5,000. Expiry `UNKNOWN` on https://lambda.ai/research. GPU instances, not Claude or GPT APIs. A 90-day burn is not stated. Evening and weekend use is possible if the grant lasts months; confirm before accepting.
Open-source route — Research grant, not a startup programme and not a named OSS programme. Quote: “We're committed to supporting groundbreaking research by offering qualifying researchers up to $5,000 in cloud credits.” Whether an unaffiliated individual counts as a “qualifying researcher” is `UNKNOWN` after reading the page. Featured work on the page is academic-style papers (ICLR, NeurIPS, ICML, TMLR).
Time commitment — Public development and showcase. No hour count. No full-time or relocation rule found.
Time cost to apply — One to two days for a short research scope and GPU budget.
IP and employment terms — Work must be developed and shown publicly, per the first report’s reading, which this run’s page supports with “showcase their work” and public featured papers. No IP-assignment clause found. Tony must check whether his employer claims side-project IP before publishing a Lambda-funded paper or dataset.
Applicant type required — “Qualifying researcher.” Unaffiliated rule `UNKNOWN`.
Status — ROLLING.
Deadline — No fixed deadline on the page.
How to apply —

1. Write a research scope and GPU budget for open-weight recall studies.
2. Use “Apply for a grant” on https://lambda.ai/research.
3. Confirm unaffiliated-individual eligibility and expiry before accepting.
   Opportunity — 22. credits/contributors/cash/research = 10/4/0/8 (was 22 in the first report). Unchanged. GPU credits still do not buy closed-model APIs.
   Confidence — 12 VERY LOW. No acceptance rate. Eligibility for an unaffiliated maintainer is unpublished.
   Fit verdict — PLAUSIBLE for the open-weight GPU slice if Lambda accepts an unaffiliated applicant. WEAK as the eval budget.
   Pitch angle — Ask for instance credits to run open-weight models on matched repositories with and without typed relations. Deliverable: public harness and a technical report Lambda can feature.
   Evidence —
   https://lambda.ai/research

### Arcee AI Trinity Builders Program

Funder — Arcee AI.
Track — Trinity Builders Program.
Support type — AI-CREDITS.
Award — Free Arcee API inference for Trinity-family models. Applicants request under 50 million, 50–200 million, 200–500 million, 500 million–1 billion, or above 1 billion tokens. Actual allocation and dollar value are `UNKNOWN`.
Credit value and expiry — Awarded credits are valid 90 days from allocation and are non-transferable. Ninety days is tight for a part-time maintainer. Instrument the harness before applying. One family: Trinity.
Open-source route — Open-source / community programme. Quote: “A community credit grant for developers, researchers, and open source builders working with Trinity models.” No star or download threshold. No company required.
Time commitment — None after acceptance beyond using credits inside 90 days. Feedback is “appreciated but not a hard requirement.”
Time cost to apply — A few hours. The page says the form takes a few minutes; writing a token budget and community-value note takes longer if the harness is not ready.
IP and employment terms — “No data processed through the program is ever retained or used for model training.” Not a contractual commitment; Arcee may modify or stop the programme. No exclusivity or outside-employment clause found. Still check the employment agreement before sending project graphs through a third-party API.
Applicant type required — Individual developer or researcher, or an open-source team. No country gate on the page.
Status — ROLLING.
Deadline — No fixed deadline. Best-effort rolling review.
How to apply —

1. Instrument the evaluation harness first.
2. Pick a token range and describe community value.
3. Submit through https://www.arcee.ai/trinity-builders-program.
4. Run the work inside 90 days if approved.
   Opportunity — 20. credits/contributors/cash/research = 10/2/0/8 (was 12 in the first report). It moved up because this profile finally has an applicant who may apply as an individual, and because a Trinity token grant is one real family in the matrix. The first report scored credits at 0 for lack of a dollar figure; this run puts unknown token volume in the up-to-$5k band rather than at zero, and says so.
   Confidence — 40 MODERATE. No acceptance rate. The call names agentic workflows, evaluation, and open-source builders with no traction threshold.
   Fit verdict — STRONG as an apply-now OSS credit. One family only. The 90-day clock is the operational risk.
   Pitch angle — Request Trinity API access for a public evaluation of whether typed relations change a later agent’s answer. Instrument first. Report exact model and settings. Share results with Arcee.
   Evidence —
   https://www.arcee.ai/trinity-builders-program

### OpenRouter free-model tier

Funder — OpenRouter.
Track — Standing `:free` model variants on the OpenRouter API.
Support type — AI-CREDITS.
Award — Models whose IDs end in a free variant are provided at $0 token price, with platform rate limits. The official limits page states two free-usage rows keyed on lifetime credits purchased, plus Cloudflare DDoS protection. The numeric RPM, RPD, and dollar-threshold values did not render in the HTML opened this run (the page ships template placeholders). FAQ text likewise uses placeholders. Second-hand blogs quote 20 RPM and 50 RPD until a $10 lifetime purchase, then 1,000 RPD; those numbers are `UNVERIFIED` until a browser session shows the filled table.
Credit value and expiry — Standing free endpoints, not a coupon. A negative credit balance can block even free models. Free endpoints are lower priority and may train or log per provider; check each model card. A part-time eval can use free models across several families if the daily cap holds. That is the point of OpenRouter.
Open-source route — General free tier, not an open-source programme. Quote from the FAQ page: “There are many free models available on OpenRouter… these models have low rate limits… and are usually not suitable for production use.” The startup programme is a separate, full-time, partner-referred track and is screened out below.
Time commitment — None.
Time cost to apply — Zero to create an account. A small credit purchase may be needed to keep the balance non-negative; the official threshold is `UNKNOWN` in the rendered HTML.
IP and employment terms — Standard OpenRouter terms. Prompts may be logged by upstream providers. Tony must check employment rules before sending project text to a multi-provider router, especially on free endpoints.
Applicant type required — Individual with an OpenRouter account. No company required for `:free` models.
Status — OPEN.
Deadline — None.
How to apply —

1. Create an account at https://openrouter.ai/.
2. Read https://openrouter.ai/docs/api/reference/limits and https://openrouter.ai/docs/faq in a browser so the numeric free-tier table is visible.
3. Call `:free` models. Keep the account balance at or above zero.
   Opportunity — 18. credits/contributors/cash/research = 10/0/0/8. Not ranked as a free tier in the first report. Credits stay in the up-to-$5k band because official dollar capacity was not printed. This free tier can beat OpenRouter for Startups for this applicant: no full-time product rule, no partner referral.
   Confidence — 70 HIGH for access to some free models. Confidence in daily throughput is LOW until the numeric table is read in a browser.
   Fit verdict — STRONG as a no-application cross-family probe. WEAK as a production eval fabric until limits are confirmed.
   Pitch angle — No pitch. Use `:free` models to dry-run the harness across families, then pay or seek credits for the recorded study.
   Evidence —
   https://openrouter.ai/docs/api/reference/limits
   https://openrouter.ai/docs/faq
   https://openrouter.ai/startup-program

### GitHub Copilot Pro for open-source maintainers

Funder — GitHub / Microsoft.
Track — Free Copilot Pro for maintainers of a popular open-source repository.
Support type — AI-CREDITS.
Award — Free Copilot Pro if GitHub’s monthly check says the account qualifies. Copilot Pro is $10 USD per month with a 1,000 GitHub AI Credit base and “a selection of models.” Copilot Free remains available to any individual without org Copilot, with limited features and Auto model selection only.
Credit value and expiry — Monthly, re-evaluated every month. No published star or download threshold. “Popular open-source repository” is not defined on the docs page opened. If granted, the allowance refreshes monthly, which is better for a part-time maintainer than a 90-day coupon. Multi-family coverage is `UNKNOWN` on the plans page (“a selection of models”).
Open-source route — Open-source programme. Quote: “Verified teachers, and maintainers of popular open source projects may be eligible for free access to Copilot Pro.” “As a maintainer of a popular open-source repository.”
Time commitment — None. Eligibility is checked in Copilot settings.
Time cost to apply — Minutes, if eligible. There is no application essay. If ineligible, the page offers Copilot Free or a paid plan.
IP and employment terms — Copilot use on a personal account may still send code to GitHub’s models. If Tony’s employer issues Copilot through an organisation, Copilot Free is not available on that identity. Check the employment agreement and whether side-project use of a personal Copilot grant conflicts with employer policy.
Applicant type required — Individual GitHub user who maintains a popular public repository, or a verified teacher. No company required.
Status — ROLLING.
Deadline — None. Monthly re-check.
How to apply —

1. Open GitHub Copilot settings from the profile menu.
2. If the page titled “GitHub Copilot Pro” says the account is eligible, click Get access, set policies, and save.
3. If not eligible, use Copilot Free or skip.
   Opportunity — 16. credits/contributors/cash/research = 10/4/0/2. Not scored as its own credit programme in the first report. Credits are a $10/month seat, not an eval grant. Contributors are weak: Copilot does not recruit maintainers.
   Confidence — 20 LOW. No published popularity bar. A 64-star project, as recorded in the first report, may not qualify. Checking the settings page is cheap.
   Fit verdict — PLAUSIBLE to check. WEAK as the eval budget.
   Pitch angle — No pitch. Open the settings page. If Pro appears, use it for maintainer work and a thin agent slice. Do not plan the five-study agenda on 1,000 monthly AI credits.
   Evidence —
   https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/enable-copilot/set-up-for-teachers-and-os-maintainers
   https://docs.github.com/en/copilot/get-started/plans

### Google Colab free tier

Funder — Google.
Track — Colaboratory free-of-charge hosted notebooks.
Support type — CLOUD-CREDITS.
Award — “Colab is a hosted Jupyter Notebook service that requires no setup to use and provides free of charge access to computing resources, including GPUs and TPUs.” Resources are “not guaranteed and not unlimited, and usage limits sometimes fluctuate.” Paid compute-unit plans exist; this entry is the free tier only.
Credit value and expiry — No coupon. Session length and GPU type are `UNKNOWN` on the FAQ beyond “not guaranteed.” Fine for small open-weight probes. Poor for a 48-run agent matrix that needs stable APIs. A weekend notebook can finish a tiny open-weight pilot.
Open-source route — General free tier. Quote: “Yes. Colab is free of charge to use.” No OSS or university gate.
Time commitment — None.
Time cost to apply — Zero. Google account.
IP and employment terms — Notebooks live in Google Drive. Sharing a notebook shares its contents. Do not put employer secrets in a Colab notebook. Check the employment agreement.
Applicant type required — Individual with a Google account.
Status — OPEN.
Deadline — None.
How to apply —

1. Open https://colab.research.google.com/ with a Google account.
2. Use a GPU or TPU runtime for a small open-weight probe only.
3. Read https://research.google.com/colaboratory/faq.html for disallowed uses.
   Opportunity — 14. credits/contributors/cash/research = 10/0/0/4. Not ranked in the first report. Credits stay in the up-to-$5k band as fluctuating free GPU, not a grant.
   Confidence — 80 VERY HIGH for access. VERY LOW that Colab can host the full recall agenda.
   Fit verdict — PLAUSIBLE for a tiny open-weight prototype. WEAK as the eval host.
   Pitch angle — No pitch. Use Colab only to prove a local open-weight adapter. Run the real studies on APIs.
   Evidence —
   https://research.google.com/colaboratory/faq.html
   https://sites.research.google/trc/about/

### Mistral AI Ambassador program

Funder — Mistral AI.
Track — AI Ambassador program.
Support type — AI-CREDITS, EXPOSURE, MENTORSHIP.
Award — “Mistral Ambassadors will receive free API credits on Studio.” Dollar amount `UNKNOWN`. Also: feature preview, public recognition, Discord/Slack access, event invites.
Credit value and expiry — Amount and expiry `UNKNOWN`. Mistral family only. A six-month ambassador term is the published commitment window, which is enough calendar time if credits last that long.
Open-source route — Community / advocacy programme, not a named OSS-maintainer credit. Quote: “we are looking for Mistral experts who are passionate about our models and offerings, and who are committed to giving back to the community.” Open-source contributions are one listed form of community involvement, not a star threshold.
Time commitment — “Willingness to commit to the program for at least 6 months.” “Ability to dedicate time regularly to ambassador activities and community engagement.” Roles: community support, tutorials or posts, product feedback, event participation. Not full-time. Still a real monthly load for a part-time maintainer.
Time cost to apply — Half a day plus a possible interview.
IP and employment terms — Public recognition on the Mistral site. Regular public advocacy. Check the employment agreement before becoming a named vendor ambassador while holding a full-time job, and before taking free API credits as outside value.
Applicant type required — Individual. Technical AI/ML experience, community involvement, communication skills. No company required.
Status — ROLLING.
Deadline — Rolling. “Applications are open on a rolling basis.”
How to apply —

1. Read https://docs.mistral.ai/resources/ambassadors.
2. Use “Fill out your application” on that page.
3. Join Mistral Discord if invited to discuss next steps.
   Opportunity — 14. credits/contributors/cash/research = 10/4/0/0. Not in the first report. Credits stay in the up-to-$5k band because the dollar figure is unpublished. Research is 0: the job is advocacy, not paying for evaluation. Contributors are content reach, not a second maintainer.
   Confidence — 18 VERY LOW. No acceptance rate. The current ambassador list is public and small. Regular advocacy time competes with Proof work.
   Fit verdict — WEAK. Individual-eligible, but the time is spent promoting Mistral, not running the recall matrix.
   Pitch angle — Only apply if Tony already wants to write Mistral tutorials. Do not take a six-month advocacy job to chase unpublished credits.
   Evidence —
   https://docs.mistral.ai/resources/ambassadors

### TPU Research Cloud

Funder — Google.
Track — TPU Research Cloud (TRC).
Support type — CLOUD-CREDITS.
Award — Temporary free Cloud TPU quota on the recipient’s Google Cloud project. “A cluster of more than 1,000 Cloud TPU devices.” Host VMs and Cloud Storage are not free. Not compatible with Vertex AI workflows.
Credit value and expiry — TPU hours at no charge; other GCP services billed. Duration “temporary.” Expiry `UNKNOWN`. TPUs do not serve Claude or GPT.
Open-source route — Research access, not an OSS-maintainer programme. Quote: “Anyone can express interest in joining the program by signing up at sites.research.google/trc.” Recipients must share results through papers, open source, or posts.
Time commitment — Share research and give Google feedback. No hour count. No relocation rule.
Time cost to apply — Under half a day for the interest form.
IP and employment terms — Accept Google Terms, Privacy Policy, and Google AI Principles. Public sharing of TRC-supported research. Check the employment agreement before publishing and before attaching a personal GCP project.
Applicant type required — Researcher. The FAQ says anyone can express interest. A GCP project is required.
Status — ROLLING.
Deadline — Rolling invitations.
How to apply —

1. Sign up at https://sites.research.google/trc.
2. If invited, attach free TPU quota to a GCP project.
3. Questions: the FAQ points at TRC support.
   Opportunity — 14. credits/contributors/cash/research = 10/0/0/4 (was 10 in the first report). Slightly up because anyone may express interest, which this profile can do. Hardware still misses the API evals.
   Confidence — 25 LOW. No acceptance rate. Technical match is poor.
   Fit verdict — WEAK. Easy to apply. Wrong accelerator for studies 1–5.
   Pitch angle — Apply only if the project later ports an open model eval to JAX or PyTorch on TPU.
   Evidence —
   https://sites.research.google/trc/about/
   https://sites.research.google/trc/faq/

### Hugging Face ZeroGPU, Community GPU Grants, and Inference Providers free credits

Funder — Hugging Face.
Track — Spaces ZeroGPU; Community GPU Grants; Inference Providers monthly credits.
Support type — AI-CREDITS, CLOUD-CREDITS, EXPOSURE.
Award — Free personal accounts in good standing (verified email, older than 30 days) may host up to 2 ZeroGPU Spaces. Daily GPU quota: 5 minutes free, 40 minutes PRO. Community GPU Grants upgrade public Space hardware. Inference Providers: “Free Users $0.10, subject to change” per month, routed through Hugging Face; PRO users $2.00 per month.
Credit value and expiry — Monthly $0.10 is not an evaluation budget. ZeroGPU is Gradio demo time, not batch jobs. Community grants last as long as the Space hardware award; dollar value `UNKNOWN`.
Open-source route — Mixed. ZeroGPU is a general free tier. Community grants target “open research demo, hobbyist project, educational tool, institutional showcase.” Quote from Spaces GPU docs: “You can even request a free upgrade if you are building a cool demo for a side project!”
Time commitment — None for ZeroGPU hosting. Grant review can take days.
Time cost to apply — A few hours to ship a public Gradio Space, then minutes to click the grant control.
IP and employment terms — Public demo. No IP assignment found. Do not put private employer code in a public Space.
Applicant type required — Individual Hugging Face user. No company required.
Status — ROLLING.
Deadline — Rolling.
How to apply —

1. Create a public Gradio Space and select ZeroGPU if eligible.
2. For a hardware grant, use the Community GPU Grant control in Space hardware settings: https://huggingface.co/docs/hub/en/spaces-gpus#community-gpu-grants.
3. For routed inference, use a Hugging Face token against Inference Providers and expect $0.10/month on a free account: https://huggingface.co/docs/inference-providers/en/pricing.
   Opportunity — 12. credits/contributors/cash/research = 0/8/0/4 (was 10 in the first report). Credits stay at 0 because $0.10/month and 5 minutes/day of GPU cannot run the recall agenda. Exposure to model users is the only real yield.
   Confidence — 55 MODERATE for ZeroGPU hosting of two Spaces. LOW for a dedicated-GPU grant.
   Fit verdict — WEAK for compute. PLAUSIBLE for a public demo Space.
   Pitch angle — Ship a small public demo of bounded recall. Do not run the 48-run studies here.
   Evidence —
   https://huggingface.co/docs/hub/en/spaces-zerogpu
   https://huggingface.co/docs/hub/en/spaces-gpus
   https://huggingface.co/docs/inference-providers/en/pricing

### Cursor Hobby plan

Funder — Anysphere (Cursor).
Track — Cursor Hobby free plan.
Support type — AI-CREDITS.
Award — Hobby is $0, “No credit card required,” “Limited Agent requests,” access to Composer. Pro is $20/month with extended Agent limits and frontier models. No open-source maintainer grant is listed on the pricing page opened in this run.
Credit value and expiry — Standing free plan. Numeric Hobby quotas are not published on the pricing page. Not enough to treat as an eval grant.
Open-source route — General free tier. No OSS programme found. Quote: “Hobby Free. Includes: No credit card required. Limited Agent requests.”
Time commitment — None.
Time cost to apply — Zero.
IP and employment terms — Privacy mode can be enabled so “code data is not used for training by us or our model providers.” Default data use is on the Security page, not fully opened here. Check the employment agreement. Cursor subscriptions “are only sold directly through cursor.com.”
Applicant type required — Individual.
Status — OPEN.
Deadline — None.
How to apply —

1. Download Cursor from https://cursor.com/pricing and use Hobby.
2. Do not plan the recall matrix on unpublished Hobby caps.
   Opportunity — 10. credits/contributors/cash/research = 10/0/0/0. Not in the first report as a credit programme. Credits are a limited agent cap, scored in the lowest band only because some agent runs are possible. Research is 0: this is an editor seat, not paid evaluation.
   Confidence — 85 VERY HIGH for access. VERY LOW that Hobby can finish the five studies.
   Fit verdict — PLAUSIBLE as Tony’s daily editor. WEAK as comped eval spend. No Cursor OSS credit programme was found.
   Pitch angle — No pitch. Use Hobby for maintenance. Buy Pro or use other APIs for the studies.
   Evidence —
   https://cursor.com/pricing

### Cerebras Inference Free Trial

Funder — Cerebras.
Track — Cerebras Inference Free Trial.
Support type — AI-CREDITS.
Award — “Get started with $5 in free credits after making an account.” Official billing docs: new accounts receive $5 after adding a verified payment method. Credits expire 30 days after grant and work across all public models. No recurring free tier. “Cerebras doesn't currently offer a no-cost tier that renews automatically” is the wording on the rate-limits FAQ opened via the billing page trail.
Credit value and expiry — $5, 30 days. Too small and too short for a part-time 48-run study.
Open-source route — General free trial, not an OSS programme. The first run recorded a Cerebras YC Startup Deal limited to Y Combinator startups; that is screened out again below.
Time commitment — None.
Time cost to apply — Minutes, plus a payment method that is not charged unless more credits are bought.
IP and employment terms — Standard Cerebras console terms. Payment method on file. Check the employment agreement before putting a personal card on a cloud console.
Applicant type required — Individual with a payment method.
Status — OPEN.
Deadline — 30 days from grant.
How to apply —

1. Create an account at the Cerebras Cloud Console linked from https://www.cerebras.ai/pricing.
2. Add a verified payment method.
3. Spend the $5 inside 30 days if a tiny open-weight probe is useful.
   Opportunity — 6. credits/contributors/cash/research = 0/0/0/6. $5 is below the first credits band. Research is a token score for a one-evening probe only.
   Confidence — 80 VERY HIGH for receiving $5. 0 as a programme that funds the agenda.
   Fit verdict — WEAK. A trial, not a grant.
   Pitch angle — Skip unless a single Cerebras model needs a smoke test.
   Evidence —
   https://www.cerebras.ai/pricing
   https://inference-docs.cerebras.ai/console/account-billing

## Model coverage table

| Program                          | Families covered                                                                                | Named models                                                                                        | Value                                                      | Expiry                                                              | Admits an individual OSS maintainer                                                             | Source URL                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Gemini API free + Gemini CLI     | Gemini only                                                                                     | Gemini 3.7 / 3.6 / 3.5 Flash and Flash-Lite on the free price rows; CLI says Gemini 3 flash/pro mix | Free of charge; CLI 60 RPM and 1,000 RPD                   | Standing; RPD resets midnight PT                                    | Yes. Personal Google account.                                                                   | https://ai.google.dev/gemini-api/docs/pricing ; https://github.com/google-gemini/gemini-cli |
| Groq Cloud Free                  | Open-weight (OpenAI GPT-OSS, Qwen, Groq Compound)                                               | `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.6-27b`, `groq/compound`                    | $0; 30 RPM / 1,000 RPD / 8k TPM / 200k TPD on GPT-OSS 120B | Standing free plan                                                  | Yes. Self-serve account.                                                                        | https://console.groq.com/docs/rate-limits                                                   |
| OpenRouter `:free` models        | Several open and stealth families; exact catalog changes                                        | Page lists many models; `:free` suffix is the gate                                                  | $0 tokens; numeric RPM/RPD `UNVERIFIED` in rendered HTML   | Standing                                                            | Yes. Individual account.                                                                        | https://openrouter.ai/docs/api/reference/limits                                             |
| OpenAI Codex for Open Source     | OpenAI only                                                                                     | ChatGPT Pro / Codex; API models `UNKNOWN` until awarded                                             | 6 months Pro; API dollar amount `UNKNOWN`                  | 6 months Pro; API expiry `UNKNOWN`                                  | Yes, if accepted as a core maintainer of a widely used public project.                          | https://developers.openai.com/community/codex-for-oss                                       |
| Claude for Open Source           | Anthropic / Claude only                                                                         | Claude Max 20x, including Claude Code on the Max/Pro consumer path                                  | 6 months Max 20x; Max “from $100/month”                    | 6 months from activation; link expires in 90 days                   | Yes as a natural person, if a published OSS bar or the Ecosystem Impact Track is met.           | https://www.anthropic.com/claude-for-oss-terms                                              |
| AWS Activate Founders            | Several families via Bedrock if the Activate-on-Bedrock blog still holds                        | OpenAI, Anthropic, Meta, Mistral named on the AWS Bedrock credits blog in the first report          | $1,000, maybe $5,000                                       | Usually 1–2 years (`UNVERIFIED` this run; first-report AWS article) | Startup website path, not an OSS path. Individual possible if AWS accepts a personal “startup.” | https://aws.amazon.com/startups/credits/                                                    |
| Together AI Build                | Open-weight hosts on Together                                                                   | Together catalog; not first-party Claude or GPT                                                     | Up to $15,000                                              | `UNKNOWN`                                                           | Startup selection, not an OSS route.                                                            | https://www.together.ai/startup-accelerator                                                 |
| Arcee Trinity Builders           | Trinity only                                                                                    | Trinity-Large-Thinking and Trinity family                                                           | Token grant `UNKNOWN`                                      | 90 days                                                             | Yes. Individual developer/researcher or OSS team.                                               | https://www.arcee.ai/trinity-builders-program                                               |
| Lambda Research Grant            | Open-weight on Lambda GPUs                                                                      | Whatever Tony runs on the instance                                                                  | Up to $5,000                                               | `UNKNOWN`                                                           | `UNKNOWN` for unaffiliated individuals.                                                         | https://lambda.ai/research                                                                  |
| GitHub SOSF                      | Copilot model selection `UNKNOWN`; Azure infrastructure                                         | Copilot Pro “selection of models”; Azure SKUs `UNKNOWN`                                             | $10,000 cash + $10,000 Azure + Copilot                     | Azure expiry `UNKNOWN`; Copilot monthly                             | Yes, as a current OSS maintainer in a Sponsors region, if traction and governance pass.         | https://github.com/open-source/github-secure-open-source-fund/                              |
| Hugging Face Inference Providers | Many routed open models (Together, Groq, Fireworks, Cerebras, and others on the partners table) | Partner catalog on the Inference Providers index                                                    | $0.10 / month on a free account                            | Monthly                                                             | Yes.                                                                                            | https://huggingface.co/docs/inference-providers/en/pricing                                  |
| Colab free                       | Whatever Tony loads in the notebook                                                             | User-chosen open weights                                                                            | Free fluctuating GPU/TPU                                   | Session-based, not guaranteed                                       | Yes.                                                                                            | https://research.google.com/colaboratory/faq.html                                           |
| Cerebras Free Trial              | Cerebras-hosted public models                                                                   | Catalog on Cerebras pricing; $5 covers little                                                       | $5                                                         | 30 days                                                             | Yes, with a payment method.                                                                     | https://www.cerebras.ai/pricing                                                             |
| GitHub Copilot Pro (OSS)         | “A selection of models”                                                                         | Not named on the plans page                                                                         | $10/month value if granted                                 | Monthly re-check                                                    | Yes, if GitHub classes the repo as popular.                                                     | https://docs.github.com/en/copilot/get-started/plans                                        |
| Cursor Hobby                     | Cursor / Composer; frontier models are on Pro                                                   | Not named on Hobby                                                                                  | Limited Agent requests                                     | Standing                                                            | Yes. Not an OSS grant.                                                                          | https://cursor.com/pricing                                                                  |

The smallest combination that covers a cross-family evaluation is: Gemini CLI or Gemini API free for the Gemini family; Groq Free for an open-weight family (GPT-OSS or Qwen); and one closed-family seat from Claude Max (Claude for Open Source or a paid Claude Code month) or from OpenAI Codex / ChatGPT Pro. OpenRouter `:free` models can dry-run the harness across more names before any application. Hugging Face’s $0.10/month does not replace Groq.

If those three seats were bought outright instead: Gemini 3.7 Flash is $0.75 / $3.75 per 1M tokens on the paid tier through 31 December 2026; Groq GPT-OSS 120B is $0.15 / $0.60 per 1M on the Developer plan; Claude Max starts at $100/month on the consumer price page; Copilot Pro is $10/month; Cursor Pro is $20/month. Exact cash for the five-study agenda is `UNKNOWN` until the harness records provider calls, as `00-proof-fit-brief.md` already states. A rough paid floor for a thin three-family repeat of the existing 12-run design is tens to a few hundreds of dollars at the Groq and Gemini Flash prices above, plus one paid Claude or OpenAI month if the OSS seats are refused. The full 204 isolated agent runs in the research agenda would cost more, and provider calls per run are still `UNKNOWN`.

## Screened out

- OpenRouter for Startups — full-time commitment rule. Quote: “Building an AI-native product full-time” and “pre-Series B venture scalable startups and founders building AI-native products full-time who are referred by an approved OpenRouter partner.” https://openrouter.ai/startup-program
- Modal for Startups — startup / VC route only. Quote: “Unlock thousands of free GPU credits to supercharge your startup.” Seed–Series A funding gates are on the same page’s programme copy. No OSS route found. https://modal.com/startups
- Fireworks for Startups — startup / VC route only. Quote: “Venture backed startups with >$500k in funding” and “registered company with a functional website.” No OSS route found. https://fireworks.ai/startups
- Baseten AI Startup Program — startup / VC route only. Quote: “We will only accept early stage startups. To qualify, your funding stage should be Seed to Series A.” “AI-first and VC funded startups.” No OSS route found. https://www.baseten.co/startup-program/
- Runpod Startup Program — startup route; Growth Tier is a $50,000 deposit, not a grant. Quote: “Selective program for venture-backed AI startups scaling production workloads.” Starter is $1,000 for “earlier-stage startups.” Academic research is a separate university/lab path. https://www.runpod.io/startup-program
- Runpod for Academic Research — academic / lab route, not an unaffiliated maintainer route. The page is written for “universities, academic departments, and research labs” and “educators and affiliated researchers.” https://www.runpod.io/academic-research
- Nebius for Startups — VC-partner route only. Quote: “Credit offerings are currently available exclusively through our venture capital partners.” https://nebius.com/startups
- Replicate startups URL — https://replicate.com/startups returned HTTP 404. No official OSS or individual route was opened. Second-hand startup-credit write-ups are not used as facts.
- Groq for Startups as a published credit programme — https://groq.com/startups returned HTTP 404. https://home.cloud.groq.io/apply-to-groq-for-startups did not show a credit amount. Screen the named startup coupon until Groq publishes terms. Use the Free plan instead.
- Cerebras YC Startup Deal — Y Combinator startups only, as recorded in the first report at https://www.cerebras.ai/yc-startup-deal. Not re-fetched as a live OSS route; YC membership is a venture-scale founding path this profile rejects.
- Together AI Research Credits — student-only. Quote: “This invite-only research credits program offers small grants to students conducting research projects outside of formal classes.” https://www.together.ai/research-credits-program-request
- OpenAI Researcher Access Program — affiliated academic or research-organisation researchers. Official FAQ and form returned a JavaScript / 403 wall in this run. The first report’s published gate still stands: not an unaffiliated maintainer. https://openai.com/form/researcher-access-program/ and https://help.openai.com/en/articles/10139500-researcher-access-program-faq
- Anthropic External Researcher Access — alignment / AI-safety topic gate, $1,000 Claude credits. Wrong research topic for Proof. https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program (fetch timed out this run; first-report capture plus the official URL). Treat current dollar figure as `UNVERIFIED` until the article loads.
- Anthropic AI for Science — academic or nonprofit researchers at a research institution. Up to $20,000 Claude API credits. https://support.claude.com/en/articles/11199177-anthropic-s-ai-for-science-program (fetch timed out this run; first-report capture). Ineligible without a host institution.
- Gemini Academic Program — “Only individuals (faculty members, researchers or equivalent) affiliated with a valid academic institution, or academic research organization can apply.” https://ai.google.dev/gemini-api/docs/gemini-for-research
- Claude for Startups — institutional equity funding for credits, as recorded in the first report. https://claude.com/programs/startups
- Google for Startups Cloud Scale / AI-first — VC equity funding. https://cloud.google.com/startup/ai
- Microsoft for Startups — privately held for-profit company. https://startups.microsoft.com
- AWS Activate Portfolio — Activate Provider Org ID. https://aws.amazon.com/startups/credits/
- Meta Open Innovation AI Research Community — “open to professors at accredited universities.” https://developer.meta.com/ai/open-innovation-ai-research-community/
- Meta LLM Evaluation Research Grant — university faculty, 2024 deadline, sponsored-research agreement. https://developer.meta.com/ai/llm-evaluation-research-grant/
- Meta Llama Startup Program — incorporated US startups with a developer on staff and under $10M raised, on the 2024 announcement page. Venture-scale founding. https://ai.meta.com/blog/llama-startup-program
- NVIDIA Inception — incorporated startup/company, as corrected in the first report. Door to partner credits, not an OSS maintainer route. https://www.nvidia.com/en-us/startups/
- Vercel AI Accelerator — six-week startup cohort, last call passed, San Francisco demo day. Relocation / cohort rule and venture-scale founding. https://vercel.com/ai-accelerator
- Cursor students / campus credits — student track, not this applicant. No Cursor OSS credit programme on https://cursor.com/pricing
- Microsoft FOSS Contributor Fund, Google Open Source Peer Bonus, and similar employee-only nomination funds — only an employee of that company can start them. Tony’s employer is `UNKNOWN`. Do not apply to a named company’s employee fund unless Tony works there. Ask Tony’s employer whether it runs an open-source fund, a dependency-sponsorship programme, or an employee award.

## Leads not yet checked

- OpenAI Codex form field list and any live dollar cap inside the submitted form (https://openai.com/form/codex-for-oss/ timed out on one fetch; the developers page loaded).
- ChatGPT Pro retail price (https://openai.com/chatgpt/pricing was a JavaScript wall).
- OpenRouter free-tier numeric table in a real browser, plus the current `:free` model list.
- Groq for Startups if a new official URL appears.
- Replicate official credit page under a URL other than `/startups`.
- Modal for Academics dollar cap (FAQ did not expand).
- Fireworks and Baseten: no second, hidden OSS form was searched beyond the startup pages.
- Hugging Face Jobs or Inference Endpoints grants beyond the $0.10 monthly credit.
- Continue.dev, Cline, OpenCode, Windsurf, Amazon Q, and Sourcegraph maintainer offers (Codex page names some tools as preferred editors; their own credit programmes were not opened).
- GitHub SOSF raw application form URL and whether Session 5 still accepts submissions on 23 August 2026 after business hours.
- AWS Activate Founders live page reconfirmation (this run relied on the official URL plus the first report’s capture).
- Anthropic Console API research or nonprofit paths other than AI for Science and External Researcher Access.
- xAI, DeepSeek, Moonshot, Qwen Cloud, and Cohere individual or OSS credit pages.
- Employer-side routes at Tony’s employer: open-source fund, dependency sponsorship, employee award, contribution policy, and IP assignment in the employment contract. Those questions are for Tony. This run did not name or guess the employer.
- Whether Azure SOSF credits can buy Microsoft Foundry third-party model tokens.

## Coverage note

Pages opened or attempted this run: about 55 official programme, docs, FAQ, pricing, or form URLs across OpenAI (Codex pages and terms; researcher and ChatGPT pricing walls), Anthropic (Claude for OSS marketing and terms, consumer pricing, science/researcher URLs), Google (Gemini pricing and rate limits, Gemini CLI README, Gemini for Research, Colab FAQ, TRC about and FAQ), GitHub (SOSF programme page and Session 4 blog, Copilot plans and OSS-maintainer docs), Groq (rate limits, models, console, startups 404), Together (accelerator and research credits), Arcee Trinity, Lambda Research, Mistral Ambassadors, Hugging Face (ZeroGPU, Spaces GPUs, Inference Providers index and pricing), OpenRouter (startup programme, limits, FAQ, models), Cerebras (pricing and billing), Modal, Fireworks, Baseten, Runpod (startup and academic), Nebius, Replicate (404), Cursor pricing, Meta developer research pages, and AWS Activate’s published URL. Kept in the ranked list: 15 tracks. Screened out: 26. Left unchecked: the leads above.

Coverage is thin on official dollar caps for Codex API credits, Claude Max 20x’s exact monthly price above the “from $100” floor, OpenRouter’s rendered free-tier numbers, Groq’s vanished startups form, and every inference host that publishes only a startup page (Modal, Fireworks, Baseten, Replicate, Nebius). No Google, Microsoft, Meta, or Mistral programme named for open-source maintainers and paying multi-family API credits was found, other than GitHub Copilot Pro for “popular” repos and Mistral’s unpublished ambassador credits. The live, no-application plan for this applicant is Gemini free plus Groq free, then one closed-family seat from Claude for Open Source, Codex for Open Source, or a paid month, with AWS Activate Founders as the only self-serve multi-family coupon if Tony can look like a small startup.
