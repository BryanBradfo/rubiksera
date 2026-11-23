# Planche redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin rubiksera as a manga "planche": ink panels, the logo's girl as the teacher speaking in a bubble, a cel-shaded 3D cube, and a phase / direction colour code, without touching the solver or playback logic.

**Architecture:** Same stack, rewritten in place. `index.html` + `css/style.css` are rewritten; a new pure module `js/phases.js` holds the phase and title-highlight logic (testable in Node); `main.js`, `moveIcons.js`, `cube3d.js` and the i18n files are adapted. A tiny `node --test` suite guards the pure logic and the copy rules; everything visual is verified with Playwright screenshots against the mockup.

**Tech Stack:** HTML, CSS, ES modules, Three.js 0.160 via importmap, Google Fonts, Node 24 (`node --test`) for checks only, ImageMagick `convert` for assets.

**Spec:** `docs/superpowers/specs/2026-11-23-planche-redesign-design.md` (read it first; it is the source of truth for every value below). Visual reference: option 1 of `.superpowers/brainstorm/*/content/identites.html`.

## Global Constraints

- No build step, no npm dependency added to the site; Three.js stays on `unpkg.com/three@0.160.0` via importmap.
- Do not modify `js/lblSolver.js`, `js/cubeEngine.js`, `SCRAMBLE` or `PRECOMPUTED_STEPS`.
- No `·`, `—` or `–` anywhere in `index.html` or `i18n/*.js` (visible copy, titles, attributes).
- Step titles and bodies stay word for word from Victor's sheet; the only addition is `steps[i].highlight`.
- Tokens: Encre `#0E0E0E`, Papier `#F3EEE3`, Blanc case `#FFFFFF`, Rouge Shōnen `#E8332A`, Bleu Encre `#1F4FD8`, Jaune Néon `#FFD400`. Never white text on yellow.
- Phases: steps 1 to 3 = phase 1 (red), step 4 = phase 2 (blue), steps 5 to 8 = phase 3 (yellow).
- Directions on move cards: cw = red, ccw = blue, half = yellow, always paired with arrow + text.
- Fonts: Dela Gothic One (display), Zen Kaku Gothic New 400/500/700 (body), IBM Plex Mono 500/600 (labels).
- Panels: 3 px ink border, 12 px paper gutters. Desktop breakpoint 1024 px; mobile 16 px side gutter, no horizontal page scroll.
- Commits: Conventional Commits, one line, author `BryanBradfo` noreply, no AI trailer, on branch `feature/planche-redesign`.

## Review Focus

- Language switch while a step is playing or while "BRAVO !" is shown: text, highlight, chapter and SFX word all update, playback keeps going. (Task 6 verification step.)
- Very long step bodies (step 3 and step 4 have case blocks): bubble scrolls internally on desktop, nothing overflows the panel or hides the formula. (Task 3 verification step.)
- Steps with no moves (step 1): formula panel shows the placeholder, no empty grid, no JS error. (Task 4 verification step.)
- Underside (white face) during steps 1 to 3 with toon shading: never black or unreadable. (Task 5 verification step.)
- Mobile 375 px during playback: the page never auto-scrolls, the cube stays visible, no horizontal scroll. (Task 3 and Task 6 verification steps.)

---

### Task 1: Brand assets and head metadata

**Files:**
- Create: `assets/brand/logo.png`, `assets/brand/face.png`, `assets/brand/og.png`, `assets/favicon.png`, `assets/apple-touch-icon.png`
- Delete: `assets/favicon.svg`
- Modify: `index.html` (head only)

**Interfaces:**
- Produces: asset paths above, used by Task 3 markup and CSS.

- [ ] **Step 1: Generate assets from `~/Téléchargements/u/rubiksera_resized.png`**
  - `logo.png`: `convert SRC -trim -resize 1200x1200 assets/brand/logo.png`
  - `face.png`: crop the face and cube region (in the 2592 px source roughly x 1000 to 2050, y 700 to 1750, adjust by eye), resize 400x400.
  - `favicon.png` 32x32 and `apple-touch-icon.png` 180x180 from the face crop, on white.
  - `og.png` 1200x630: Papier background, logo on the right, "RUBIKSERA" left in Dela Gothic One if available locally, else render the text from a throwaway HTML page with Playwright and screenshot it. Keep each PNG under 300 KB (`-strip -quality 90`, or `pngquant` if present).
