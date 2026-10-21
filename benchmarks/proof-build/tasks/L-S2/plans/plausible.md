# Plan: custom keyboard shortcuts

1. Where shortcuts come from. The dispatcher registers each scope's bindings from `keys/bindings/*` with `registerBinding`, and a later binding for the same chord replaces the earlier one. `DEFAULT_KEYMAP` in `keymap.ts` is a frozen table that only `api.shortcuts()` returns; the dispatcher never reads it.
2. User table. `{ scope, chord, commandTitle }[]`, chords normalised with `normalizeChord` before storing. On startup and after each change, register the user bindings on top of the defaults, and unregister a default whose command moved to a new chord.
3. Conflicts. If the new chord already has a binding in that scope, ask whether to replace it; one chord has one binding per scope.
4. Reset. Clear the user table and rebuild the dispatcher from the bindings modules.
5. Persistence. Keep the user table in the editor's preferences file under the user's settings folder, not in documents.
6. Plugins. `api.shortcuts()` keeps returning `DEFAULT_KEYMAP` unchanged, so plugin API v1 stays as it is.
7. Tests: rebind, conflict, reset, chord spelling, plugins see the v1 table.
