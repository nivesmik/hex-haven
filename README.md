# HEX HAVEN v0.3

Static HTML/CSS/JavaScript prototype. Upload `index.html`, `style.css`, and `src/engine.js`, `src/main.js` to the root of the GitHub Pages repository.

## Changes
- Fixed pointy-top hex wedge rendering: the outline and terrain sector geometry now share the same vertices (-30° + 60° * i), with sector centers matching the engine's E/NE/NW/W/SW/SE edge indices.
- Added drag from the on-board tile dock to a candidate cell, live ghost preview, and on-board rotation/confirm/undo/recenter controls.
- Retained tap-to-select and board panning. Drag-drop selects the destination; confirm commits it, preventing accidental placement.
- Preserved v0.2 save format. Game rules remain separate in `src/engine.js` for future Unity/C# port.

No build step or external dependencies.
