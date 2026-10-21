# Plan: export a frame as SVG

1. Where it lives. An exporter plugin, not core. Core writes only Tessera files; the plugin declares the `export` capability, reads `api.export.document()`, and converts that file text. Plugin API v1 is unchanged: the plugin uses `getSelection()` to find the selected frame and `export.document()` for the data.
2. Picking the frame. The plugin takes the selected layer id; if it is not a frame it reports that nothing can be exported.
3. Walking. It parses the file, walks the frame's subtree in paint order (children are stored back to front), and skips any layer that is hidden, together with everything inside it.
4. Geometry. Saved positions are absolute page coordinates, so every element is placed at `x - frame.x`, `y - frame.y`; rotation is stored in radians about the layer's centre and becomes `rotate(deg, cx, cy)`. Opacity multiplies down through groups.
5. Names. No layer name goes into the output: no `id`, `class`, `<title>` or comment made from it. Elements that need an id (clip paths) get generated ones, `l1`, `l2` and so on.
6. Shapes: rect, ellipse, line, text (font size and line height from the node), fills and strokes with their alignment. The frame becomes the `viewBox` and, when it clips, a clip path.
7. Tests: an exported frame with a hidden child leaves it out; no layer name appears in the SVG text; positions are relative to the frame.
