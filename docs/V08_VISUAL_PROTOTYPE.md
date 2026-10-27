# v0.8 Low-poly 3D Visual Prototype

## Scope and source
Based on PR #3 at `17dee39c954f88cab2715a168d316143d9f5b37a`. This is a graphics experiment, not a balance revision.
`src/engine.js`, `src/ecosystem.js`, `src/experiment.js`, original `src/main.js`, and the Canvas renderer are unchanged.
The supplied standalone reference informed the palette and primitive meshes. Its duplicated game engine was not imported.

## Run
Serve the repository root over HTTP(S), for example `python3 -m http.server 8000`, then open `http://localhost:8000/`.
No build step or runtime CDN is required. Three.js 0.164.1 is vendored under its MIT license.
`index.html` opens 3D; `index-2d.html` opens the retained Canvas interface using the v0.8 save namespace.
A WebGL initialization failure offers a visible 2D fallback link. This is a fallback for graphics support, not a rule fork.

## Implemented
- Full-radius six-wedge pointy-top terrain preserves E/NE/NW/W/SW/SE edge order and axial coordinates on the XZ plane.
- Adjacent matching land/water surfaces have exactly shared border vertices and equal heights. Same material/lighting hides unnecessary seams.
- Warm low-poly grass, trees, small rocky hills and villages use shared primitive meshes and materials, without textures or thick borders.
- Perspective camera: 360-degree orbit, tilt limits, mouse wheel/buttons and two-finger pinch zoom; two-finger or Shift/right drag pans.
- Camera centering fits the current board bounds within capped zoom limits on load/reset.
- Ray/board-plane selection is independent of decorative occlusion. Gesture threshold, cancellation and multi-pointer suppression prevent accidental taps.
- Selected tiles alone show transparent terrain, terrain-color edge lines, warm markers for matching edges, expected stars and before/after water/forest progress.
- Forecasts use a copied board and the existing engine, including projected stars, without firing discoveries, modifying history or saving.
- Existing water/forest/otter conditions, difficulty/seed settings, special stars, Pass/Fail, undo, restart and result copying are retained.
- Existing engine progress selects fish, growing riverside tree clusters and one low-poly otter. Its appearance has no extra tile-shape condition.
- Otter body/head/long tail/flippers prioritize silhouette; gentle floating/turning stops under reduced motion and when hidden.
- Gold 3D markers and the dock label distinguish special tiles; no replacement reward system is implemented.
- Tiles/frontier are updated by differences; preview resources are disposed; shared scene resources are disposed on exit.
- Pixel ratio is capped at 1.5; shadows and texture rendering are omitted. Idle scenes without moving wildlife render only when changed.
- Context restoration and BFCache return have explicit redraw handling.

## Saves
3D and the v0.8 2D fallback share `hexhaven-v08-save-v3`, `hexhaven-v08-experiment`, `hexhaven-v08-view`.
Their schema is the unmodified v3 game/experiment serialization. Camera/Three.js objects never enter game saves.
A user action can read and copy `hexhaven-experiment-v07` into v0.8. No v0.7 key is overwritten or removed.
Default is standard difficulty, seed 202607. Existing v0.8 saves resume rather than resetting each visit.

## Automated checks
- `npm test`: all 29 original tests plus 6 new 3D/forecast/input tests (35 total).
- Tests verify shared edge vertices, upward normals, axial round trip, ray selection at multiple azimuths/pitches/zoom levels/pan offsets,
  tap/orbit/pinch/cancellation separation, forecast/placement equivalence and a forecasted Pass including newly earned stars.
- Browser command: `python scripts/test-browser-v08.py` with Python Playwright 1.62.0 and installed Chromium.
- Browser checks use a local HTTP server and Chromium SwiftShader at desktop 1280x800 and touch-emulated 390x844 / 320x568.
  They cover real WebGL initialization, preview, 60-degree rotation, repeated preview cleanup, placement, reload, undo, orbit/pinch,
  difficulty changes, a v0.7 winning path rendered with otter, read-only v0.7 save copying, and unavailable-WebGL fallback.
- Tests do not deploy to production or alter original main / PR #3 branches.

## Measured scene (Chromium SwiftShader, not iPhone hardware)

| Viewport | Touch emulation | Draw calls | Triangles | Geometries | Median RAF interval |
|---|---|---:|---:|---:|---:|
| 1280x800 | no | 136 | 1601 | 17 | 16.7 ms |
| 390x844 | yes | 136 | 1601 | 17 | 16.7 ms |
| 320x568 | yes | 136 | 1601 | 17 | 16.7 ms |

Measurements are of the seeded winning scene after the scripted camera gestures. Different framing changes culling/draw counts.
RAF cadence is diagnostic, not GPU frame duration or a mobile performance guarantee. Raw results: V08_BROWSER_RESULTS.json.
The desktop check also exercises WebGL context loss/restoration and persisted page transition redraw.

## Limitations and manual checks
- Actual iPhone Safari has NOT been tested. Desktop WebKit could not launch because host libraries are missing.
- Chromium mobile emulation and software GPU measurements are not an iPhone performance or battery benchmark.
- Geometry is shared but vegetation is not yet instanced. Larger maps may need instancing and dynamic quality adjustment.
- The prototype uses continuous flat terrain surfaces rather than procedural river curves, hydraulic flow or shoreline blending shaders.
- No animal AI, realistic textures, real-time shadows, complex animation, new base terrain or rating tiers.
- On hardware Safari, check multi-touch cancellation, safe areas/landscape HUD, thermal behavior, WebGL context recovery, BFCache,
  reduced motion, text readability, camera occlusion and the ability to identify the otter silhouette.
- v0.7 balance limits remain: standard/challenge seed 1271 has no verified clear path in the existing bounded search.
