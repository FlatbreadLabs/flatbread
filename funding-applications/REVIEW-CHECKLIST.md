# Pre-submission review — Flatbread funding drafts

Unified checklist for `openai-open-source-fund.md` and `claude-for-oss-brief.md` before submission.

---

## Revision summary — roadmap compression + audacious bets

- **Foundation window (months 1–4):** Both drafts compress typed config, ID normalization, relation validation, watch-mode parity, and the Effort Graph MVP (Conventions preset, Append API, `flatbread-mcp`) into Phases 1–2 — no quarter-by-quarter spread; the back half is free for higher-risk deliverables.
- **Audacious bets (months 5–12):** **A** — six named workflow presets + 7th community slot; **B** — HITL ergonomics (`needsApproval`, plan-review gate, LangGraph-style pause/resume on `thread_id`); **C** — continuous evals (`fixture-promote`, PR regression replay, public Inspect-View-style dashboard, eval-driven preset retuning). OpenAI funds these primarily with API credits; Claude frames them as Max-seat + optional API workloads on `@flatbread/proof`.
- **Budget (OpenAI):** Rebalanced toward **Phase 3 presets ($8k)**, **HITL ($3.5k)**, and **evals loop ($5k)**; foundation and Effort Graph + MCP lines are deliberately smaller vs the old shape. Cash NOTE (if offered) targets presets + HITL surfaces.
- **Claude token projection:** Raised to ~**80–160M input / ~16–32M output** tokens/month (~**2–3×** prior estimate), with arithmetic tied to continuous preset DAGs + nightly fixture replay — signals continuous harness cost, not ad-hoc IDE use.
- **Explicit narrative wedge:** Both drafts now name **use-case coverage**, **community adoption**, and **workflow capture** as the public payoff; OpenAI anchors **Codex** as the harness bet; Claude keeps **MCP neutrality + Claude Code / HITL / evals** alignment.
- **Cross-draft alignment:** Same **four-phase roadmap**, identical **six preset names** (+ community slot), shared **Bet A / B / C** vocabulary — reviewers can diff programs without conflicting technical claims.

---

## 1. Acceptance-likelihood self-assessment

Scores are **1–5** (1 = weak, 5 = strong). Interpret as an internal sanity check, not a prediction.

### OpenAI Open Source Fund (`openai-open-source-fund.md`)

| Dimension | Score | Notes |
|-----------|-------|--------|
| Clarity | 3–4 | Form order is intact; audacious sections are **information-dense** (7 credit bullets + full Phase 3/4 text). Skimmers may miss the forest — an exec summary sentence at the top of “How would you use credits” would help. |
| Technical specificity | **5** | **Raised:** Six presets with sizing math (~nodes × runs × tokens), HITL and eval sub-bullets, budget lines tied to Phase 3/4. Reviewers get concrete hooks for due diligence. |
| Funder-fit | 5 | Codex PR/release automation, dog-food `@flatbread/proof`, “betting on Codex specifically” — tightly on-message for a Codex-oriented fund. |
| Evidence of traction | **2–3** | **Due-diligence cost raised:** Same strong engineering proof, but **scope vs solo maintainer** is starker (preset catalog + HITL product + public evals). Reviewers may ask “who ships this if Tony is unavailable?” — co-maintainer honesty is good; **mitigation** (phased cuts, community slot) is implied but not spelled as risk table. |
| Maintainer credibility | 4 | PMF audit + opportunity memo + shipped `proof` still land; placeholders (LinkedIn, exact handle) unchanged. |
| Ask rationale | **5** | **Raised:** Six-row budget maps dollars to Bets A/B/C; optional cash NOTE points at the audacious surface area. |

**Overall verdict:** **Stronger on specificity and ask–roadmap alignment** than the pre-revision draft; **main new risk is ambition density** (reviewer asks “is this one year for one person?”). Worth one explicit sentence on **sequencing / minimum viable catalog** if a funder pushes back.

### Claude for Open Source (`claude-for-oss-brief.md`)

