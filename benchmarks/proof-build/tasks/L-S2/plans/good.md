# Plan: custom keyboard shortcuts

1. The live bindings are the per-scope bindings the dispatcher registers from the bindings modules with registerBinding. A user shortcut is `{ scope, chord, command }`; on load and on change the dispatcher re-registers the user's chords for those commands over the defaults.
2. Chords are normalised to one spelling before they are stored or compared. A chord already bound in the same scope is reported as a conflict, and the user chooses which binding keeps it, since a chord has one binding per scope.
3. DEFAULT_KEYMAP stays the frozen v1 table that `api.shortcuts()` returns to plugins; user changes never touch it.
4. Reset clears the user table and re-registers the defaults.
5. The user table is stored with the user's settings, not in any document file.
