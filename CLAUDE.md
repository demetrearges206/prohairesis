# Prohairesis — project notes

## Project goal
A long-form parallax scrolling web experience that presents Julian Arges's short story **PROHAIRESIS** (a 5-act sci-fi piece about Dr. Ada Lance, the Helios IV generation ship, and a fractured AI). Each act becomes a chapter with its own custom parallax scene built from layered SVGs. Audience is the writer (Julian) plus a small circle of literary/tech-adjacent readers — this is a portfolio-quality reading experience, not a marketing site. Single deliverable: an offline-capable HTML file.

## Current state
- All five chapters are wired up in `Prohairesis.html` with the real manuscript prose (extracted from `uploads/Prohairesis files/PROHAIRESIS.docx`).
- Parallax engine works (`parallax.js`) — sticky scenes, per-chapter auto-sizing from prose height, layered transforms based on scroll progress.
- Tweaks panel is wired up (`story-tweaks.jsx` + `tweaks-panel.jsx` starter).
- Custom SVG art direction is complete for all 5 chapters and matches the inspiration imagery the user uploaded (`uploads/artdirection_inspiration/`).
- Bonus effects: a sticky `ada_eyes` cinematic intro at the top of Ch II with cyan HUD scan + glitch flicker; full mission-control HUD overlay in Ch IV (radar with sweep, telemetry, camera-feed grid, pulsing red alert); halftone glitch overlay in Ch V that triggers when the disc-snap moment crosses viewport center.
- Chapter-end "floor" fix is in place: each `.chapter::after` paints a solid bottom band matching the scene-end color so silhouettes don't "creep up" off the page background as the sticky scene unsticks.
- Mobile responsive rules are in (`@media max-width: 720px`) — TOC hidden, HUD shrunk, type scaled, prose padding tightened.
- Standalone bundled output exists: `Prohairesis-standalone.html` (≈2MB, fully offline, all SVGs + Google Fonts inlined). Em-dash filenames cause download issues on some clients, so the no-dash version is the canonical export.

## Design system & decisions

### Type
- **Fraunces** (display serif, italic + roman) for headings, chapter titles, lede, blockquotes. Picked for the literary tone + warm character; resists the "AI slop serif" feel.
- **Inter Tight** for body prose. Tight optical for tight-set columns.
- **JetBrains Mono** for terminal lines, telemetry, HUD readouts, the `<term>` / `<query>` / `.shout` styles, chrome counter, TOC labels.
- Tried Fraunces for body — too wide-set for the column. Tried system serif — felt generic. Don't go back.

### Color (per chapter)
Each scene has a `data-palette` attribute and a CSS gradient. End-of-chapter color matches start-of-next so the `.chapter-break` gradient between them is seamless. Don't break this rule when adding/changing scenes — chapter breaks are gradients between two stops authored in CSS based on scene-end and next-scene-start.

| # | Chapter | Palette role | Anchor color(s) |
|---|---------|--------------|-----------------|
| I | I Am God | pure black void w/ crimson sphere center | `#000` w/ `#ff5418` accent |
| II | Cryo | pure black + teal 3D grid + cyan beam | `#000` w/ `#0fffd0` accent |
| III | Philadelphia | crimson/vermilion sky → hot-pink fog → teal firs → black ridge (feverish memory, NOT literal dawn) | `#1a0608` end, vermilion mid, hot-pink (`#ff5a8a`) accent |
| IV | Find Me | near-black with phosphor-green HUD wash | `#000` w/ `#a8d088` and `#ff4a3a` alert |
| V | Choice | black void + magenta/blue plasma orb | `#000` w/ magenta + cobalt rim |

Chapter breaks (`.chapter-break`) all transition through black between non-black palettes — black is the connective tissue, not the absence of design.

### Motion
- Sticky `.scene` inside `.chapter` (chapter is `position: relative`, scene is `position: sticky; top: 0; height: 100vh`).
- Each `.layer` translates by `progress * data-speed * vh / 100` where progress is `-scrollTop / (chapterHeight - vh)`. So `data-speed="-22"` means the layer drifts up by 22% of viewport height across the full chapter.
- `data-offset` is a starting offset in vh.
- Smaller absolute speed = farther/slower (sky, sphere, distant grid). Larger absolute speed = closer/faster (foreground silhouettes, drone, ridges).
- Prose floats above with `z-index: 40` and a soft halo behind chapter heads (`prose.light .chapter-head::before`) for legibility over busy backgrounds.
- A few CSS animations layer on top: `pulse-sphere`, `spin-rings`, `beam-pulse`, `fog-drift`, `orb-pulse`. Plus radar sweep, blip pulse, feed flicker, alert blink, scan-line sweep, eyes-flicker, halftone-shake.

### Layout conventions
- 1600×900 viewBox for full-bleed scene layers (preserveAspectRatio xMidYMid slice).
- Bottom-anchored silhouette layers use viewBox heights ≤400 to avoid covering the full scene with dark fill (this was the Philadelphia "wall of brown" bug — keep silhouette SVGs short so they read as horizon strips).
- Foreground silhouettes: `bottom: 0` or small negative bottom. The `.chapter::after` solid floor is what catches "creep-up" — don't remove it.
- Prose column max-width 680px, padding 0 36px (22px on mobile).

