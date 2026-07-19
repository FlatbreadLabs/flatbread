# Effort Graph glossary

The Effort Graph is persistent, queryable memory for long-horizon software
work. It builds on Flatbread's content vocabulary: each primitive is a
Collection, its instances are Records, and cross-primitive references are
Relations in frontmatter.

It is not a CMS, authoring UI, hosted memory product, or general task tracker.
Operational provenance (session, agent, model, DAG run) belongs in record
frontmatter; durable run transcripts live with Proof artifacts.

## Primitives

### Effort

The anchor for one coherent thread of work: a feature, migration, spike,
research investigation, or refactor. Every other primitive belongs to exactly
one Effort. It scopes bounded reads but carries only a short description; the
reasoning belongs in the related records.

### Issue

A tracked item needing attention: a question, defect, gap, or blocker. An Issue
is reactive. Decisions and Findings resolve it through lifecycle edges.

### Finding

A grounded observation about code, users, literature, or runtime behavior.
Findings cite evidence, resolve Issues, inform Decisions, surface Risks, and
may invalidate past Findings or Decisions. A retrospective Finding is evidence
gathered after a decision shipped.

### Decision

A commitment among alternatives. A proposed Decision is an active alternative;
an accepted Decision is committed; rejected, superseded, and deprecated
Decisions retain their lifecycle history. A Decision cites the Findings,
Constraints, and Risks it weighed rather than duplicating them.

### Constraint

A sticky hard or soft boundary that limits the decision space. Constraints are
known limits; they are not prospective negative outcomes.

### Risk

A prospective negative outcome with likelihood and severity. It is open,
mitigated by an accepted Decision, realized with evidence, or explicitly
accepted.

### Citation

A first-class cite target that explains what evidence is and how it relates.
Epistemic records point at Citations via the homogeneous `cites` ref so
Flatbread validates and GraphQL-resolves the edge. A Citation body alone is
valid — often a URL string. An optional `blob` ref attaches a longform/opaque
payload when needed. Optional `role` labels the relationship (e.g. evidence,
context). Citations have no proposed/accepted lifecycle.

### Blob

A citeable, non-epistemic payload: opaque content of any format (markdown,
JSON, images, etc.) with no proposed/accepted lifecycle. Blobs are ordinary
Flatbread content (filesystem-first; other sources such as S3/CDN may back
them later). Records do not cite Blobs directly — they cite a Citation that
may optionally ref a Blob. Bounded digests omit Blob bodies by default; use
`effort get <blob-id>` to read the payload.

## Edges

`derives_from` is causal upstream evidence or context. `supersedes` replaces a
record of the same primitive, while `invalidates` says a record was wrong.
Those forward edges are authoritative; `superseded_by` and `invalidated_by` are
writer-materialized reverse projections.

`cites` is a homogeneous Flatbread `refs` edge to Citation on every epistemic
record (Effort, Issue, Finding, Decision, Constraint, Risk). Citation may
optionally `blob` → Blob.

New edge vocabulary needs a dogfooded query the existing vocabulary cannot
express.

## Intentional non-models

Session, Run, Plan, Artifact, Agent, Investigation, Question, Proposal,
Retrospective, and Branch are not collections. Use provenance fields for
operational data; represent questions as Issues, proposals as proposed
Decisions, retrospectives as Findings, and branch history through Git.

**Citation** carries relationship context (and optional Blob). **Blob** is the
longform/payload collection. **Artifact** remains a non-model for run/build
outputs (CLI write-result `artifacts`, digest `artifact_path`, Proof
transcripts) — do not promote those into graph records.
