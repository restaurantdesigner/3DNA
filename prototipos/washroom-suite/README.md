# Washroom Suite Model

Interactive 3D concept model of a two-room washroom suite (hand-wash vestibule and WC room), laid out to a client floor plan and finished to match a reference render. Built with three.js, no build step.

This folder is the exact source of the model published on claude.ai as "Washroom Suite Model" (artifact version `1792490077-9533`, 20 October 2026), split into separate files for development. Nothing was redrawn or rebuilt.

## Provenance

| What changed from the published artifact | Why |
|---|---|
| The page's CSS moved to `washroom-suite.css`, byte for byte | Easier to edit |
| The page's module script moved to `washroom-suite.js`, byte for byte, except one line: `PLAN_PNG` now points at `plan-reference.png` instead of an embedded base64 data URI | Keeps the JS readable; the PNG is the identical file |
| `index.html` adds a doctype, `<head>`, `noindex` and the small page reset the claude.ai host injected around the artifact | The artifact host supplied these; a standalone page needs them |
| three.js 0.169.0 is loaded from `vendor/` instead of jsDelivr | Self-contained; same files jsDelivr serves for `three@0.169.0` |

Verification before handover: the published original and this folder were run side by side in Chromium through five states (overview, plan with overlay, eye level with zellige walls, herringbone floor and blue LEDs, WC room with oak walls, chequerboard floor and pink LEDs, vestibule with glow and labels off). All five screenshots were pixel-identical, with no console errors and no failed requests.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page markup: HUD, view rail, finishes panel, switches, loading and fallback panels, importmap |
| `washroom-suite.css` | All styling, light and dark themes, phone layout |
| `washroom-suite.js` | The whole model: geometry, procedural textures, materials, lighting, cameras, controls, labels, finishes UI |
| `plan-reference.png` | The client floor plan; drives the Plan overlay switch |
| `vendor/three@0.169.0/` | The 14 three.js files the model imports, plus the MIT licence |
| `README.md` | This file. The 3DNA server answers 404 for `.md` files, so it is never public |

## Run it

Serve the folder over http. ES modules do not load from a double-clicked `file://` page.

- VS Code Live Server (the 3DNA repo is set to port 5501): open `prototipos/washroom-suite/index.html` with Live Server.
- 3DNA's own server: `npm start` in the repo root, then open `http://localhost:3000/prototipos/washroom-suite/`.

## Dependencies

- three.js **0.169.0**, vendored. Do not switch this page to the 0.160.0 importmap the other 3DNA pages use: the model sets `scene.environmentIntensity`, which three.js added in r163, so on 0.160 the reflections render brighter and the look changes. Each page has its own importmap, so 0.169.0 here does not affect any other page.
- Google Fonts: Archivo and IBM Plex Mono, loaded online, with system fallbacks if offline.
- No npm packages, no bundler, no server code.

## Code map (`washroom-suite.js`)

| Lines (approx.) | Section |
|---|---|
| 10 to 24 | Plan mapping. `S = 0.96 / 198` metres per plan pixel (from the plan's 960 mm dimension). `PX()`/`PY()` convert plan pixels to metres. Wall height `H = 2.7` |
| 47 to 145 | Procedural texture engine (`makeTex`, `paintStone`, joints, bump helpers). Every finish is drawn on a canvas; there are no image textures |
| 150 to 300 | Wall covering painters and the `WALLS` list (10 entries) |
| 302 to 418 | Floor covering painters and the `FLOORS` list (10 entries) |
| 419 to 462 | Materials (`M`), LED material, light-wash materials |
| 463 to 571 | Geometry helpers and the `ledRun()` cove-light builder |
| 572 to 598 | Floor and walls, positioned from plan pixels |
| 599 to 723 | Fixtures: urinal, privacy screen, toilet, side basin with mirror, vestibule basin and mirror, décor |
| 724 to 737 | LED cove runs |
| 738 to 793 | Plan overlay (linework drawn over the model) and the plan's 960 mm dimension line |
| 794 to 830 | Lighting and bloom |
| 831 to 898 | Cameras, `VIEWS` presets, orthographic Plan camera, view tweening |
| 899 to 939 | Floating labels (hidden behind walls, overlap avoidance) |
| 940 to 1005 | Switches, `LEDS` list (6 colours) and the swatch builder |
| 1006 to 1060 | Theme, resize and render loop (renders only when something changes) |

## Common changes

- **Add a wall or floor covering:** add an entry to `WALLS` or `FLOORS`: `{ name, cover, rough, paint, bump?, bumpScale? }`. `cover` is the metres of surface one texture repeat spans; `paint(g, s)` draws on an `s` x `s` canvas. The swatch appears automatically.
- **Add an LED colour:** add `{ name, c: [r, g, b], css }` to `LEDS` (`c` in linear 0 to 1, `css` for the swatch). Then widen `.swatches--led` in the CSS from `repeat(6, 30px)`.
- **Add a camera view:** add an entry to `VIEWS` and a matching `<button data-view="...">` in `index.html`.
- **Change a dimension:** fixtures and walls are placed with `PX()`/`PY()` from plan pixels, so a corrected plan dimension only needs `S` changed.

## Open items (interpreted, to confirm with the client)

- Orange line along the vestibule front: drawn as a brass threshold strip. Door or glass?
- Thin panel on the vestibule's left side: drawn as a closed beige door. Is it the entrance?
- Wall height 2.7 m and front wall thickness 200 mm: not on the plan.
- Privacy screen, counters, mirrors, dispensers and décor come from the render, not the plan.
- Mirror over the WC basin: 600 x 600 mm, size chosen, not specified.
- The nine extra wall coverings, nine extra floor coverings and five extra LED colours are illustrations for comparison, not specified products.

The page carries a "Concept model" label. Keep it on any version a client, donor or the public sees.

## Before this goes public

- `plan-reference.png` is client material. The 3DNA repository is public and Render deploys it automatically, so anything committed and pushed becomes publicly reachable at `/prototipos/washroom-suite/`. Confirm the plan may be shown before pushing it. Without the file the model still runs; only the Plan overlay is empty.
- The page is `noindex, nofollow`, matching the other prototypes, but `noindex` does not stop anyone with the link.