## Constraints & preferences
- **Tone:** literary, restrained, no marketing copy, no emoji, no cute icons, no gradient buttons.
- **No filler:** every section must earn its place. Don't pad.
- The user (Julian or the project owner) cares about **art direction matching the inspiration imagery** (`uploads/artdirection_inspiration/`). The five "ada_*", "city_*", "find_me_*", "orb_*", and other reference images set the look.
- Avoid: emoji, generic "tech site" gradients, AI-slop iconography, drawing photographs in SVG (use placeholders or stylized graphic moments instead).
- Match the manuscript's structure exactly — five acts divided by `* * *`. Don't invent chapter divisions.

## Open threads / next steps
- **Standalone download** — em-dash in filename caused download failures on some browsers. Canonical export is `Prohairesis-standalone.html` (no dash). If re-bundling, write to that path.
- **Noise grain overlay** removed from `.grain` because the inline SVG data-URL with `url(%23n)` filter ref tripped the bundler. If we want grain back, encode the SVG without a fragment ref (use a blob URL injected at runtime, or PNG noise).
- Halftone glitch effect is currently single-purpose (Ch V disc-snap). Could be reused for the Ch II eyes-intro transition if user wants more glitch moments.
- HUD overlay text in Ch IV is hand-authored static. Could randomize/animate values for more "alive" feel.
- ada_eyes scene currently uses an SVG stylization (`II-eyes.svg`). The actual photograph (`assets/ada-eyes.jpg`) is in the project but unused; user may prefer the photo over the stylization — ask before swapping.

## File map
- `Prohairesis.html` — main entry, single page. Sections: chrome / opening / 5× chapters / closing.
- `Prohairesis-standalone.html` — bundled offline single-file deliverable.
- `story.css` — all styling. Sections in order: chrome, opening, scenes, palettes, prose, chapter break, closing, TOC, mobile, **chapter-specific overlays/animations** (added later — sphere pulse, ring spin, beam pulse, eyes-intro, fog drift, HUD overlay, orb pulse, halftone overlay).
- `parallax.js` — engine. Sizes chapters from prose height, applies layer transforms on scroll, drives TOC active state, triggers halftone glitch on `.flash` and `.shout.gentle` lines in Ch V.
- `story-tweaks.jsx` — Tweaks panel app. Type/shadow/scroll/chapter-jump controls.
- `tweaks-panel.jsx` — host protocol starter, do not modify.
- `assets/I-*.svg` — Genesis chapter (sphere, rings, hex floor, embers).
- `assets/II-*.svg` — Cryo (grid, beam, dust, eyes).
- `assets/III-*.svg` — Philadelphia (sun, fog, firs, ridge).
- `assets/IV-hud.svg` — Find Me static HUD frame; the animated overlay parts are in CSS not SVG.
- `assets/V-*.svg` — Choice (orb, rays, stars).
- `assets/halftone.svg` — generated dot-pattern glitch overlay for Ch V.
- `assets/ada-eyes.jpg` — original inspiration photo, currently unused (see open threads).
- `manuscript.txt` — extracted plain-text manuscript from the docx, for reference/copy lookups.
- `uploads/Prohairesis files/PROHAIRESIS.docx` — original manuscript.
- `uploads/artdirection_inspiration/` — reference imagery the art direction was built against.

## Gotchas
- **Bump `?v=N` query strings** on `story.css`, `parallax.js`, `story-tweaks.jsx` whenever you edit them — the verifier and preview iframe aggressively cache. There's no automated bump; do it manually in `Prohairesis.html`.
- **`data-speed` is signed.** Negative = layer drifts UP as you scroll down (the usual case). Positive = layer drifts DOWN. Don't accidentally flip signs.
- **Sticky scene + chapter-end floor.** When a sticky `.scene` reaches the end of its `.chapter` parent, it unsticks and rises with the scroll, taking its bottom-anchored silhouettes with it. The fix is `.chapter::after { bottom: 0; height: 60vh; background: <scene-end-color>; }` per palette. Don't remove these; they're load-bearing.
- **HUD overlay positioning.** `.hud-overlay` is `position: sticky; top: 0; margin-top: -100vh` so it pins on top of the sticky scene above it in source order. If you move the markup, the negative margin breaks.
- **Eye-intro chapter II.** It's a `position: sticky` block of its own, taller than 100vh, so the cinematic moment lingers as the user scrolls in, then is left behind. If you re-order Ch II markup, keep `.eyes-intro` directly inside the chapter section, before the prose.
- **`<p class="flash">FLASH</p>` and `<p class="shout gentle">I snapped the disc...</p>`** are the trigger elements for the halftone glitch in Ch V. Don't rename their classes or remove them — `parallax.js` looks them up by selector at boot.
- **Chapter palettes are matched at boundaries.** If you swap a palette, also update both halves of the corresponding `.chapter-break` gradient stops.
- **SVG silhouettes:** keep their viewBox short (≤ ~400 height on a 1600 width canvas) when they're meant to be horizon-band foreground layers. A 1600×900 silhouette will fill the full scene with dark fill and tank readability.
- **Manuscript fidelity:** the prose in `Prohairesis.html` is the actual published manuscript. Don't paraphrase or "improve" it — only restructure markup.
- **Standalone bundling:** `super_inline_html` chokes on `url(...#fragment)` references inside CSS data-URL SVGs. If you add such references back, expect a bundler error like `asset not found: %23n`.
