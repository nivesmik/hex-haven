# HEX HAVEN v0.4 — Touch-first prototype

Static HTML/CSS/ES module game. Deploy the **contents of this folder** to the root of your GitHub Pages repository.

## v0.4 changes
- Pointy-top hex outline and six terrain wedges share one geometry function; edge index 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE. Corrects reversed visual terrain order from v0.3.
- Pointer drag from tile dock to board using window pointer tracking, with lifted drag preview and on-board snap preview.
- Full-viewport board, with floating HUD, action controls and tile dock overlaying the playfield.
- Pan the board and return to center; keep undo, restart and 120° rotation.
- Placement requires tapping ✓ after drag; this avoids accidental placements. Tap an empty cell to select it as an alternative.

## Notes
- No libraries, no server, no build step. GitHub Pages compatible.
- Core rules remain in `src/engine.js`, separate from browser rendering and input, to support eventual C# port to Unity.
- Saved game version remains 2, as in v0.3. If you want to reset: use the restart button.
- iPhone Safari touch behavior needs live-device testing.