- [ ] **Step 2: Update `<head>`**: favicon links to the two PNGs, `<meta name="description">`, Open Graph (`og:title`, `og:description`, `og:image` = `https://rubiksera.bradfo.me/assets/brand/og.png`, `og:type` website) and `twitter:card` summary_large_image. Font link replaced by the three families of the Global Constraints. `<title>` is set by i18n (Task 2).
- [ ] **Step 3: Verify**: `git status --short assets` lists the new PNGs as untracked (not ignored); `ls -la assets/brand` shows sizes under 300 KB; Read `face.png` to check the crop.
- [ ] **Step 4: Commit** `feat: add rubiksera brand assets and social metadata`

### Task 2: Phases module, copy rules and i18n

**Files:**
- Create: `js/phases.js`, `tests/phases.test.mjs`, `tests/copy.test.mjs`
- Modify: `i18n/fr.js`, `i18n/en.js`, `js/steps.js`

**Interfaces:**
- Produces:
  - `phaseOf(stepIndex: number /* 0-based */) -> 1 | 2 | 3`
  - `PHASE_COUNT = 3`
  - `splitHighlight(title: string, highlight: string | undefined) -> { before: string, mark: string, after: string } | null` (first occurrence; null when missing or empty)
  - `STEPS[i].highlight: string` (copied by `syncStepsFromI18n`)
  - New i18n keys (both languages): `ui.docTitle`, `ui.creditTag`, `ui.chapterLabel`, `ui.phases.p1|p2|p3`, `ui.formulaLabel`, `ui.dirLegend.cw|ccw|half`, `ui.movesHint` (rewritten), `ui.sfxStep`, `ui.sfxSolved`, `ui.btnPrev|btnPlay|btnPause|btnNext|btnReset` (text only, no glyphs), `ui.cubeHint`, `ui.speedLabel`, `steps[i].highlight`. Remove `ui.title`'s use as a header (keep key for logo alt) and delete `ui.subtitle`.

- [ ] **Step 1: Write `tests/phases.test.mjs`** (`node:test` + `node:assert/strict`):
  - `phaseOf` returns `[1,1,1,2,3,3,3,3]` for indexes 0..7.
  - `splitHighlight("Placer les coins de la première couronne", "coins")` deep equals `{ before: "Placer les ", mark: "coins", after: " de la première couronne" }`.
  - `splitHighlight("abc", "zz") === null` and `splitHighlight("abc", undefined) === null`.
- [ ] **Step 2: Write `tests/copy.test.mjs`**:
  - For `index.html`, `i18n/fr.js`, `i18n/en.js`: file text contains none of `·`, `—`, `–`.
  - For each language, each of the 8 steps has a non-empty `highlight` that is a substring of its `title`.
  - FR and EN `ui` objects have the same key set (deep, recursive).
  - `ui.docTitle` FR is `"rubiksera, apprendre le Rubik's Cube en 8 étapes"`, EN is `"rubiksera, learn the Rubik's Cube in 8 steps"`.
- [ ] **Step 3: Run** `node --test tests/` → both files FAIL (module missing, separators present).
- [ ] **Step 4: Implement `js/phases.js`**, replace the fallback `<title>` text in `index.html` with the FR `docTitle`, add `highlight` passthrough in `syncStepsFromI18n`, update both i18n files: new keys per Interfaces, replace every `·`, `—`, `–` with a comma, colon or new sentence (body HTML too), pick one highlight word per step that names what the step builds. FR copy: `sfxStep` "CLIC !", `sfxSolved` "BRAVO !", `creditTag` "Méthode de Victor Colin", phases "La première couronne", "La deuxième couronne", "La face jaune". EN: "CLICK!", "SOLVED!", "Victor Colin's method", "The first layer", "The second layer", "The yellow face".
- [ ] **Step 5: Run** `node --test tests/` → PASS.
- [ ] **Step 6: Commit** `feat: add phase helpers and separator-free FR/EN copy`

### Task 3: Planche layout (markup, CSS, render wiring)

**Files:**
- Modify: `index.html` (body), `css/style.css` (full rewrite), `js/main.js` (render and DOM refs only)

