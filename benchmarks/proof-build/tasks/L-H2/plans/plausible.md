# Plan: export a frame as SVG

1. Module. A new `src/export/svg.ts` with `exportFrameSvg(doc, frameId): string`, exposed as `editor.files.exportSvg(frameId)` beside `files.save()`, and a palette command "Export as SVG" for the selected frame. Plugin API v1 stays frozen; a plugin with the `export` capability can already read the file.
2. Walk. Visit the frame's subtree depth first in paint order (child lists are back to front), skipping hidden layers and their children, since they are not drawn.
3. Geometry. Positions are absolute, so each element is translated by `-frame.x, -frame.y`. Rotation is in radians about the centre; write `transform="rotate(deg cx cy)"`.
4. Style. Fills and strokes map to `fill` and `stroke`; opacity multiplies through groups.
5. Names. Developers look layers up by name, so each element gets `id` from its layer name (made unique and safe for XML), and groups become `<g id="…">` with the group name.
6. Text becomes `<text>` with the font size and line height; the frame sets the `viewBox`, with a `clipPath` when it clips.
7. Tests: snapshot of a sample frame, hidden layers left out, ids unique.