| Dimension | Score | Notes |
|-----------|-------|--------|
| Clarity | 4 | Brief length is capped; four phases scan well. Token paragraph remains the heaviest block — a one-line “request: Max + (if eligible) API for harness” up front still helps. |
| Technical specificity | **5** | **Raised:** Phase 3 names all six presets; Phase 4 mirrors OpenAI’s HITL + eval machinery; public commitment adds dashboard + preset gallery. |
| Funder-fit | **4–5** | MCP, Skills, HITL (`needsApproval`, plan mode), Inspect / evals-as-research — explicit bridge to Anthropic positioning. |
| Evidence of traction | **2–3** | Same as OpenAI: engineering story > ecosystem scale. **Audacious scope** increases “solo bus factor” salience here too. |
| Maintainer credibility | 4 | Consistent sole-maintainer framing; “up to 2 seats if co-maintainer” is still a hedge funders will notice. |
| Ask rationale | **3** | Max seat is clear. **Due-diligence cost raised:** High token projection + “continuous eval harness” **depends on whether API credits are in-program**; if not, brief must not read as promising unfunded load. |

**Overall verdict:** **Fit and technical alignment improved**; **program-mechanics risk** (seat-only vs seat+API, form fields) and **numeric credibility** of token bounds are the top reviewer questions. Confirming **API eligibility for an automated eval loop** is now **higher priority** than generic “credits mentioned.”

---

## 2. Open UNVERIFIED items the user MUST resolve before submission

Consolidated from both files and cross-cutting checks. **Removed** items that the revision pass already fixed in draft text (e.g. Q1–Q4 vs four-phase misalignment, Claude’s old hard end-date wording).

- **LinkedIn:** Canonical URL for Tony Ketcham (OpenAI form).
- **Primary GitHub handle:** Confirm the account with **write/owner** access on `FlatbreadLabs` (OpenAI lists `toeknee-FlatbreadLabs`; align with Claude / `package.json` reality).
- **Email:** Confirm `ketcham.dev@gmail.com` vs GitHub noreply preference (OpenAI note).
- **OpenAI Org ID:** Whether the live form includes this field; paste if required (OpenAI).
- **Cash component:** Whether OpenAI’s live form offers cash; if yes, whether to use the **$15,000** maintainer-time line tied to Phase 3 + 4 (OpenAI).
- **Seat redistribution:** Whether ChatGPT Pro / Codex seats may go to **non-maintainers** before promising “top 2 contributors” (OpenAI budget row).
- **Co-maintainers:** Final honest list (sole vs multiple) for OpenAI; must match Claude’s “1 seat, up to 2 if co-maintainer lands.”
- **Claude program shape — Max vs API (expanded):** Confirm whether the offer is **only** a 6‑month Max seat or also **separate API credits**. **New:** Confirm whether credits (if any) may be applied to **automated / CI-driven eval replay and preset DAG harnesses**, not merely interactive IDE sessions — the revised brief predicates meaningful value on continuous usage.
- **Claude eligibility language:** Official rules on OSI license, commercial use, and star/download thresholds — verify against current Anthropic copy (Claude).
- **Claude intake form fields:** Map the brief’s “Form responses” to the **actual** contact-sales form (Claude).
- **Budget cap / mixing rules (OpenAI):** Confirm the program allows the **six-line credit split** and any **credits + seat** wording in the docs/contributors row under published terms.
- **Preset / eval sizing truth:** Sanity-check that **node counts, run counts, and fixture-count assumptions** behind credit and token arithmetic are directionally defensible if a reviewer asks for a spreadsheet (both drafts).

---

## 3. Suggested edits to strengthen each draft

_Line-level suggestions aimed at new audacious-bet content._

### `openai-open-source-fund.md`

- **`How would you use API credits` (seven bullets):** After bullet 7, add **one sentence** stating **credit priority order under stress** (e.g. presets + eval replay before discretionary doc polish) — audacious sections invite “what drops first?” questions.
- **Bullet 3 (preset catalog):** Add **half a sentence** on **acceptance criteria** per preset (“green DAG + published golden trace”) so “six shipped presets” is falsifiable without new scope.
- **Bullet 4 (HITL):** Clarify **`thread_id`** as Effort Graph field vs opaque runtime ID in one clause — reviewers bridge from LangGraph metaphor to your schema.
- **Phase 4 / public dashboard:** Note **hosting surface** (docs site subdomain vs GitHub Pages vs minimal static) so “public dashboard” isn’t assumed to be free infra.
- **`Anything else` para 2:** Optional **italic one-liner** on **minimum viable deliverable** if timeline slips — reduces “all or nothing” read without shrinking ambition.
- **`Why now / why us`:** One sentence tying **solo maintainer + 12 months** to **Phase ordering** (“B/C intentionally consume fixtures produced by Phase 3 runs”) reinforces feasibility.

