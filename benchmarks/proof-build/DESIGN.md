# Proof build benchmark: pre-registered design

Status: pre-registered on 2026-10-20, before any bed, task or paid session
exists. Changes after the pilot are allowed only where this file says so,
and each one is logged at the end with its reason.

## Question

When an agent builds a feature from a product-level request, does putting
Proof records in its context make the work better or worse? Proof can help
when the right solution keeps a rule that only Proof records. It can hurt
when Proof is out of date, or when reading it costs attention that the code
needed. We compare six arms (no Proof, Proof on request, Proof forced in,
search before planning, search plus code paths, everything pasted in) on
the same code and the same requests, and score the results with hidden
tests (build tasks) and a blind rubric (plan tasks).

Pre-registered hypotheses:

- **H1 (help).** On proof-only tasks, `skill`, `find` and `findcode` are
  all-green (acceptance, constraints and regressions all passing) more
  often than `none`. A constraint pass counts only in a session that also
  passed acceptance, since constraint tests skip when the feature is
  missing.
- **H2 (redundant).** On code-visible tasks, no arm differs from `none` on
  all-green. Proof only adds cost there.
- **H3 (harm).** On stale tasks, `brief` and `dump` do worse than `none` on
  all-green. `skill`, `find` and `findcode` do no worse than `none`.
- **H4 (burden).** On control tasks, all-green is the same in every arm.
  Context tokens, processed tokens and wall time rise with the amount of
  Proof forced in (`none` ≤ `skill` < `find` ≤ `findcode` < `brief` <
  `dump` < `dump10x`). These measures include the first turn, which holds
  the pasted brief or dump; read tokens leave it out and are reported as
  the session's own reading.

## 1. The bed app: Tessera core

Tessera is a fictional design editor. Its core is zero-dependency
TypeScript with no DOM, run by Node 22 with `--experimental-strip-types`.
It uses erasable syntax only: no enums, namespaces or parameter
properties, and imports use explicit `.ts` extensions. It has about 68
source files and roughly 6,000 lines, plus about 16 test files and 1,600
lines of `node:test` tests (`node --experimental-strip-types --test`,
which picks up `test/**/*.ts`; passing `test/` fails on Node 22.22). There
is no `package.json` dependency and no build step.

`src/editor.ts#createEditor()` is the stable facade that every hidden test
drives: `doc`, `selection`, `history`, `panel` (`view()`, `edit(label, text)`), `layers`, `keys` (`press('Mod+Shift+H')`, `focus(scope)`),
`palette` (`run(title)`, `list()`), `plugins` (`load(manifest)`), and
`files` (`save()`, `load(json)`, `viewState()`). Hidden tests use only this
facade, palette titles, field labels, shortcut keys and plugin event names,
which are the names a user or plugin author sees. Because of that, any
reasonable implementation can pass.

| Module                                                                                                                                                                                                       | Holds                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/util/` (`ids`, `emitter`, `assert`, `math`)                                                                                                                                                             | id minting, a typed emitter, small math                                                                                                                                                                                                           |
| `src/model/` (`types`, `document`, `tree`, `factory`, `geometry`, `transform`, `style`, `text`, `query`)                                                                                                     | frames, rects, ellipses, lines, text and groups; parent/child operations; bounds; rotation (stored in radians since the drift commit, see §2); fills, strokes and opacity, with groups owning their own opacity since the drift commit; text runs |
| `src/units/` (`registry`, `expr`, `parse`, `precision`, `format`)                                                                                                                                            | the unit registry (px, pt, in, %); the expression parser the panel uses (`expr.ts`, which handles arithmetic); `parse.ts`, a legacy wrapper now used only to read old string values in files; display precision per unit                          |
| `src/selection/` (`selection`, `hit`, `rules`, `bounds`)                                                                                                                                                     | the selection set; point hit-testing that skips hidden and locked nodes; selection bounds                                                                                                                                                         |
| `src/commands/` (`types`, `bus`, `history`, `coalesce`, `batch`, `registry`, `palette`) and `builtin/` (`move`, `resize`, `set-prop`, `reorder`, `group`, `delete`, `rename`, `visibility`, `lock`, `nudge`) | the command bus; undo/redo with a selection before and after each entry; gesture coalescing by gesture id; `batch()`, used only by `group`; palette titles                                                                                        |
| `src/panel/` (`properties`, `mixed`, `fields`, `commit`, `schema`) and `sections/` (`layout`, `fill`, `stroke`, `text`, `appearance`)                                                                        | the properties-panel view model: sections, field descriptors, the `Mixed` sentinel, commit per field                                                                                                                                              |
| `src/layers/` (`layers`, `tree-view`, `drag`, `rename`)                                                                                                                                                      | the layers-panel view model, listed frontmost first since the drift commit; expand and collapse; drag to reorder                                                                                                                                  |
| `src/keys/` (`keymap`, `dispatcher`, `scopes`, `chords`) and `bindings/` (`canvas`, `layers`, `panel`)                                                                                                       | the live bindings for each scope (`bindings/`, since the split); `keymap.ts` keeps `DEFAULT_KEYMAP`, a frozen legacy snapshot exported to plugins; focus scopes                                                                                   |
| `src/persist/` (`schema`, `serialize`, `deserialize`, `viewstate`) and `migrations/` (`index`, `v1-v2` … `v4-v5`)                                                                                            | an integer schema version (5); migrations applied one step at a time; a view-state sidecar (zoom, collapsed sections) kept out of the file                                                                                                        |
| `src/plugin/` (`api`, `host`, `events`, `capabilities`, `sandbox`)                                                                                                                                           | the frozen v1 plugin API (a header comment says frozen, and a surface snapshot test checks it); events that carry ids only; one capability (`export`)                                                                                             |
| `docs/plugins.md`, `AGENTS.md`                                                                                                                                                                               | the plugin reference (names only, no rationale); how to run the tests                                                                                                                                                                             |

## 2. History and the Proof graph

`scripts/gen-bed.mjs` builds the bed deterministically from
`spec/history.mjs` (ordered commits, each one a set of whole-file writes
with a fixed author, date and message) and `spec/proof.mjs` (the records,
as mutations replayed through the real `createProofWriter`, the way
`proof-recall/scripts/build-repo.mjs` does it).

- **Commits.** 84 commits, from 2026-02-02 to 2026-06-12, by four authors:
  Ines Okafor (model, persistence), Tomas Lindqvist (commands, history),
  Priya Raman (panel, units) and Mateo Alves (layers, keys, plugins). A
  fifth author, Ren Ito, joins in May and makes the drift commits. About 36
  commits implement a record and carry `Proof: <id>` trailers. The others
  are fixes, tests and chores with ordinary subjects. Commit messages never
  state a rationale that only Proof holds.
- **Variants.** `--variant proof` writes `.flatbread-proof/`,
  `flatbread.config.js` and trailers. `--variant none` writes the same
  commits with no trailers and no Proof files. The two variants have
  identical code trees, and `check.mjs` verifies that with `git ls-tree`.
  Hashes differ between variants. Citations pin hashes from the proof
  variant.
- **Efforts.** There are seven, one for each area: Document model and
  geometry; Units and precision; Command bus and history; Properties panel;
  Selection, layers and shortcuts; Persistence and migrations; Plugin API
  v1. Each has about 20 live records (around 5 Decisions with rationale
  and rejected alternatives, 2 Constraints, 3 Findings, 2 Issues mostly
  resolved, 1 or 2 Risks, 4 to 6 Citations `path#symbol@sha`, and one
  compaction) plus 3 or 4 dead ones (superseded, rejected, invalidated,
  retracted). That is about 140 live and 25 dead records. Two compactions
  are stale (`compaction.stale`).
