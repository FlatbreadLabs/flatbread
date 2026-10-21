# Plan: custom keyboard shortcuts

1. The dispatcher looks every press up in DEFAULT_KEYMAP, so rebinding is a matter of editing that table: write the user's chords into DEFAULT_KEYMAP at startup.
2. `api.shortcuts()` then shows plugins the user's current table.
3. Save the user's shortcuts in the document file so they travel with it.