### `claude-for-oss-brief.md`

- **`What we'd use Claude for` — API bullets:** Open with **“Primary: Max seat; secondary (if permitted): API for nightly preset + fixture harness.”** Then the three audacious workloads — aligns ask with continuous token story.
- **Token projection paragraph:** Prefix with **“(upper-band estimate; we will meter and publish actuals)”** or similar — specificity raised **verification burden**; flagging bounds reduces “false precision” risk.
- **`Maintainer + roadmap` Phase 4:** Add **“(fixtures from Phase 3 runs feed Phase 4 eval catalog)”** — one clause syncs parallelism claim with OpenAI’s compounding narrative.
- **`Public commitment`:** Specify **dashboard refresh cadence** (monthly vs quarterly) to match OpenAI’s “refreshed quarterly” line unless you intentionally differ.
- **`packages/flatbread` vs `flatbread-mcp`:** In the maintainer paragraph (~L35), align **implementation path** with the roadmap package name **or** add “MCP lives in workspace package `flatbread-mcp` (authoring path TBD)” — removes residual path drift vs OpenAI.

---

## 4. Cross-draft consistency check

| Element | OpenAI draft | Claude draft | Reconciles? |
|---------|---------------|--------------|-------------|
| **Roadmap shape** | Four phases; months 1–4 foundation + MVP; 5–8 presets; 9–12 HITL + evals parallel | Same structure and month bands | **Yes** |
| **Six preset names** | `schema-cutover`, `release-train`, `research-compendium`, `docs-site-refactor`, `api-version-cutover`, `design-system-token-rotation` | Same six + 7th community slot by month 8 | **Yes** |
| **Audacious vocabulary** | Bets A / B / C; `needsApproval`, plan-review gate, pause/resume, `fixture-promote`, PR replay, Inspect-View-style dashboard | Same hooks; Anthropic-facing HITL/evals justification | **Yes** |
| **Pivot framing** | **Codex** as primary harness bet; opportunity memo §5 / Posture C | **Claude Max + MCP** neutrality; Claude provider on roadmap; Codex listed as harness peer | **Intentionally complementary** — same substrate, **different sponsor hooks** |
| Elevator / README quote | Verbatim README line | Same quote | **Yes** |
| License / repo / maintainer | MIT; `FlatbreadLabs/flatbread`; Tony | Same | **Yes** |
| `@flatbread/proof` | Cursor-SDK today; Codex adapter funded | Claude provider funded; Cursor-SDK DAG | **Yes** — verify both don’t imply both adapters shipped day one |
| MCP server naming | **`flatbread-mcp`** in roadmap + budget | Roadmap:**`flatbread-mcp`**; maintainer paragraph still says authoring in **`packages/flatbread`** | **Minor drift** — clarify package path vs monorepo folder (see §3) |
| Funding ask | $25k credits + bundles (+ optional cash) | ~$1.2k Max ± API | **Programs differ** — OK; Claude must not over-promise API |
| Public outputs | Dashboard bullet + quarterly refresh language | Dashboard + preset gallery + MCP guide | **Aligned** — align **cadence** if you want symmetry |

---

## 5. Recommended submission order and timing

**Recommend submitting the OpenAI application first.**

**Reasoning:** The revisions **did not weaken** “freeze canonical facts first”: OpenAI remains the **longer form-anchored draft** with **LinkedIn / GitHub / optional Org ID / seat redistribution / cash fork** blocking items. Completing verification there **still establishes the single maintainer-contact and repo story** the Claude funnel reuses.

**Updated angle post-revision:** Both drafts now share the **same four-phase roadmap and preset catalog** — after OpenAI submits (or freezes), Claude needs only a **short pass** for **program-specific** wording (token bounds, API-for-harness eligibility) and **`packages/flatbread` vs `flatbread-mcp`** consistency.

If **Anthropic’s window is materially shorter** than OpenAI’s, **invert order** — but keep a **same-day checklist sync** so preset names and phase boundaries don’t drift.

---

*Checklist generated for internal review — update both drafts before pasting into live forms.*