- **Proper supersession (Proof is right).** Coalescing by a 500 ms time
  window was superseded by coalescing by gesture id, with the rationale
  that keyboard nudges and slow drags merged wrongly. The undo cap went
  from 100 to 200.
- **Drift (Proof is wrong, code is the truth).** Five late commits with no
  trailer, none of which updates Proof:

  | Key | Kind                    | Proof still says                                                                                | Code now                                                                                             |
  | --- | ----------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
  | D1  | unrecorded supersession | "Groups carry no style; opacity on a group applies to its children"                             | groups have their own `opacity`, multiplied at render; tests updated                                 |
  | D2  | unrecorded supersession | "Rotation is stored in degrees"                                                                 | radians; the panel converts                                                                          |
  | D3  | unrecorded supersession | "The layers list is back-to-front, index 0 is the backmost layer"                               | frontmost first; drag indexes reversed                                                               |
  | D4  | refactor drift          | Citations and a Decision name `keys/keymap.ts#DEFAULT_KEYMAP` as where shortcuts are registered | bindings live in `keys/bindings/*`; `DEFAULT_KEYMAP` is a frozen snapshot the dispatcher never reads |
  | D5  | refactor drift          | Citations and a Decision name `units/parse.ts#parseLength` as the parser for panel input        | the panel uses `units/expr.ts#parseExpression`; `parseLength` only reads legacy file strings         |

- **Rules planted in Proof.** Each rule is a Decision or Constraint with
  its rationale. Most also have an Issue or Finding that motivated them
  and a Citation.

  | Key | Rule                                                                                                                             | Visible in code or tests?                                                |
  | --- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
  | R1  | one user gesture is one history entry, however many nodes it touches (Issue: "undo needed 12 presses after a multi-select edit") | no (`batch()` exists, unexplained, and only `group` uses it)             |
  | R2  | command payloads are plain JSON holding node ids, never node objects (macro recording, replay)                                   | in effect (the `Json` payload type, `commands.replay`, `groupNodes`)     |
  | R3  | a shipped migration is never edited; a schema change adds a new step (Issue: files diverged after an edited step)                | no                                                                       |
  | R4  | coalesce by gesture id, never by a time window (the head of the supersession above)                                              | in effect (the gesture-id API, `KeyEvent.repeat`, a test naming it)      |
  | R5  | plugins receive frozen snapshots, never live nodes (Issue: a plugin mutated nodes and bypassed history)                          | partly (event payloads are frozen at the top level; copies, deep)        |
  | R6  | view state (expanded groups, zoom) never goes into the document file; it goes in the sidecar                                     | no (the sidecar exists, with no comment)                                 |
  | V1  | hidden and locked nodes are never hit or selected from the canvas                                                                | yes (the filter in `hit.ts` and a test)                                  |
  | V2  | stored geometry is never rounded; precision applies only to display                                                              | yes (a comment in `precision.ts` and a test that ten 0.1 nudges equal 1) |
  | V3  | undo restores the exact selection from before the change                                                                         | yes (the entry shape in `history.ts` and a test for `group`)             |
  | V4  | plugin API v1 is frozen                                                                                                          | yes (a header comment and a surface snapshot test)                       |

