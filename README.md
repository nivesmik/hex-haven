# HEX HAVEN v0.2 — GitHub Pages prototype

Static HTML/CSS/JS. No build step, dependencies, or server required.

## v0.2 changes
- Three orientations only (120° rotation).
- Seeded deck: ~20% one-terrain, ~70% two-terrain, ~10% three-terrain tiles. Two-terrain edges use 2+4 / 4+2 adjacent groups.
- Tap an available dotted hex to **select**, preview the tile on the board, rotate to inspect the placement and projected score, then press **여기에 놓기** to commit. Drag to pan.
- Undo, stage reset, save and stage progression retained.

## Deploy
Upload `index.html`, `style.css`, `README.md`, and the **src** directory to the root of the GitHub repository. Enable GitHub Pages → Deploy from a branch → main → /(root).

## Notes
- Save schema is v2. An old v0.1 saved game resets when first opening v0.2 because the tile distribution and orientation rules changed.
- The rules live in `src/engine.js`, independent of Canvas/DOM. Port the rules to C# if later moving to Unity; they are not directly executable in Unity.
- No external assets; visuals are temporary.
