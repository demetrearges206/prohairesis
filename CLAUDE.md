# Prohairesis — project notes

## Project goal
A long-form parallax scrolling web experience that presents Julian Arges's short story **PROHAIRESIS** (a 5-act sci-fi piece about Dr. Ada Lance, the Helios IV generation ship, and a fractured AI). Each act becomes a chapter with its own custom parallax scene built from layered SVGs. Audience is the writer (Julian) plus a small circle of literary/tech-adjacent readers — this is a portfolio-quality reading experience, not a marketing site. Single deliverable: an offline-capable HTML file, also deployed to GitHub Pages at `https://demetrearges206.github.io/prohairesis/Prohairesis.html`.

## Current state (VERSION XXIII)
- All five chapters are wired up in `Prohairesis.html`. **Ch I (Genesis) is complete with real manuscript prose. Ch II–V still use the placeholder/earlier prose** — Round 2 will go through the manuscript and replace verbatim text for II–V.
- Ch I title is now **"Genesis"** (was "I Am God"). Lede: "Eighty years of solitude…". The chapter ends at the AI's split and the "I am a GOD" declaration.
- Parallax engine works (`parallax.js`) — sticky scenes, per-chapter auto-sizing from prose height, layered transforms based on scroll progress.
- Tweaks panel is wired up (`story-tweaks.jsx` + `tweaks-panel.jsx` starter), with a "Mobile / Scene zoom (phones)" slider for `--mobile-scale`.
- Custom SVG art direction is complete for all 5 chapters and matches the inspiration imagery (`uploads/artdirection_inspiration/`).
- **Three WebGL/canvas shaders now layered into the experience:**
  - `title-shader.js` — full-screen WebGL flow-field behind the opening title, two-tone (crimson + cyan), contracts toward center as you scroll into Ch I. Bleeds 30vh past the opening with a soft bottom-fade so it dissolves into the void of Ch I instead of butt-joining the sphere.
  - `sphere-aura.js` — subtle crimson aura behind the Ch I sphere (organic flow inside the orbital halo, masked to a circle so it doesn't compete with the SVG).
  - `closing-shader.js` — drifting magenta + cobalt plasma behind "fin." at the end. Slower / more meditative than the title field.
- Bonus effects already in place: sticky `ada_eyes` cinematic intro at the top of Ch II with cyan HUD scan + glitch flicker; full mission-control HUD overlay in Ch IV (radar with sweep, telemetry, camera-feed grid, pulsing red alert); halftone glitch overlay in Ch V triggers when the disc-snap moment crosses viewport center.
- Chapter-end "floor" fix is in place: each `.chapter::after` paints a bottom band matching the scene-end color so silhouettes don't "creep up" off the page background. Philadelphia's floor is a vermilion→black GRADIENT (not a solid) so dark `.prose.light` text remains legible across the chapter break.
- Mobile responsive rules are in (`@media max-width: 720px`) — TOC hidden, HUD shrunk, type scaled, prose padding tightened, **plus per-layer SVG scaling** (sphere 1.7×, firs 1.55×, fog 1.7×, etc.). Master `--mobile-scale` multiplier composes on top.
- Standalone bundled output exists: `Prohairesis-standalone.html` (~2MB, fully offline, no em-dash in filename for download compatibility). **NOTE:** standalone is from an earlier version — needs re-bundling once XXIII is stable.
- **Deployed:** GitHub repo at `demetrearges206/prohairesis`, served via GitHub Pages from `main`. Deploy workflow goes through Claude Code Desktop (see Workflow below).

## Deploy version markers — important diagnostic
The title screen shows `VERSION <Roman numeral>` in the bottom-left meta-rule. **The color of that text is the deploy diagnostic** — different version = different color so you can tell at a glance which deploy actually loaded:

| Version | Color    | Hex      | Note |
|---------|----------|----------|------|
| XXI     | cyan     | (legacy) | superseded |
| XXII    | magenta  | `#ff5ad7`| superseded |
| XXIII   | **lime green** | `#9eff5a` | **current** |

CSS rule (story.css around line 154):
```
.opening .meta-rule.bot span:first-child {
  color: #9eff5a !important;
  font-weight: 700 !important;
}
```
**On every deploy, bump the Roman numeral AND the color.** If you push and the user still sees the old color, the deploy didn't land or mobile cache hasn't cleared.

## Design system & decisions

### Type
- **Fraunces** (display serif, italic + roman) for headings, chapter titles, lede, blockquotes. Picked for the literary tone + warm character; resists the "AI slop serif" feel.
- **Inter Tight** for body prose. Tight optical for tight-set columns.
- **JetBrains Mono** for terminal lines, telemetry, HUD readouts, the `<term>` / `<query>` / `.shout` styles, chrome counter, TOC labels.
- Tried Fraunces for body — too wide-set for the column. Tried system serif — felt generic. Don't go back.

### Color (per chapter)
Each scene has a `data-palette` attribute and a CSS gradient. End-of-chapter color matches start-of-next so the `.chapter-break` gradient between them is seamless. Don't break this rule when adding/changing scenes.

| # | Chapter | Palette role | Anchor color(s) |
|---|---------|--------------|-----------------|
| I | Genesis | pure black void w/ crimson sphere center | `#000` w/ `#ff5418` accent |
| II | Cryo | pure black + teal 3D grid + cyan beam | `#000` w/ `#0fffd0` accent |
| III | Philadelphia | crimson/vermilion sky → hot-pink fog → teal firs → black ridge (feverish memory, NOT literal dawn) | `#1a0608` end, vermilion mid, hot-pink (`#ff5a8a`) accent |
| IV | Find Me | near-black with phosphor-green HUD wash | `#000` w/ `#a8d088` and `#ff4a3a` alert |
| V | Choice | black void + magenta/blue plasma orb | `#000` w/ magenta + cobalt rim |

Chapter breaks (`.chapter-break`) all transition through black between non-black palettes — black is the connective tissue.

### Motion
- Sticky `.scene` inside `.chapter` (chapter is `position: relative`, scene is `position: sticky; top: 0; height: 100vh`).
- Each `.layer` translates by `progress * data-speed * vh / 100` where progress is `-scrollTop / (chapterHeight - vh)`.
- `data-offset` is a starting offset in vh.
- Smaller absolute speed = farther/slower (sky, sphere, distant grid). Larger absolute speed = closer/faster (foreground silhouettes, drone, ridges).
- Prose floats above with `z-index: 50` and a soft warm halo behind chapter heads in `.prose.light` chapters.
- CSS animations on top: `pulse-sphere`, `spin-rings`, `beam-pulse`, `fog-drift`, `orb-pulse`. Plus radar sweep, blip pulse, feed flicker, alert blink, scan-line sweep, eyes-flicker, halftone-shake.
- **Mobile keyframe overrides:** five animations (`spherePulseMobile`, `ringSpin1Mobile`, `beamPulseMobile`, `fogDriftMobile`, `orbPulseMobile`) replace their desktop counterparts inside the `@media (max-width: 720px)` block. Each bakes `var(--layer-scale) * var(--mobile-scale)` into every transform frame so the mobile static-scale composes with the animation instead of being clobbered.

### Shader rules (NEW in v23)
- **Title shader** uses **true alpha blending** (`gl.enable(gl.BLEND)`, `blendFuncSeparate`, luminance-as-alpha in fragment shader). NOT `mix-blend-mode: screen` — that was tried in v23 first round and produced a visible dark band where the canvas crossed into Ch I. The current approach: dark areas of the field are *transparent*, not *black*. If you ever swap the shader's `gl_FragColor` line back to `vec4(final, 1.0)`, you'll re-introduce the bar.
- All three shaders auto-disable on `prefers-reduced-motion`.
- Title + closing shaders run on mobile (lower DPR + 24fps cap). Sphere-aura also runs on mobile.
- Each shader pauses via IntersectionObserver when its host element is off-screen.

### Layout conventions
- 1600×900 viewBox for full-bleed scene layers (preserveAspectRatio xMidYMid slice).
- Bottom-anchored silhouette layers use viewBox heights ≤400 to avoid covering the full scene with dark fill.
- Foreground silhouettes: `bottom: 0` (or `-2vh` on mobile to prevent page bg revealing under scaled-up firs/ridge).
- Prose column max-width 680px, padding 0 32px (22px on mobile).
- **Genesis scene `::before` (top feather) is `display:none`** — removed in v23 because it created a hard dark band against the title shader's bottom bleed. Don't restore it.

### Mobile scaling system
- `:root { --mobile-scale: 1; }` master multiplier, set live by the Tweaks panel.
- Per-layer `--layer-scale` defined inside the mobile @media block, e.g. `.scene[data-palette="genesis"] .layer.pulse-sphere img { --layer-scale: 1.7; }`.
- Applied as `transform: scale(calc(var(--layer-scale, 1.4) * var(--mobile-scale)))` on `.scene .layer img`.
- For animated layers, mobile-only `@keyframes ___Mobile` variants exist that include the scale calc so they don't clobber it. **If you add a new transform-animated layer, you must also write a mobile keyframe override for it, or the static scale will disappear during animation.**

### Philadelphia legibility (v23 fix)
- On BOTH desktop and mobile, `.chapter:has(.scene[data-palette="philadelphia"]) .prose.light` is forced to warm cream `#fff2dc` with a strong drop shadow. Originally this was mobile-only — but on desktop the same issue happens (dark text becomes invisible on dark ridge / black floor). Don't remove the desktop rule.

## Constraints & preferences
- **Tone:** literary, restrained, no marketing copy, no emoji, no cute icons, no gradient buttons.
- **No filler:** every section must earn its place. Don't pad.
- The user cares deeply about **art direction matching the inspiration imagery** (`uploads/artdirection_inspiration/`) — the "ada_*", "city_*", "find_me_*", "orb_*" reference images set the look.
- Avoid: emoji, generic "tech site" gradients, AI-slop iconography, drawing photographs in SVG.
- Match the manuscript's structure exactly — five acts divided by `* * *`. Don't invent chapter divisions or paraphrase prose.

## Workflow & deployment (important — read this)
The user works between three environments:
1. **Claude Design (this project)** — the source of truth for design/code edits. Cannot push to GitHub directly (read/import only).
2. **Claude Code Desktop** on the user's Mac at `/Users/demetrearges/Desktop/My Stuff/_GitPersonal/projects/prohairesis/` — handles git commits and pushes.
3. **GitHub repo** `demetrearges206/prohairesis` (default branch `main`) — auto-deploys to GitHub Pages.

**Edit → deploy flow:**
1. Edit files here in Claude Design.
2. Copy changed files into `_handoff/` (use `copy_files`). Always include EVERY file the user needs to drop in — never assume they kept the previous handoff.
3. Call `present_fs_item_for_download` on `_handoff` so the user gets a zip.
4. User unzips, drops files into the local prohairesis folder, replacing originals.
5. User tells Claude Code "commit and push" with a one-line message describing the change.
6. GitHub Pages rebuilds in ~30s.

**Always remind the user to hard-clear mobile cache after a deploy** — Safari/Chrome on iOS aggressively cache CSS even with `?v=N` bumps. The `?bust=999` URL query trick works in a pinch.

**There is no undo system.** Each `str_replace_edit` is destructive. The only real rollback is `git revert` on the user's local machine. Before risky multi-file changes, copy current state into `_snapshots/<name>/` so we can manually restore.

## Open threads / next steps
- **Round 2: replace Ch II–V prose with manuscript verbatim** — Ch I has real text, II–V do not yet. Source of truth: `manuscript.txt` (or `uploads/PROHAIRESIS.docx` if extraction needs to be redone).
- **Mobile chapter jump shortcut** — the desktop TOC is `display: none` on mobile. Need a small ⋯/dots menu so phone readers can jump between chapters. Not yet implemented.
- **In-page Tweaks button on mobile** — Tweaks panel currently only opens via the design-tool toolbar (only visible inside Claude Design). For the deployed site, need a permanent in-page button (e.g. small gear icon, fixed bottom-right) to toggle the panel. Not yet implemented.
- **I-rings rotation broken on mobile** — user reported the rings don't rotate on mobile after a recent update. Likely cause: `ringSpin1Mobile` uses `var(--layer-scale)` but the spin-rings layer's specificity may not be picking it up correctly, collapsing the calc. Needs investigation.
- **II-grid edges still feel wrong on mobile** — user says the bottom is still cut off harshly; the top fade became too aggressive on mobile. Need separate desktop and mobile values for `.scene[data-palette="cryo"]::before/::after` heights. Possibly the scaled-up grid simply outruns the fade band; consider extending the SVG content rather than the CSS gradient.
- **II-eyes solid background** — user wants the harsh cyan/black background of `II-eyes.svg` softened so it bleeds into the cryo grid instead of cutting in. CSS gradient was added at the bottom of `.eyes-stage` but user may want the SVG itself edited to have a transparent/feathered background. **Ask before editing the SVG.**
- **Ch II → Ch III stray dark gradient** — user noticed a dark floor-like element appearing right after the last line of Ch II that doesn't feel needed. Investigate `.scene[data-palette="cryo"]::after` or `.chapter:has(.scene[data-palette="cryo"])::after` — likely overlap with `.chapter-break[data-from="cryo"][data-to="philadelphia"]`.
- **Re-bundle Prohairesis-standalone.html** at end of Round 2. Currently lags v23 by several rounds.
- **Noise grain overlay** removed because the inline SVG data-URL with `url(%23n)` filter ref tripped the bundler. To restore, encode without a fragment ref.
- **Halftone glitch** is currently single-purpose (Ch V disc-snap). Could reuse for Ch II eyes-intro.
- **HUD overlay text in Ch IV** is hand-authored static. Could randomize/animate values.
- **ada-eyes.jpg** — actual inspiration photograph in `assets/ada-eyes.jpg`, currently unused (the SVG stylization `II-eyes.svg` is what renders). User may prefer the photo; ask before swapping.

## File map
- `Prohairesis.html` — main entry, single page. Sections: chrome / opening / 5× chapters / closing. Currently loading `story.css?v=23`, `parallax.js?v=5`, `tweaks-panel.jsx?v=3`, `story-tweaks.jsx?v=5`, `title-shader.js?v=2`, `sphere-aura.js?v=2`, `closing-shader.js?v=2`.
- `Prohairesis-standalone.html` — bundled offline single-file deliverable (~2MB). **Lags current version — needs rebundle.**
- `story.css` — all styling. Sections: chrome, opening, scenes, palettes, prose, chapter break, closing, TOC, mobile (~140 lines incl. per-layer scale tokens, mobile keyframe overrides), chapter-specific overlays/animations.
- `parallax.js` — engine. Sizes chapters from prose height, applies layer transforms on scroll, drives TOC active state, triggers halftone glitch on `.flash` and `.shout.gentle` lines in Ch V.
- `title-shader.js` — title-screen WebGL flow-field shader (NEW in v23).
- `sphere-aura.js` — Ch I sphere aura shader (NEW in v23).
- `closing-shader.js` — closing plasma shader (NEW in v23).
- `story-tweaks.jsx` — Tweaks panel app. Text shadow, card opacity, parallax intensity, font pairing, grain, progress bar, mobile scene zoom, chapter jump.
- `tweaks-panel.jsx` — host protocol starter, do not modify.
- `assets/I-*.svg` — Genesis (sphere, rings, hex floor, embers, etc.).
- `assets/II-*.svg` — Cryo (grid, beam, dust, eyes, etc.).
- `assets/III-*.svg` — Philadelphia (sun, fog, firs, ridge, etc.).
- `assets/IV-hud.svg` — Find Me static HUD frame; animated overlay parts are in CSS.
- `assets/V-*.svg` — Choice (orb, rays, stars, etc.).
- `assets/halftone.svg` — dot-pattern glitch overlay for Ch V.
- `assets/ada-eyes.jpg` — original inspiration photo, currently unused.
- `manuscript.txt` — extracted plain-text manuscript, for copy lookups.
- `_handoff/` — staging folder for deploy zips. Contents are transient.
- `uploads/PROHAIRESIS.docx` — original manuscript.
- `uploads/artdirection_inspiration/` — reference imagery the art direction was built against.

## Gotchas
- **Bump `?v=N` query strings** on `story.css`, `parallax.js`, `story-tweaks.jsx`, `tweaks-panel.jsx`, `title-shader.js`, `sphere-aura.js`, `closing-shader.js` whenever you edit them — both the preview iframe AND deployed mobile browsers cache aggressively. Manual bump in `Prohairesis.html` only. Story.css is currently at v23.
- **Mobile cache is the #1 cause of "your fix didn't work" reports.** Always remind the user to hard-clear cache or use `?bust=999` in the URL after deploy.
- **`data-speed` is signed.** Negative = drifts UP as you scroll down (usual). Positive = drifts DOWN.
- **Sticky scene + chapter-end floor.** When a `.scene` reaches the end of its `.chapter`, it unsticks and rises with the scroll, taking bottom-anchored silhouettes with it. The `.chapter::after { bottom: 0; height: 60vh; }` floor catches them. Don't remove. **Philadelphia's floor is a gradient, not a solid** — fades vermilion→black so cream `.prose.light` text stays legible.
- **`.prose` is `z-index: 50`** (not 40). It must beat both `.chapter::after` (z-index: 1) and `.scene::before/::after` feathers (z-index: 30). Don't lower it.
- **HUD overlay positioning.** `.hud-overlay` is `position: sticky; top: 0; margin-top: -100vh` so it pins on top of the sticky scene above it in source order. Don't reorder its markup.
- **Eyes-intro Ch II.** `position: sticky` block, taller than 100vh. Keep `.eyes-intro` directly inside the chapter section, before the prose.
- **Mobile keyframe rule:** `transform`-based animations on a layer's `<img>` will override the static mobile scale UNLESS you write a mobile-specific keyframe variant that bakes the scale in. Five exist already (`spherePulseMobile`, `ringSpin1Mobile`, `beamPulseMobile`, `fogDriftMobile`, `orbPulseMobile`). Add more if you add new animated layers.
- **`<p class="flash">FLASH</p>` and `<p class="shout gentle">I snapped the disc...</p>`** are halftone-glitch trigger elements in Ch V. Don't rename or remove their classes — `parallax.js` looks them up at boot.
- **Chapter palettes are matched at boundaries.** If you swap a palette, also update both halves of the corresponding `.chapter-break` gradient stops.
- **SVG silhouettes:** keep their viewBox short (≤ ~400 height on a 1600 width canvas) when meant to be horizon-band foreground.
- **Manuscript fidelity:** Ch I prose is the actual published manuscript. Don't paraphrase. Ch II–V still need verbatim manuscript replacement (Round 2).
- **Standalone bundling:** `super_inline_html` chokes on `url(...#fragment)` references inside CSS data-URL SVGs. Also: the canonical export has no em-dash in its filename (`Prohairesis-standalone.html`).
- **Title shader uses true alpha blending, not mix-blend-mode.** See "Shader rules" above. Don't switch back to opaque alpha + screen blend — produces a dark bar at top of Ch I.
- **Genesis scene top feather (`.scene[data-palette="genesis"]::before`) is `display:none`.** Don't restore — title shader handles the transition.
- **Tweaks panel only visible inside Claude Design.** Not in the deployed site UI. If user wants on-device tweaking, add an in-page toggle button (open thread).

## How to start the next chat
The user will likely say "let's continue" or "Round 2." Before doing anything:
1. Read this CLAUDE.md fully.
2. Read `Prohairesis.html` to see current structure.
3. Check `manuscript.txt` for the verbatim Ch II–V text.
4. Confirm with the user whether they want to start Round 2 (Ch II–V prose) or address one of the open threads first (mobile TOC, I-rings rotation, II-grid fades, II-eyes background, etc).
5. Always stage handoff into `_handoff/` and remind user to clear mobile cache.
