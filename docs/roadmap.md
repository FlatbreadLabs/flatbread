# Flatbread roadmap update from validation work

This roadmap reflects the PMF audit, implementation work, and experiment
reports completed through the current project-board sequence. All verdicts below
rest primarily on internal evidence; external validation gates promotion past
**Iterate** on user-facing claims.

## Evidence inputs

- [PMF decision rubric](./pmf-decision-rubric.md)
- [PMF audit](../flatbread-flow-pmf-audit.md)
- [Agent artifact opportunity](../flatbread-agent-artifact-opportunity.md)
- [Positioning](./positioning.md)
- [Relational starter benchmark](./experiments/issue-162-relational-starter-benchmark.md)
- [TypeScript safety test](./experiments/issue-163-typescript-safety-test.md)
- [Export trust experiment](./experiments/issue-164-export-trust-experiment.md)
- [Effort Graph wire-up](./experiments/issue-167-effort-graph-layout-mapping.md)
- [Adversarial Effort Graph schema test](./experiments/issue-168-adversarial-multi-layout-schema.md)
- [Agent artifact retrieval benchmark](./experiments/issue-169-agent-artifact-retrieval-benchmark.md)

## Keep / kill / iterate decisions

| Initiative                          | Decision                             | Rationale                                                                                                                                                    | Next action                                                                                                              |
| ----------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Relation-first content layer        | **Keep**                             | Starter path reaches install/build/codegen/demo query under 10 minutes in a fresh worktree; docs now lead with files → model → typed reads.                  | Polish example content and resolve Next.js ESLint warning.                                                               |
| ID/ref/cardinality validation       | **Keep**                             | Normalized IDs, duplicate diagnostics, missing-ref validation, cardinality docs/tests, and snapshots now make integrity first-class.                         | Extract reusable validation API and add current/live server integration tests.                                           |
| Generated TypeScript model/read API | **Iterate**                          | Generated model helpers and read API prove typed consumption is plausible, but selection typing and nullability need hardening before stable positioning.    | Build typed selection/projection API and refine relation helper docs.                                                    |
| GraphQL interface                   | **Keep, repositioned**               | GraphQL remains useful as schema/introspection/client interface, but docs now frame it as one read surface over the model.                                   | Add schema/SDL export command or documented introspection artifact.                                                      |
| Local dev loop/watch                | **Iterate**                          | Current codegen watch is useful, but `flatbread start` still needs restart for live content/schema changes.                                                  | Implement `flatbread start --watch` after design/test seams are pinned.                                                  |
| JSON/CSV portability exports        | **Iterate**                          | Core APIs validate and export stable JSON/CSV views; trust story improves, but CLI and non-developer workflow are not complete.                              | Add `flatbread export json/csv` CLI and fixture outputs.                                                                 |
| Agent artifact / Effort Graph       | **Iterate — strong candidate wedge** | #167/#168 show schema+mapping is viable; #169 shows large context reduction for blocking-decision retrieval. Evidence is promising but still fixture-driven. | Build MCP query for blocking decisions and run a multi-session real-effort benchmark before making it the primary wedge. |
| Append/deposit write API            | **Deferred**                         | Effort Graph may need append-oriented writes, but write scope is not validated enough to broaden beyond read/export surfaces.                                | Revisit only if Effort Graph moves toward primary wedge.                                                                 |
| Hosted CMS / authoring UI           | **Kill for now**                     | No validation required a hosted dashboard; it conflicts with the ownership/local-first wedge.                                                                | Do not schedule until core filesystem workflow is excellent.                                                             |
| General database replacement        | **Kill for now**                     | Validation work strengthens content integrity but not transactions, auth, multi-writer, or operational DB semantics.                                         | Keep non-goal language prominent.                                                                                        |

## Updated priority order

1. **Ship validation + type-safety foundation** — stabilize IDs, refs,
   cardinality, snapshots, and generated model helpers.
2. **Make the canonical example excellent** — keep posts/authors/tags as the
   first-success path; resolve example lint noise; ensure docs and generated
   artifacts never drift.
3. **Add export CLI** — turn JSON/CSV APIs into copy-pasteable commands for the
   ownership story.
4. **Implement unified watch loop** — move from documented restart boundaries to
   `flatbread start --watch` with tests; this is also a precondition for
   promoting Effort Graph beyond secondary vertical because agent artifact
   folders change continuously.
5. **Prototype MCP / agent query surface** — start with blocking decisions by
   effort ID and reuse the Effort Graph fixture.
6. **Run external validation** — repeat starter, type-safety, export-trust, and
   agent retrieval experiments with humans or real multi-session efforts.

## Agent artifact opportunity status

**Decision:** keep Effort Graph as a **secondary vertical with a path to primary
wedge**.

Reasoning:

