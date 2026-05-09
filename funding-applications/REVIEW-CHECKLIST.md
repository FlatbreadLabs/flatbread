# Pre-submission review — Flatbread funding drafts

Unified checklist for `openai-open-source-fund.md` and `claude-for-oss-brief.md` before submission.

---

## 1. Acceptance-likelihood self-assessment

Scores are **1–5** (1 = weak, 5 = strong). Interpret as an internal sanity check, not a prediction.

### OpenAI Open Source Fund (`openai-open-source-fund.md`)

| Dimension | Score | Notes |
|-----------|-------|--------|
| Clarity | 4 | Structure mirrors the form; thesis → use of credits → budget → roadmap → public commitment reads linearly. Some density in the opening “brief description” may fatigue a skimmer. |
| Technical specificity | 5 | Named packages, paths (`packages/proof`), CI file, concrete credit line items, quarterly milestones with verifiable deliverables. |
| Funder-fit | 5 | Explicit Codex CLI / PR / release automation / dog-food `@flatbread/proof` loop matches what the program is positioned to amplify. |
| Evidence of traction | 3–4 | Strong *technical* artifact (`@flatbread/proof`) and internal process proof; weaker on classic signals (stars, downloads, adopters named). Co-maintainer caveat is flagged honestly — good ethics, slight risk if read as solo bus factor. |
| Maintainer credibility | 4 | Clear role attribution; npm/package ownership cited; avoids anonymous “we.” LinkedIn/GitHub placeholders still sap completeness until filled. |
| Ask rationale | 5 | Credits map to enumerated workflows; budget table totals the published cap; optional cash fork is disciplined. |

**Overall verdict:** The OpenAI draft is **submission-ready in substance** once identity/org fields are verified. Its main vulnerability is reliance on narrative traction (memos + shipped proof) rather than community scale; compensating angles — Codex-shaped automation and a credible 12‑month throughput plan — are well aligned with the likely reviewer mental model.

### Claude for Open Source (`claude-for-oss-brief.md`)

| Dimension | Score | Notes |
|-----------|-------|--------|
| Clarity | 4 | Sales-brief shape is appropriate; eligibility table helps a human reviewer triage quickly. Token math is dense — may need a one-line “bottom line” up front. |
| Technical specificity | 4–5 | Proof package, MCP/eval harness, provider plan, and fixture-scale assumptions are concrete. Roadmap item 4 vs OpenAI’s `flatbread-mcp` naming should be reconciled (see §4). |
| Funder-fit | 4–5 | MCP + Claude Code + Skills + “neutral plumbing” tracks Anthropic messaging; Impact track framing hedges star/download gaps responsibly. |
| Evidence of traction | 3–4 | Same profile as OpenAI: strong engineering evidence, lighter on ecosystem metrics. “Recent activity” leans on audit dating — ensure repo activity actually supports that claim at submit time. |
| Maintainer credibility | 4 | Consistent with OpenAI draft; “sole maintainer” is explicit — double-edged for funders sensitive to sustainability. |
| Ask rationale | 3–4 | Max seat ask is clear; **API credits** are positioned as valuable but flagged UNVERIFIED — if credits are out of scope, the brief should still stand on the seat value alone (tighten that branch). |

**Overall verdict:** The Claude brief is **strong on fit and technical story** but **more sensitive to program mechanics** (single grant shape, form fields, eligibility wording). Tighten the ask when API credits are not in play, resolve the hard timeline sentence against live program terms, and align MCP package naming with the OpenAI draft to avoid “two different products” confusion.

---

## 2. Open UNVERIFIED items the user MUST resolve before submission

Consolidated from both files and cross-cutting checks:

- **LinkedIn:** Canonical URL for Tony Ketcham (OpenAI form).
- **Primary GitHub handle:** Confirm the account with **write/owner** access on `FlatbreadLabs` (OpenAI lists `toeknee-FlatbreadLabs`; Claude references `package.json` — ensure they match reality and the form).
- **Email:** Confirm `ketcham.dev@gmail.com` is the address you want on file vs any GitHub noreply preference (OpenAI note).
- **OpenAI Org ID:** Whether the live form includes this field; paste if required (OpenAI).
- **Cash component:** Whether OpenAI’s live form offers cash in addition to credits; if yes, whether to add the **$15,000** maintainer-time line (OpenAI).
- **Seat redistribution:** Whether ChatGPT Pro / Codex seats may be offered to **non-maintainer** contributors before committing the “top 2 contributors” line (OpenAI budget).
- **Co-maintainers:** Final honest list (sole vs multiple) for OpenAI; aligns with Claude’s “1 seat, up to 2 if co-maintainer lands.”
- **Claude program shape:** Confirm whether the offer is **only** a 6‑month Max seat or also **separate API credits** (Claude).
- **Claude eligibility language:** Official rules on OSI license, commercial use, and star/download thresholds — playbook items were inferred; verify against current Anthropic copy (Claude).
- **Claude intake form fields:** Map the brief’s “Form responses” section to the **actual** contact-sales form (Claude).
- **Claude timeline cap:** The brief ties an end boundary to a specific calendar date — verify against the live offer’s grant window and remove or rephrase if wrong (Claude).
- **Budget arithmetic / cap rules:** Confirm OpenAI allows the **stated split** (e.g., contributor sponsorship line mixing credits + seats) under program terms.
- **Repo activity at submit time:** Both drafts imply recent releases/CI/commits — sanity-check GitHub/npm so claims stay true on the submission clock.