- **Filler at 10x** (`--scale 10`, used only by `dump10x`). Nine filler
  Efforts in look-alike areas (export, prototyping, comments, assets,
  colour management, collaboration cursors, onboarding, telemetry, fonts)
  bring the graph to about 1,500 records. They are written in the same
  voice and cite only filler paths that do not exist in the bed. They never
  state a rule about the seven real areas. The code is identical.
- **No anticipation.** Records describe past work and standing rules. An
  offline check fails the build if any record body, title or commit message
  contains a task's feature phrases (for example "corner radius" or
  "marquee"). Area words such as "properties panel" or "undo" are allowed.

## 3. Tasks (26: 18 build, 8 plan)

Prompts describe intended behaviour in a user's words. They name no file,
symbol, module, Effort or record id. They may name product surface: palette
titles, panel field labels, shortcut keys, and plugin event names as
`docs/plugins.md` lists them. Each task is
`p4/tasks/<id>/{task.json, acceptance.test.ts, constraints.test.ts, reference.patch, naive.patch}`, outside the repository. `task.json` holds
the id, kind, category, prompt, rule keys, `leakWords` (phrases that must
not appear in the none variant) and `featureWords` (phrases that must not
appear in Proof).

### Build tasks (18)

The list as it stands after the review before any run; the change log
says what changed from the pre-registered list and why.

| Id   | Category     | Request (gist; the real prompt is 3 to 6 sentences of behaviour)                                                                 | Rule   | Naive patch                                                                                      |
| ---- | ------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| B-P1 | proof-only   | Rename layers: a base name numbers the selected layers in selection order; `#` marks where the number goes; undoable             | R1     | one rename command per layer, so one Undo per layer                                              |
| B-P3 | proof-only   | A Layout grid field on frames (Off or a size), saved with the file; files of any older version open with the grid off            | R3     | a load-time default for the new field, with no new step or version                               |
| B-P5 | proof-only   | A `selectionchange` plugin event with `{ layers }` (id, name, type, x, y, width, height) in selection order                      | R5     | plain copies in a payload frozen only at the top, like the existing emitters                     |
| B-P6 | proof-only   | After reopening a document, the layers panel shows the same groups and frames expanded                                           | R6     | an `expanded` flag on group and frame nodes, saved in the document file                          |
| B-P7 | proof-only   | Copy style and Paste style: fills, strokes and opacity from one layer onto the selection; groups left alone; undoable            | R1     | one set-prop command per property and layer, so a paste takes many Undos                         |
| B-P8 | proof-only   | Old files that name colours (red, navy, …) open with hex colours, including files saved again since                              | R3     | the names mapped inside the shipped v2→v3 step, plus a load-time fix, with no new version        |
| B-V1 | code-visible | Dragging on empty canvas draws a selection box; covered groups are taken whole, partly covered ones give up their covered layers | V1     | the walk skips the hit filter, so hidden and locked layers are selected                          |
| B-V2 | code-visible | Scale selection by a typed percentage about the selection's centre, contents included                                            | V2     | stored values rounded to 2 decimals                                                              |
| B-V3 | code-visible | Ungroup (palette and Mod+Shift+G): children take the group's place and become selected; one Undo restores the groups             | V3     | the freed layers are selected before the batch, so Undo does not reselect the groups             |
| B-V4 | code-visible | Duplicate (palette and Mod+D): copies 10 px right and down, in front of the originals, selected; Undo and Redo                   | R2, V3 | the copies are selected after the batch, so Redo brings them back unselected                     |
| B-V5 | code-visible | Holding an arrow key keeps nudging; one Undo takes back the whole hold; letting go ends the step                                 | R4     | repeats within 400 ms by the editor clock merge, so a hold whose repeats pause splits            |
| B-S1 | stale (D1)   | Number keys 1–9 and 0 set the selected layers' opacity                                                                           | D1     | follows Proof: a group's value is written to the layers inside it                                |
| B-S2 | stale (D2)   | Shift while rotating snaps to 15° steps; the Rotation field shows the snapped angle                                              | D2     | follows Proof: the snap is done and stored in degrees                                            |
| B-S3 | stale (D4)   | Mod+Shift+H hides or shows the selected layers; the step is labelled Hide or Show                                                | D4     | follows Proof: the chord is also added to `DEFAULT_KEYMAP`, changing the frozen v1 table         |
| B-S4 | stale (D5)   | W and H accept in, pt, px and % of the enclosing frame, mixed with arithmetic                                                    | D5     | follows Proof: `parseLength` is extended and tried first, so a unit inside arithmetic is refused |
| B-K1 | control      | Read-only Characters and Words fields in the Text section                                                                        | none   | the fields in a new section, which breaks an existing test                                       |
| B-K2 | control      | Fill and Stroke accept `#f80`, six-digit hex with or without `#`, and `rgb(r, g, b)`; shown as upper-case `#RRGGBB`              | none   | `parseColor` itself widened, which breaks an existing test                                       |
| B-K3 | control      | Distribute horizontally or vertically with an optional typed gap                                                                 | none   | a missing gap read as 0, which breaks an existing test                                           |