- The opportunity aligns with core Flatbread primitives instead of inventing a
  separate product.
- The adversarial schema test found fragmentation in mapping profiles, not in
  the core nouns.
- Filtered retrieval for blocking decisions was dramatically smaller than
  context stuffing in the representative benchmark.
- Evidence is not yet external or multi-session enough to displace the broader
  TypeScript relational content wedge.

Gate to primary wedge:

- MCP blocking-decision query works against a real multi-session effort.
- A token-based benchmark (not just bytes) confirms retrieval leverage.
- MCP and generated-TypeScript read paths reach parity with the GraphQL filter
  shape on the #167 fixture.
- At least one external user/team records a saved rediscovery pass on a real
  multi-session effort relative to its current vault/handoff/search workflow.

## Follow-up issue drafts

The current automation cannot create or close GitHub issues directly. These
drafts should be turned into issues/project notes by a maintainer:

1. **Add export CLI for JSON/CSV snapshots**
   - `flatbread export json --collections Post,Author --out snapshots/`
   - `flatbread export csv --collections Post --out snapshots/`
2. **Implement `flatbread start --watch`**
   - schema/content reload, codegen refresh, and failure semantics from
     `docs/local-dev-loop.md`.
3. **Add MCP Effort Graph query**
   - `blockingDecisions(effortId)` returning decision + plan + session context.
4. **Run network-cold starter benchmark**
   - fresh clone/container with cold pnpm store.
5. **Run external export trust interviews**
   - at least two TypeScript/static-site developers.
6. **Typed selection builder for generated read API**
   - remove or isolate the string-selection escape hatch.
7. **Schema/introspection export artifact**
   - check in or command-print GraphQL SDL/introspection for exit workflows.
8. **Harness mapping profiles**
   - ship Claude-oriented, Cursor-oriented, and GCC-style Effort Graph mapping
     profiles as configuration rather than separate schemas.
9. **External validation interview set**
   - starter, export trust, TypeScript safety, and Effort Graph retrieval runs
     with non-maintainer users.

## Maintainer action checklist

1. Create follow-up issues/project notes from the drafts above.
2. Close or split project-board issues according to the traceability table
   below.
3. Confirm whether any issue should remain open because acceptance requires
   external validation this branch could only draft.
4. Update project-board priority lanes to match the "Updated priority order"
   section.

## Closed / completed project-board issues in this stack

| Issue | Evidence artifact / commit area                   | Proposed status                                                 |
| ----- | ------------------------------------------------- | --------------------------------------------------------------- |
| #142  | `docs/positioning.md`                             | Close                                                           |
| #143  | `docs/glossary.md`                                | Close                                                           |
| #144  | `docs/pmf-decision-rubric.md`                     | Close                                                           |
| #145  | Root quickstart in `packages/flatbread/README.md` | Close                                                           |
| #146  | README/command guidance updates                   | Close                                                           |
| #147  | Relation-first traceability docs                  | Close                                                           |
| #148  | ID normalization helpers/tests                    | Close                                                           |
| #149  | Missing-reference validation/tests                | Close                                                           |
| #150  | Duplicate-ID diagnostics/tests                    | Close                                                           |
| #151  | Cardinality docs/tests                            | Close                                                           |
| #152  | Validation snapshot fixtures                      | Close                                                           |
| #153  | Generated content-model types                     | Close                                                           |
| #154  | Prototype generated TypeScript read API           | Close as prototype; iterate follow-ups                          |
| #155  | Read-interface docs                               | Close                                                           |
| #156  | Narrowed core type surfaces                       | Close; iterate follow-ups                                       |
| #157  | `docs/local-dev-loop.md` design                   | Close design slice; implementation remains follow-up            |
| #158  | Edit/query demo docs/scripts                      | Close                                                           |
| #159  | JSON export API/docs/tests                        | Close API slice; CLI remains follow-up                          |
| #160  | CSV export API/docs/tests                         | Close API slice; CLI remains follow-up                          |
| #161  | `docs/data-ownership.md`                          | Close                                                           |
| #162  | Starter benchmark report                          | Close; network-cold benchmark remains follow-up                 |
| #163  | TypeScript safety report                          | Close; external tests remain follow-up                          |
| #164  | Export trust report                               | Close product self-review; external interviews remain follow-up |
| #165  | This roadmap                                      | Close after maintainer review                                   |
| #166  | Already merged separately                         | Excluded                                                        |
| #167  | Effort Graph wire-up report/fixtures              | Close                                                           |
| #168  | Adversarial schema report/fixtures                | Close                                                           |
| #169  | Artifact retrieval benchmark                      | Close; token/multi-session benchmark remains follow-up          |

Human maintainers still need to confirm, split, or close issues in GitHub
because this environment cannot mutate issues directly.
