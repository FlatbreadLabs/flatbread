# Plan: auto layout

1. Add direction, gap and padding to frames.
2. After any change, run relayout after a 100 ms debounce and record it as its own history entry, merging relayout entries that arrive within 300 ms of each other.
3. Round computed child positions to whole pixels before storing them, so stacks stay crisp.
4. Relayout writes node positions with `doc.update` directly for speed.