---

## 3. Suggested edits to strengthen each draft

### `openai-open-source-fund.md`

- **`Brief description of the project` (≈L44–50):** Lead with **one sentence** on problem + Effort Graph, then the README verbatim quote. Reduces burying the pivot below stylistic flourish.
- **`Which open source project` (≈L42):** Optionally add **one npm download or release cadence fact** if you have a truthful number — starves the “traction” objection without fluff.
- **`How would you use API credits` (≈L63–71):** Add a **single closing sentence** estimating relative credit burn (e.g., PR automation vs eval harness vs proof DAGs) so reviewers see prioritization under a $25k cap.
- **`Contributor sponsorship` row (budget table ≈L102):** Until seat redistribution is confirmed, soften to **“if permitted”** in the visible submission text or move seats to an internal appendix — the reviewer note alone may not propagate to the pasted form fields.
- **`Anything else` (≈L73–80):** The “Codex adapter is straightforward” line could read as hand-wavy — add **half a sentence** on interface surface (same DAG graph, swap provider/SDK) if accurate.
- **§5 citation (≈L150):** Replace or supplement `§5` with a **heading string** (`README` / doc title) so copy-paste into a plain-text form doesn’t lose meaning.

### `claude-for-oss-brief.md`

- **`What we'd use Claude for` (≈L37–40):** Open with **“Primary ask: Claude Max seat for maintainer loops; secondary (if eligible): API tokens for nightly evals.”** Then the token math — improves scanability if credits are marginal.
- **Token projection paragraph:** Flag **confidence** (low/medium) or peg one number as **upper bound** to avoid seeming over-precise without data.
- **Roadmap items 4 vs 9 (≈L59–65):** Deduplicate overlap between “MCP server” and “docs + Skills examples” — one bullet can own integration docs.
- **`Form responses` / Timeline (≈L82–83):** Replace the **fixed end date** with “within the approved grant window from start” unless the program publishes that exact boundary; mirror whatever the live FAQ says.
- **`packages/flatbread` (≈L35, L59):** If the MCP server package name is **`flatbread-mcp`** (per OpenAI draft), align the path **or** add “(package name TBD)” once — reviewers should not see conflicting locations.
- **Eligibility table row “sole author/maintainer”:** If contributors have merge rights, rephrase to **“primary maintainer / release owner”** to stay defensible against `git shortlog`.

---

## 4. Cross-draft consistency check

| Element | OpenAI draft | Claude draft | Reconciles? |
|---------|---------------|--------------|-------------|
| Elevator pitch / README quote | Verbatim README line embedded in narrative | Same quote | **Yes** |
| License | MIT (frontmatter + body) | MIT | **Yes** |
| Maintainer | Tony Ketcham, primary/sole framing | Tony Ketcham | **Yes** (OpenAI leaves room for co-maintainers — ensure both drafts match final reality) |
| Repo URL | `https://github.com/FlatbreadLabs/flatbread` | Same | **Yes** |
| `@flatbread/proof` thesis | Cursor-SDK DAG; Codex adapter on roadmap | Cursor-SDK DAG; Claude provider on roadmap | **Yes** |
| MCP server | `flatbread-mcp`, Q3 MVP | MCP in **`packages/flatbread`** | **Drift** — align naming/path |
| Roadmap pillars | Typed config, ID norm, validation, watch, MCP, Effort Graph, evals, docs, v1.0 | Same themes + generated TS adapter, eval dashboard explicit | **Mostly aligned** — Claude adds items OpenAI folds into Q4; optional one-line cross-reference in OpenAI to “generated TS adapter” |
| Funding ask | $25k API credits + bundled seats (+ optional cash) | ~$1.2k equivalent Max seat ± API credits | **Intentionally different programs** — no conflict; verify Claude brief does not implicitly promise API funding |
| Sole maintainer vs community | Slack + contributors; wary of padded co-maintainer list | “1 seat; up to 2 if co-maintainer” | **Minor tension** — pick one staffing story for external readers |
| Public outputs | Discussions, Slack, quarterly blog, `funding-research/` evals | Case studies, MCP guide for Claude Code, eval dashboard, talk | **Aligned in spirit**; different platforms — acceptable |
| Sensitive identity fields | Email + GitHub + LinkedIn in draft | Maintainer handle deferred to `package.json` | **Drift risk** — ensure Claude intake gets the **same** GitHub identity OpenAI submits |

---

## 5. Recommended submission order and timing

**Recommend submitting the OpenAI application first.**

**Reasoning (no calendar dates):** The OpenAI draft is **longer and form-anchored**, with several **blocking field verifications** (LinkedIn, org handle, optional org ID, seat redistribution). Getting those verified once tends to stabilize the **canonical maintainer/GitHub/contact story** that the Claude intake will likely re-use. Strategically, OpenAI emphasizes **Codex-native automation** tied to `@flatbread/proof`; Anthropic emphasizes **Claude Max + MCP neutrality**. Sending OpenAI after you freeze those technical claims reduces the odds of rewriting the Claude brief twice. If program windows or deadlines diverge, **prioritize whichever portal has the tighter cutoff** once you know actual terms — otherwise default to OpenAI first, Claude second after a quick **cross-draft pass** on MCP naming, maintainer/consistency wording, and removal of any date-bound language not confirmed by Anthropic.

---

*Checklist generated for internal review — update both drafts before pasting into live forms.*
