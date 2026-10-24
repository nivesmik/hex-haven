# Hex Haven — Playable Prototype

A zero-dependency hex tile placement puzzle prototype. Korean UI, responsive mobile layout, tile rotation, adjacency matching, scoring, level progression, undo, local saves, drag-to-pan and wheel zoom.

## Run

Use a static server (ES modules do not work reliably over `file://`):

```bash
python3 -m http.server 8000
```

Open http://localhost:8000.

## GitHub Pages

1. Create a new public GitHub repository.
2. Upload **all files and the `src/` folder**, preserving their relative paths.
3. In **Settings → Pages**, choose **Deploy from a branch**, branch **main**, folder **/(root)**, then save.
4. Open the URL shown by GitHub Pages after deployment.

## Architecture

- `src/engine.js`: pure deterministic game rules, no browser or rendering dependencies. This can be ported to C# for Unity.
- `src/main.js`: HTML Canvas renderer, input, and persistence.
- `style.css`: layout and theme.
- `index.html`: application shell.

Tiles use axial coordinates (`q`, `r`), six ordered edge terrains, and integer rotations. Rendering is intentionally replaceable; no gameplay rules depend on sprites or art assets.

## MVP notes

Scores and target values are **prototype hypotheses**, not production-balanced. This build tests the core tile-placement loop, not village creation, sharing, or monetization. Local save is browser/device-specific.