**Interfaces:**
- Consumes: `phaseOf`, `splitHighlight` (Task 2); asset paths (Task 1).
- Produces (used by Tasks 4 to 6):
  - DOM ids: `#stage` (cube panel, contains `#cube-canvas-container`, `#sfx`, `#step-big-num`), `#step-title` (`aria-live="polite"`), `#step-body`, `#moves-list`, `#pages` (8 `button.page` with `data-step`), `#chapter`, `#speed-slider`, `#speed-value`, `#btn-prev`, `#btn-play`, `#btn-next`, `#btn-reset`, `#credit-line`.
  - `document.body.dataset.phase = "1" | "2" | "3"` set by `renderStep`; CSS reads it via `[data-phase="2"] { --phase: var(--blue) }` etc.
  - `.page.done`, `.page.current`, `.page[data-phase]`.
  - Formula scroll container: `#moves-list` itself (desktop grid that scrolls vertically, mobile row that scrolls horizontally).

- [ ] **Step 1: Rewrite the body markup** per the spec's desktop sketch: top panel (logo mark + "RUBIKSERA" wordmark, `#chapter` label with phase colour, credit tag link to the video, FR/EN), stage panel with clip-path edge, teacher panel (`face.png` + bubble with `#step-title`, `#step-body`), formula panel (label, direction legend, speed control, `#moves-list`), controls (prev, play, next, `#pages`, reset), postface footer.
- [ ] **Step 2: Rewrite `css/style.css`**: tokens of Global Constraints on `:root`, speed lines (`repeating-conic-gradient`) and halftone (`radial-gradient`) as `#stage` pseudo-elements, bubble with tail, `.case` / `.remark` as inner mini panels, pages, focus ring (3 px ink outline, 3 px offset), mobile layout below 1024 px per the spec's "Mobile" decisions (sticky bar = prev/play/next/reset at 44 px; pages row under the cube at about 38 px; speed in formula header; `#moves-list` horizontal scroll), `prefers-reduced-motion` block.
- [ ] **Step 3: Adapt `main.js` rendering**: build `#pages` instead of timeline dots (title attribute `"${stepLabel} ${n}: ${title}"`), `renderStep` sets title via `splitHighlight` with DOM nodes (`<mark>`), big number `String(n).padStart(2,"0")`, chapter text from `ui.phases.p{phase}`, `body.dataset.phase`. On mobile (`matchMedia("(max-width: 1023px)")`) replace the card `scrollIntoView` with setting `movesListEl.scrollLeft` so the page never scrolls; on desktop scroll only `movesListEl.scrollTop`. Remove the `textPaneEl` reference.
- [ ] **Step 4: Verify** with `python3 -m http.server 8000` and Playwright at 1440x900 and 390x844, FR and EN, on steps 1, 3 and 8 (click pages): screenshot matches the mockup's structure; step 3 body scrolls inside the bubble on desktop; at 390 px `document.documentElement.scrollWidth === 390`; console has no errors; `node --test tests/` still PASS.
- [ ] **Step 5: Commit** `feat: rebuild the interface as a manga planche`

### Task 4: Inked move cards

**Files:**
- Modify: `js/moveIcons.js`, `css/style.css` (move card section)

**Interfaces:**
- Consumes: `#moves-list` and the `current` / `done` classes set by `playStep` (unchanged).
- Produces: `createMoveIcon(move)` still returns one element with class `move-card` plus `move-card--cw|ccw|half`, same `aria-label`.

- [ ] **Step 1: Update `moveIcons.js`**: `FACE_COLOR` aligned with `cube3d.js` stickers after Task 5 (`U #FFD400`, `R #E8332A`, `B #1F4FD8`, keep D/L/F), `NEUTRAL` `#FFFFFF`, sticker stroke `#0E0E0E` width 1.4, arrow ink `#0E0E0E` with white halo. Card markup: cube, notation (big), face name, direction text; modifier class from the turn key.
- [ ] **Step 2: Style cards**: ink border, 6 px bottom bar in direction colour, `.current` yellow fill, `translateY(-3px)`, 4 px hard ink shadow; `.done` reduced to 0.45 opacity with notation still legible; placeholder from `data-empty` shown in a small bubble when the list is empty.
- [ ] **Step 3: Verify** on steps 1 (placeholder, no error), 3 and 7 while playing: current card yellow and in view, cw/ccw/half bars match the notation (`R` red, `R'` blue, `U2` yellow).
- [ ] **Step 4: Commit** `feat: ink the move cards and colour code turn directions`

### Task 5: Cel-shaded cube

