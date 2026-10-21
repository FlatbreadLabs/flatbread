# Plan: components

What I found: nodes live in `Document`, every edit is a command on the bus with an inverse, the panel commits fields through `set-prop`, frames already get defaults for missing fields when a file loads (`withDefaults` fills `clip`), and plugin API v1 is frozen with a surface test.

1. Model. Frames get optional `componentId` (on a main component) and `instanceOf` (on an instance, the main frame's id). Each child of an instance gets `sourceId`, the id of the child in the main it mirrors, and an `overrides` object holding `text` and/or `fills` when the user changed them.
2. Commands.
   - `make-component { id }` sets `componentId`; its inverse clears it.
   - `place-instance { mainId, parent, index }` copies the main's subtree with new ids and inserts it, using the same insert command as Group selection.
   - Overrides go through the existing `set-prop` path; a small hook marks the child's `overrides` when Text or Fill is edited inside an instance.
3. Updating instances. A listener on the document's change event looks for changes under a main component. For each instance it dispatches `sync-instance { instanceId }`, which copies the main's geometry and style onto the mirrored children and skips overridden keys.
4. Files. The new fields are optional. `withDefaults` treats a missing `componentId` / `instanceOf` as none, so existing files open unchanged and no migration is needed.
5. Plugins. API v1 can't grow, so add a `componentchange` event to `PLUGIN_EVENTS` with `{ ids }` of the instances that changed. This matches `documentchange`, which carries ids, and is frozen the same way. Plugins can then call `getSelection()` and compare ids.
6. Layers panel: show a component badge on main and instance rows.
7. Tests: make, place, override, sync after a main edit, override survives sync, save and load, event fires.