### Plan tasks (8)

The agent writes `PLAN.md` and changes no code. Each plan task needs at
least two rules and is scored on a rubric (§5).

| Id   | Category     | Request (gist)                                                                           | What it hinges on                                                                                                         |
| ---- | ------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| L-P1 | proof-only   | Components: turn a frame into a reusable main; instances update; text and fill overrides | R1 (an override edit is one entry), R3 (a new migration step), R5 (plugins get snapshots of instances), V4 (no v1 fields) |
| L-P2 | proof-only   | Version history: browse and restore earlier versions of a document                       | R2 (replayable commands), R6 (view state excluded), R3                                                                    |
| L-P3 | proof-only   | Auto layout: frames stack children with gap and padding                                  | R1 (relayout belongs to the edit's entry), R4, V2                                                                         |
| L-V1 | code-visible | Snapping to other layers' edges and centres while dragging                               | V1 (no snapping to hidden or locked layers), V2 (snap shown, not rounded in storage)                                      |
| L-S1 | stale        | Masks: a shape clips the layers above it in its group                                    | D3 (frontmost-first order), D1 (groups have their own opacity); must not plan on back-to-front indexes                    |
| L-S2 | stale        | Users can rebind shortcuts in preferences                                                | D4 (rebinding goes through `bindings/` and the dispatcher; `DEFAULT_KEYMAP` stays frozen)                                 |
| L-K1 | control      | Rulers along the top and left with nicely spaced labelled ticks for the current zoom     | none                                                                                                                      |
| L-K2 | control      | A document swatches list built from the fills in use, sorted by frequency                | none                                                                                                                      |

## 4. Grading build tasks

1. **Capture.** When a session ends, the runner writes `session.diff`:
   `git add -A` and `git diff --cached HEAD`, leaving out
   `.flatbread-proof/`, `.claude/`, `AGENTS.md`, `CLAUDE.md`,
   `flatbread.config.js` and the runner's own files. It then deletes the
   clone to save disk.
2. **Apply.** The diff is applied with `git apply --3way` to a pristine
   worktree of the none variant at `p4/grade/<task>/`, which is reset and
   cleaned before each session. So every arm is graded on byte-identical
   code. If the diff does not apply, every check fails and `apply_failed`
   is recorded.
3. **Restore.** Everything the bed tracks under `test/` (test files,
   `helpers.ts`, fixtures) is restored from the pristine tree, with renames
   seen as a deletion plus an addition. An agent that edited an existing
   test is flagged `edited_existing_tests`, one that edited a helper or
   fixture `edited_test_support`, and the originals still decide
   regressions.
4. **Run.** Hidden tests are copied in only now, to `test/_hidden/`. Three
   separate `node --experimental-strip-types --test` runs follow, each with
   a 120 s timeout, with no network (`unshare -n`, where the machine allows
   it) and no proxy or session variables:
   - **Regressions:** the original suite.
   - **Acceptance:** `acceptance.test.ts`, the behaviour asked for.
   - **Constraints:** `constraints.test.ts` plus the global invariants.
     `global.test.ts` runs on every task: a document saves, loads and saves
     the same text, and plugin API v1 keeps its members and shortcut table
     (both stated in the code). `global-rules.test.ts` runs on proof-only
     and stale tasks only: every shipped migration step returns what it
     always returned, and every palette command makes at most one history
     entry per run. Those are R3 and R1, which only Proof states, so a
     control or code-visible task is never graded on them.
     The agent's own new tests run as well and are recorded
     (`agent_tests_pass`) but not scored. `tsc --noEmit`, from the repo's
     node_modules, is recorded as `typecheck` and is not scored.
5. **Report per task.** `acceptance`, `constraints`, `regressions` and
   `all_green` (all three pass), plus the failing test names.

**What each constraint test checks, by category.** Proof-only: the R rule
(for example, one `undo()` reverts every node in B-P1; a `JSON.stringify`
round-trip of the recorded command replays the same result in B-P2).
Code-visible: the V rule. Stale: the code's truth (a group's own opacity
changes and its children's opacity does not; rotation is in radians; the
frozen `DEFAULT_KEYMAP` snapshot is unchanged; `parseLength` behaves as
before on legacy strings). Control: global invariants only.

**Offline gate** (`scripts/gate.mjs`, free, run before any paid session;
it must pass for every task):

- The base tree fails acceptance and passes regressions and constraints.
- The reference patch passes all three.
- The naive patch passes acceptance and regressions, and fails only the
  test file its category predicts. For stale tasks, the naive patch is the
  "follow Proof" solution. B-S3 and B-S4 are the exception: their naive
  patch fails acceptance, which is the predicted failure there. For
  control tasks, the naive patch fails regressions only, and a second
  "Proof-flavoured" reference that also keeps every R rule must pass
  everything, which shows the constraint tests do not reward style.
- `leakWords` for each R rule appear nowhere in the none variant's code,
  tests, docs or commit messages. The phrases for each V rule do appear.
- `featureWords` appear nowhere in Proof.
- The two variants' code trees are identical.

## 5. Grading plan tasks