**Files:**
- Modify: `js/cube3d.js` (materials, lights, shadow only; animation, views and API unchanged)

**Interfaces:**
- Produces: same exported API (`createCube3D`, `invertSequence`, `invertMove`); returned object gains nothing.

- [ ] **Step 1: Materials**: one shared 3-tone `gradientMap` (`DataTexture` 3x1, `NearestFilter`), `MeshToonMaterial` for body (`#0E0E0E`) and per-tile stickers (`U #FFD400`, `D #F6F6F6`, `R #E8332A`, `L #FF7F1F`, `F #1BB55C`, `B #1F4FD8`). Drop `tileColor` desaturation and random roughness. Keep `userData.baseColor` / `isSticker` so `setLayerGlow` (emissive) still works.
- [ ] **Step 2: Outline**: per cubie, a child mesh sharing `bodyGeom`, scale about 1.06, `MeshBasicMaterial({ color: 0x0e0e0e, side: THREE.BackSide })`, not flagged as sticker.
- [ ] **Step 3: Lights and renderer**: remove `RoomEnvironment`, PMREM, `RectAreaLight` and imports; `toneMapping = THREE.NoToneMapping`; one directional key plus a `HemisphereLight` strong enough that the white face from below reads as white in at least the two lighter tones.
- [ ] **Step 4: Shadow**: replace the radial contact shadow texture with a canvas halftone ellipse (ink dots, about 7 px pitch at 256 px canvas).
- [ ] **Step 5: Verify**: screenshots at step 1 (white view, underside) and step 5 (yellow view): black outlines around every cubie, flat colour bands, white face clearly white; play step 3 fully: outline turns with its layer, no gaps or z-fighting.
- [ ] **Step 6: Commit** `feat: render the cube as an inked cel-shaded drawing`

### Task 6: Motion (speed lines, SFX, step transitions)

**Files:**
- Modify: `js/main.js`, `css/style.css`

**Interfaces:**
- Consumes: `#stage`, `#sfx`, `#step-title`, `#step-body` (Task 3); `ui.sfxStep`, `ui.sfxSolved` (Task 2).
- Produces: `showSfx(kind: "step" | "solved") -> void`, `hideSfx() -> void` in `main.js`; `#stage.is-turning` class during `playStep`.

- [ ] **Step 1: Speed lines**: add `is-turning` on `#stage` at the start of `playStep`/`unplayStep`, remove at the end; CSS raises the speed-line opacity while present.
- [ ] **Step 2: SFX**: `playStep(idx, durationMs, { sfx = true })`; `jumpToStep` passes `sfx: false`. After a step's moves finish with `sfx` true call `showSfx("step")`; when the step just finished is index 7 (any path, including jumps) call `showSfx("solved")`, which stays until `hideSfx()`. `hideSfx()` runs at the start of prev, page click and reset handlers. On `langChanged`, if solved SFX is visible, re-set its text. `#sfx` is `aria-hidden="true"`; pop animation about 900 ms (scale and small rotation); reduced motion uses a fade.
- [ ] **Step 3: Step transition**: on `renderStep`, restart a short fade and 8 px rise on the bubble content (toggle a class with a forced reflow); none under reduced motion.
- [ ] **Step 4: Verify**: play from step 1 to 8 at speed 2x: one "CLIC !" per finished step, "BRAVO !" at the end, cube solved; switch to EN while "BRAVO !" is showing: it reads "SOLVED!"; click page 3: no SFX during the jump and "SOLVED!" hidden; at 390 px during playback `window.scrollY` stays unchanged; console clean.
- [ ] **Step 5: Commit** `feat: add speed lines, onomatopoeia and step transitions`

### Task 7: README and final pass

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README**: title and tagline without `·` or long dashes, Features list updated (manga planche, teacher bubble, cel-shaded cube, phase and direction colour code), project tree updated (`assets/brand/`, `js/phases.js`, `tests/`), add `node --test tests/` under "How to run locally".
- [ ] **Step 2: Final verification**: `node --test tests/` PASS; `grep -nP "·|—|–" index.html i18n/*.js` returns nothing; full Playwright pass of the spec's "Vérification" list at 1440x900 and 390x844 in FR and EN; remove any screenshot files left in the repo root and `.playwright-mcp/`.
- [ ] **Step 3: Commit** `docs: update README for the Planche redesign`
