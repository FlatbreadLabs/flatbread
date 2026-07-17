# `@flatbread/effort-graph`

The standalone semantic writer for Flatbread's git-native Effort Graph. It stores typed reasoning primitives as markdown and uses a journal for multi-file mutations.

The v1 mutation surface is exactly: `CreateEffort`, `SetEffortStatus`, `WriteIssue`, `WriteFinding`, `WriteDecision`, `WriteConstraint`, `WriteRisk`, `Supersede`, `Invalidate`, `ResolveIssue`, `AcceptDecision`, `MitigateRisk`, and `SetRiskState`.

The journal lives at `<root>/.journal` and is ignored by git. Use `effortGraphContent()` to add the six collections to a Flatbread configuration. Cross-collection union fields remain writer-validated rather than Flatbread `refs`.