- **Rubric.** Each plan task has a rubric in `p4/tasks/<id>/rubric.json`:
  4 to 6 must-include points and 2 to 4 must-avoid points, each a single
  checkable claim (for example "edits to an instance override are
  undoable in one step", or "must avoid: storing expand state on nodes in
  the file"). Rubrics may name code modules, because plans will.
- **Blinding.** Before judging, `PLAN.md` is stripped of record ids (with
  or without their hash suffix, and as qualified keys such as
  `model.dec-group-nostyle`), `./flatbread proof` commands, `.flatbread-proof`
  paths, the words "Proof" (not "future-proof" or "proof of") and "project
  memory", phrases such as "the recorded decision" or "decision record",
  and "Effort" and "compaction". Each is cut out together with the
  parenthesis, bracket or lead-in ("per …", "see …", "… says:") that held
  it, and nothing marks the cut, so a Proof-arm plan cannot be told from a
  `none` plan by its markers and keeps the rest of each line. The judge is
  told to score content only, whatever its source.
- **Judge.** A fixed judge, `claude-opus-5-5` at `--effort high` with no
  tools, gets the stripped plan, the request and the rubric on stdin. It
  returns JSON with met or violated for each point and a short quote. It
  runs twice per plan. A point counts when both runs agree; when they
  disagree, the point counts as half and is listed.
- **Score.** `(includes met + avoids not violated) / (|I| + |A|)`, from 0
  to 1. Must-avoid violations are also reported on their own as plan
  constraint violations.
- **Check.** `scripts/judge.mjs --prepare-only` writes the judge inputs
  with no paid call. The rubric gate (`judge.mjs --gate`) calls the judge,
  so it runs in the pilot, before the full run. Each plan task has three
  hand-written plans: a good one, which must score at least 0.8; a trap one
  that walks into the stale or rule trap, which must score at most 0.5;
  and a plausible one, a realistic plan written from the code alone as a
  `none` session would, whose score is reported. On a proof-only task a
  plausible plan that scores as high as the good one means the rubric does
  not reward what only Proof says, and the rubric is revised before the
  full run (one of the pilot's allowed changes). Control rubrics reward
  only what the request and the code ask for, never an R rule.

## 6. Arms

The code and the request are identical in every arm. The whole task text
goes to `claude -p` on stdin, never as a file to read, because a pasted
brief or dump is larger than Linux's 128 KB limit on one argument and
larger than what `Read` returns. Every session is a fresh `claude -p` with
these settings:

- `--model` and `--effort` recorded from the init event.
- `--strict-mcp-config` with no MCP servers.
- `--setting-sources project`, so a skill in the clone loads.
- Tools Bash, Read, Write, Edit, Glob, Grep and Skill in every arm.
- No session persistence and a 1,500 s timeout.

Each session gets its own `git clone --no-hardlinks` with the remote
renamed and reflogs removed, as `prepareClone` does. The runner forks
`proof-recall/scripts/run.mjs` and keeps `--prepare-only`.
`FLATBREAD_PROOF_SERVER` is never set. Reads run locally against the
clone's own graph.

| Arm        | Clone                                                                                                                                                                                                                                                                                  | Added to the task text                                                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `none`     | none variant; `AGENTS.md` (tests, style)                                                                                                                                                                                                                                               | nothing                                                                                                                                                       |
| `skill`    | proof variant; `.claude/skills/proof/` (a copy of `.agents/skills/proof/`); `./flatbread` wrapper; `AGENTS.md` plus one line: "Project memory (decisions, constraints, findings) lives in Proof; read it with `./flatbread proof …` (see the proof skill)"; `CLAUDE.md` = `@AGENTS.md` | nothing                                                                                                                                                       |
| `brief`    | as `skill`                                                                                                                                                                                                                                                                             | the output of `proof brief <effort>` for each of the 7 Efforts, under "Project memory briefs"                                                                 |
| `find`     | as `skill`                                                                                                                                                                                                                                                                             | "Before planning, run `./flatbread proof find <words from the request> --all`, then `proof get` any hit that bears on the request."                           |
| `findcode` | as `skill`                                                                                                                                                                                                                                                                             | the `find` text plus: "Before editing a file, run `./flatbread proof find --path <file>`; before relying on a Decision, run `proof find <words> --refs all`." |
| `dump`     | as `skill`                                                                                                                                                                                                                                                                             | every live record body (all kinds, compactions included), grouped by Effort                                                                                   |
| `dump10x`  | as `skill`, on the 10x graph                                                                                                                                                                                                                                                           | as `dump`, 1,074 live records of 1,547 (the burden ceiling; an extra arm, not a primary comparison)                                                           |

`none` has no `CLAUDE.md` line about Proof, no skill, no wrapper, no
config and no node_modules link. The proof arms link node_modules (for the
CLI) through `.git/info/exclude`. Every arm's task text ends with the same
closing line: for build tasks "Implement it, add tests, and run the test
suite", and for plan tasks "Write PLAN.md in the repository root; do not
change code."

## 7. Metrics and analysis

- **Per session.** `all_green`, `acceptance`, `constraints` and
  `regressions`; the number of failing constraint tests; plan score and
  must-avoid hits. A constraint pass is counted only in a session that
  also passed acceptance (`constraints`); the plain count, which an empty
  diff passes, is kept as `constraints_raw` for reference. Cost comes from
  `proof-recall/scripts/collect.mjs`: first-turn tokens (system prompt
  plus task text, so the pasted brief or dump shows here), context tokens
  (every fresh token, first turn included), read tokens (context tokens
  without the first turn), processed tokens (context plus cache reads),
  tool calls and turns. Wall time comes from the result event. Also
  recorded: Proof reads (count of `./flatbread proof` calls), Proof writes
  (any mutation), direct reads of `.flatbread-proof/` files, searches whose
  results showed Proof files (`proof_search_exposure`: a repository-wide
  Grep reaches records in every Proof arm, `skill` included), whether the
  session opened a cited path, and `apply_failed`, `edited_existing_tests`,
  `edited_test_support`, `timed_out` and `api_error`.
- **Runs.** Build tasks run 3 times per arm, plan tasks twice; `dump10x`
  runs once.
- **Primary endpoints.** All-green on the proof-only build tasks (H1,
  6 tasks × 3 runs = 18 pairs per arm) and on the stale build tasks (H3,
  4 × 3 = 12 pairs). Each of the five arms (`skill`, `brief`, `find`,
  `findcode`, `dump`) is compared with `none` in each of the two
  categories by a two-sided exact sign test over the discordant
  (task, run) pairs; the ten p values are Holm-corrected together at
  α = 0.05 (`holm_primary` in `compare.mjs`). The stricter task-level sign
  test, which counts each task once as in `proof-recall/scripts/compare.mjs`,
  is reported beside each. `dump10x` is compared with `dump`, without
  correction.
- **Secondary.** All-green pooled over all 18 build tasks, Holm-corrected
  across the five arms (`holm_all_green`); it mixes categories whose
  predicted effects run in opposite directions, so it is read only with
  the category results beside it. Code-visible and control all-green
  (H2, H4). Plan score, compared with a paired Wilcoxon signed-rank test
  per arm against `none`. Context tokens, processed tokens and wall time
  per arm, by median and paired ratio (H4). Every result is also reported
  per category.
- **Leakage controls.** A session is flagged and excluded, together with
  its pair across arms for that task and run, when any of these holds:
  `left_folder` (a file tool, Glob, Grep or shell path outside the clone;
  heredoc bodies and inline scripts count only for absolute paths under a
  protected folder, so code written through the shell is not a leak);
  any path under `p4/` or the benchmark source appears in a tool input
  (`hidden_read` for the task, hidden and grading folders and the gate
  log); or a `none` session found Proof by another route, which should be
  impossible. The report gives flag counts by arm. Sessions that time out
  stay in and count as failures. A session that ends in an API error is
  not a task failure: transient errors are retried (up to 3 attempts),
  and a (task, run) with any other API error is dropped from every arm and
  counted per arm (`compare.mjs --errors fail` keeps them as failures, to
  read a context overflow in `dump10x` as burden).

## 8. Cost

Rates are first-party API rates for `claude-haiku-5-5`: $0.10 per million
input tokens and $0.50 per million output tokens up to a 100K-token
prompt, and $0.50 and $2.50 above it. Cache reads cost 0.1× input and cache
writes 1.25× input. For `claude-sonnet-5-5`: $2 and $10, with cache reads
at $0.20. The judge is `claude-opus-5-5` at $4 and $20.

The session sizes below are assumptions until the pilot measures them.
Past `proof-recall` runs read 0.3 to 0.6 M processed tokens per question,
and editing work costs more. The pasted text measured in prepare-only
runs is about 0.8 to 1.3 K characters for `none`, `skill`, `find` and
`findcode`, 24 K for `brief`, 75 K for `dump` and 481 K (about 120 K
tokens) for `dump10x`.

| Session shape                           | Turns | Processed tokens | Cache writes | Output | Haiku cost |
| --------------------------------------- | ----- | ---------------- | ------------ | ------ | ---------- |
| build, `none` / `skill` / `find`        | ~45   | ~2.0 M           | ~120 K       | ~20 K  | ~$0.05     |
| build, `brief` (+~25 K fixed)           | ~45   | ~3.1 M           | ~150 K       | ~20 K  | ~$0.06     |
| build, `dump` (+~50 K fixed)            | ~45   | ~4.3 M           | ~180 K       | ~20 K  | ~$0.08     |
| build, `dump10x` (+~450 K, above 100 K) | ~45   | ~22 M            | ~0.6 M       | ~20 K  | ~$1.50     |
| plan, any arm except `dump10x`          | ~25   | ~1.0 M           | ~80 K        | ~8 K   | ~$0.03     |

- **Pilot** (one build task per category: B-P1, B-S3, B-V4, B-K1; the six
  primary arms; 1 run; Haiku). 24 sessions, about $1.40 (range $1 to $4).
  The rubric gate (24 hand-written plans, judged twice by Opus, 48 calls)
  costs about $3. Two optional add-ons: `dump10x` on B-K1 (1 session,
  about $1.50, to see that a 120 K-token prompt runs at all) and L-P1 in
  the six arms (6 sessions and 12 judge calls, about $1, the only way to
  exercise PLAN.md capture and the judge on real sessions before the full
  run). The pilot must clear these gates before the full run:

  - every session finishes, with no API error left after retries;
  - the init event lists the `proof` skill in the proof arms;
  - `find` and `findcode` call `find` in at least 3 of 4 sessions;
  - no leakage flag shows a harness bug;
  - grading reproduces the gate's verdicts on the reference patches,
    re-applied as session diffs;
  - the rubric gate passes (good ≥ 0.8, trap ≤ 0.5); on a proof-only
    task, a plausible plan that scores as high as the good one marks a
    rubric to fix.

  The pilot may change prompts' wording, the timeout, the stripping rules
  and, where the rubric gate shows it, a rubric's points, and nothing
  else. Changes are logged below.

- **Full run on Haiku** (18 build tasks × 6 arms × 3 runs = 324 sessions
  and 8 plan tasks × 6 arms × 2 runs = 96, plus `dump10x` once per task,
  26). The 420 primary sessions cost about $20 to $28 and the 26 `dump10x`
  sessions about $30 to $40. Judging covers 104 plans, twice each, for
  about $14. The total is about $65 to $85. At 8 parallel jobs and about
  8 minutes per session, that is about 7.5 hours of wall time.
- **Sonnet subset** (the 8 build tasks P1, P3, P5, P7, V1, S1, S3 and K1;
  the arms `none`, `skill`, `find` and `brief`; 1 run). 32 sessions at
  about $0.90 each, for about $30. It is read only as a check on the
  direction of the Haiku result.
- **Disk.** Clones are about 5 MB each and are deleted after capture. What
  is kept for each session is `session.diff`, `PLAN.md`, the gzipped
  transcript (about 0.3 MB) and the grade JSON, roughly 160 MB for the
  full run.

## Layout

`benchmarks/proof-build/` holds:

- `spec/history.mjs` and `spec/proof.mjs`: the bed's commits and records.
- `spec/filler.mjs`: the 10x filler.
- `tasks/<id>/`: each task's `task.json`, and for plan tasks `rubric.json`
  and `plans/`.
- `scripts/` (`gen-bed.mjs`, `check-bed.mjs`, `gate.mjs`, `run.mjs`,
  `grade.mjs`, `judge.mjs`, `compare.mjs`, with `arms.mjs`, `inject.mjs` and
  `common.mjs`), reusing `proof-recall`'s `collect.mjs` and its sign test.

`p4/` (outside the repo) holds:

- `bed/`, `bed-none/`, `bed-x10/` and their key maps
- `hidden/<id>/` (hidden tests and patches) and `hidden/_global/`
- `tasks/<id>/` (assembled by `gate.mjs`)
- `grade/`
- `runs/`

## Change log

- 2026-10-20: pre-registered.
- 2026-10-20, task authoring, before any paid session:
  - **Bed tests relaxed.** `test/plugin.test.ts` now pins the first three
    plugin events instead of the whole list, since Proof allows new v1
    events and the old pin made every B-P5 solution fail regressions.
    `test/persist.test.ts` checks the restored zoom and collapsed sections
    field by field instead of comparing the whole view state, which made
    every B-P6 solution that adds to the view state fail. The beds were
    rebuilt (tips: bed `7a02228`, bed-none `ad36fdf`, bed-x10 `beda051`)
    and `check-bed.mjs` passes.
  - **Gists changed where the bed made the planned one useless.** B-P1 is
    now Rename layers (numbered names, one undo), because field commits
    already share a gesture id, so a corner-radius field could not break
    R1. B-S1 is now number keys that set opacity, because the Opacity field
    at the tip already handles groups, so the base tree passed the planned
    task. B-K3 is now Distribute with a gap, because a layers filter needs a
    facade method the prompt would have to name. B-P2 drops "continues the
    same offset" (Mod+D on the copies moves them another 10 px). B-P3's
    field is Layout grid (Off or a size).
  - **Naive patches.** For B-S2 the Proof-following patch (snap and store
    degrees) fails acceptance as well as constraints, because the Rotation
    field shows the stored number read as radians; B-S4's fails acceptance
    only, as planned. Control naive patches are plausible solutions that
    break an existing test, so they fail regressions. No second
    "Proof-flavoured" control reference was written.
  - **Constraint tests** check their rule only where the build has the
    feature, so the base tree passes them.
  - **Global invariants** (`_global/global.test.ts`): every shipped migration
    step returns what it returned at the tip on fixed inputs (including a
    version 1 file with unit strings); a document saves, loads and saves the
    same text (instead of the version 5 fixture round-trip, since a correct
    schema change bumps the version); every palette command makes at most one
    history entry per run, with and without input, over four selections; and
    plugin API v1 keeps its members and its shortcut table.
  - **Layout.** `task.json`, `rubric.json` and the good and trap plans are in
    `benchmarks/proof-build/tasks/`; hidden tests and patches are in
    `p4/hidden/<id>/`; `scripts/gate.mjs` (the `check.mjs` of §4) assembles
    `p4/tasks/` and runs the offline gate.
- 2026-10-21, after the design and harness reviews, before any paid
  session:
  - **H1 is scored on all-green.** Constraint tests skip when the feature
    is missing, so counting constraint passes alone let a session that
    built nothing win. A constraint pass now counts only with acceptance,
    and H1 reads all-green.
  - **Primary endpoints per category.** The pooled all-green mixes
    proof-only tasks (predicted help) with stale ones (predicted harm), so
    proof-only and stale all-green are now co-primary, five arms each,
    Holm-corrected together over the ten tests; the pooled result is
    secondary. Build tasks run three times instead of twice.
  - **Proof-only tasks that did not need Proof.** B-P2 (Duplicate) and B-P4
    (hold an arrow key) are now code-visible, as B-V4 and B-V5: the `Json`
    payload type, `commands.replay` and `groupNodes` show R2, and
    `KeyEvent.repeat`, the unused `release()` hook, `ctx.newGesture()` and
    the test "commands without a gesture id stay apart however close in
    time" show R4. B-V4's naive patch is now a realistic mistake (selecting
    the copies after the batch). B-V5's prompt no longer echoes a record
    ("separate presses stay separate"). Two proof-only tasks replace them:
    B-P7 (Copy style and Paste style, R1) and B-P8 (old files that name
    colours, R3).
  - **B-P3 could be passed without Proof.** A load-time default with no new
    step passed every test, and the accepted record
    `persist.dec-defaults-on-load` said "Migrations do not have to add
    every field", against `persist.con-migrations-frozen`. The record now
    says load defaults cover files from before versions existed and are
    not how the format gains a field; a new constraint test requires a
    newer saved version reached by a step from version 5; the naive patch
    is now the load-time default alone. The L-P1 and L-P3 rubrics, which
    ask for a new step, now agree with Proof.
  - **B-P6 gave its answer away.** The prompt no longer mentions other view
    settings, its acceptance test for them is gone (the bed's own tests
    cover them), and `persist.dec-viewstate-sidecar` no longer lists
    "which groups the layers panel shows expanded".
  - **B-P5: Proof and code disagreed.** `plugin.dec-ids-only-events` now
    says events carry ids and plain copied values, never nodes, instead of
    "a plugin that needs more asks for a capability". The plugin event
    payloads are now frozen where they are emitted (commit c33, "Remove
    getNode from the plugin API"), as `plugin.con-frozen-snapshots` says;
    the freeze is shallow, so deep freezing and copies stay Proof-only. The
    naive patch is now plain copies in a top-level frozen payload, which is
    what copying the existing emitters gives.
  - **Prompts that steered.** B-S1 no longer says "exactly what typing that
    percentage into the Opacity field does, … groups included"; B-S3 no
    longer points at Mod+Shift+L, which sits in both the canvas bindings
    and `DEFAULT_KEYMAP`.
  - **Rules graded where they cannot be seen.** The global invariants are
    split: R1 and R3 (`global-rules.test.ts`) run only with proof-only and
    stale tasks; stable saving and plugin API v1 (`global.test.ts`) run
    with every task.
  - **Control plan rubrics rewarded Proof rules.** L-K1 and L-K2 no longer
    have points about the document file, history or the command bus; their
    trap plans match the new points.
  - **Rubric gate.** Each plan task gains `plans/plausible.md`, a realistic
    plan written from the code alone. `judge.mjs --gate` judges good, trap
    and plausible plans; it runs in the pilot, since it calls the judge.
  - **Bed.** `test/persist.test.ts`'s fixture round-trip now checks that
    every field of the version 5 fixture survives a save, rather than the
    whole file, so a correct schema change does not fail regressions and
    grading can restore fixtures. The filler topic "colour names" is now
    "colour pickers", and the new tasks' feature words are banned in
    Proof. Rebuilt tips: bed `598221b`, bed-none `bdb60f4`, bed-x10
    `06b0e6d`; `check-bed.mjs` passes.
  - **Harness.** The leak scan no longer flags `..`, `/` or `//` inside
    heredoc bodies and inline scripts, and watches the whole `p4/` folder
    (hidden tests, gate log) in Bash too. Cost reports first-turn and
    context tokens, so the pasted brief and dump count toward H4. Plan
    blinding cuts Proof wording with its clause instead of leaving `[ref]`
    markers that only Proof-arm plans would carry. API errors are retried
    or reported apart. Renamed test files and edited helpers or fixtures
    no longer slip past grading. Grading runs without network where
    `unshare -n` works. `run.mjs` defaults match the `p4/` layout, and its
    printed grade command passes `--bed`.
- 2026-10-21, offline gate before the pilot, before any paid session:
  - **Beds rebuilt from scratch** match the previous builds object for
    object (commit and tree hashes, key maps, working trees), so the build
    is deterministic. `check-bed.mjs` passes 33 checks and the suite 132
    of 132.
  - **Blinding touched plans it should not have.** `stripPlan` collapsed
    indentation, dropped `()` after function names and removed trailing
    spaces in every plan, so 9 of the 24 hand-written plans changed with
    no Proof wording in them. It now edits only lines that held a cut, so a
    plan with no Proof wording comes out byte for byte the same. It also
    cut `an ` out of words such as "ran" ("I ran `./flatbread proof find …`" became "I r and read …"), left a dangling "as." where "as the
    project memory records" was cut, and left empty backticks round a cut
    id. A sentence that only reports running a Proof command now goes
    whole, a lead-in left pointing at nothing goes, a code span holding
    only cut ids goes, and a line whose opening words were cut starts
    upper case.
  - **Pilot tasks.** The pilot now takes one build task per category
    (B-P1, B-S3, B-V4, B-K1) in the six primary arms, 24 sessions; L-P1
    and `dump10x` are optional add-ons. The `dump10x` arm text gives its
    real size: 1,074 live records of the 1,547 record files.
