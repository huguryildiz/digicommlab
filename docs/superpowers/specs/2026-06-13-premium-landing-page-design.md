# Premium Landing Page — "The Lab Instrument"

**Date:** 2026-06-13
**Status:** Approved (visual mockup validated) — ready for implementation plan
**Scope:** Replace the basic `src/pages/Home.tsx` with a premium-SaaS landing page, and
adopt a new platform-wide type system.

---

## 1. Goal

Turn the placeholder home page (a heading + a flat grid of module links) into a
distinctive, premium landing page that makes a digital-communications lab feel like a
product. The page leads with a **live signal** as its hero artifact (not a decorative
background) and presents the modules as a **bento grid where every tile runs its own
ambient mini-simulation**.

The mockup `/tmp/digicomm-landing-v2.html` is the approved visual reference. This spec
describes how to realize it as production React + TypeScript, isolated into small,
single-purpose units.

### Approved decisions (from brainstorming)
- **Layout:** "Instrument" concept (v2), not the signal_sim-style reference layout.
- **Narrative:** communications-pipeline framing (source → sample → code → modulate →
  channel → detect → sink).
- **Hero tone:** premium product.
- **Motion:** rich (reference-level), with `prefers-reduced-motion` honored.
- **Typography:** adopt **Fraunces + IBM Plex Sans + IBM Plex Mono** as the new
  platform-wide type system, replacing the locked Inter/Space Grotesk/JetBrains Mono
  trio. `tokens.css` and `CLAUDE.md` are updated; modules inherit automatically via tokens.

---

## 2. Aesthetic direction

**Concept: "The Lab Instrument."** Editorial-technical, dark, signal-forward. The one
memorable thing is a working oscilloscope in the hero.

- **Type system (new standard):**
  - Display / headings → **Fraunces** (high-contrast serif, optical sizing; the hero's
    gradient phrase is *italic*). Token `--font-head`.
  - Body / UI → **IBM Plex Sans**. Token `--font`.
  - Data / readouts / kickers / labels → **IBM Plex Mono**. Token `--mono`.
- **Color:** keep the existing neon-signal palette (it is semantically meaningful, not
  cliché): green = input/`--color-x`, blue = sampled/`--color-y`, orange =
  system/`--color-h`, pink = channel/`--color-marker`. No palette change.
- **Instrument screens stay dark in both themes.** The oscilloscope and tile vizzes
  render on a fixed deep-dark "screen" with the bright dark-theme neon trace colors,
  regardless of light/dark page theme — like a real scope with a dark display on a light
  desk. New token `--scope-bg` (deep dark) backs these canvases.
- **Texture/atmosphere:** layered radial neon halos on the page background + a faint
  masked dot-grid (already prototyped in the mockup), built from tokens.

---

## 3. Page architecture

The landing lives under `src/pages/landing/`. `Home.tsx` composes four sections; each
section is a focused component; the live visuals are isolated canvas components driven by
one shared ticker.

```
Home.tsx                      composes the page (no own top-nav; app shell provides nav)
└─ landing/
   ├─ Hero.tsx                left: eyebrow, headline, lead, CTAs, stat row
   │                          right: <Oscilloscope/>
   ├─ SignalChain.tsx         thin animated flow strip (SVG + traveling packet)
   ├─ ModuleBento.tsx         bento grid; maps over modules.config
   ├─ ModuleTile.tsx          one tile: id, title, desc, chapter, CTA, soon state, viz slot
   ├─ modules.config.ts       module metadata (single source of truth)
   ├─ useCanvasTicker.ts      shared rAF loop + reduced-motion + visibility/offscreen pause
   ├─ useThemeColors.ts       reads palette from CSS vars; re-reads on data-theme change
   ├─ viz/
   │  ├─ Oscilloscope.tsx     hero: noisy sine + sample stems + sweep + phosphor trail
   │  ├─ ConstellationViz.tsx flagship tile: 16-QAM grid jittering under Gaussian noise
   │  ├─ SamplingViz.tsx      sampling tile: continuous sine + sample-and-hold staircase
   │  ├─ EntropyViz.tsx       info-theory tile: animated probability/entropy bars
   │  └─ LinkPulseViz.tsx     end-to-end (soon) tile: faint enveloped pulse
   └─ landing.css             all landing styles (tokens only; no hardcoded hex/px)
```

### Component contracts (what each unit does / how used / depends on)
- **`modules.config.ts`** — exports `LANDING_MODULES: LandingModule[]` where
  `LandingModule = { id, titleKey, descKey, chapter, route, status: 'live'|'soon', viz?: VizKind, area }`.
  Single source of truth for tiles, the signal chain, and routing. Depends on i18n keys only.
- **`Hero`** — presentational; renders copy from `t()` and embeds `<Oscilloscope/>`.
  Depends on i18n + Oscilloscope. No state beyond what the canvas owns.
- **`SignalChain`** — presentational SVG; the traveling packet is animated via the shared
  ticker (or pure CSS keyframes if simpler). Depends on useCanvasTicker XOR CSS only.
- **`ModuleBento` / `ModuleTile`** — `ModuleBento` maps config → `ModuleTile`s and assigns
  CSS grid areas. `ModuleTile` renders a `<Link>` (live) or a non-interactive container
  (soon), plus the optional viz via a `viz` switch. Depends on config + react-router + viz.
- **`viz/*`** — each takes a `<canvas>` ref and a `draw(ctx, t, dpr, colors)` function;
  registers with `useCanvasTicker`. Pure drawing, no app state, `aria-hidden`. Depends only
  on useCanvasTicker + useThemeColors. **Not wired to `src/lib/dsp`** — these are ambient,
  representative visuals, deliberately decoupled from the real simulations.
- **`useCanvasTicker`** — registers draw callbacks into one `requestAnimationFrame` loop;
  exposes register/unregister. Honors `prefers-reduced-motion` (draws ONE static frame then
  stops) and pauses on `document.hidden` and when the section is offscreen
  (IntersectionObserver). Caps `devicePixelRatio` at 2.
- **`useThemeColors`** — returns the instrument palette (fixed dark-theme neon hexes for the
  screens) and reads page tokens via `getComputedStyle` where needed; subscribes to
  `documentElement` `data-theme` mutations so a light/dark toggle re-tints anything that
  should follow the theme.

---

## 4. Content, routing, i18n

- **Modules (pipeline order):**
  1. Sampling & Quantization — `/sampling` — CH 4·6 — **live** — viz: SamplingViz
  2. Information Theory — `/information-theory` — CH 6 — **live** — viz: EntropyViz
  3. Modulation & Detection — `/modulation` — CH 7 — **live** — viz: ConstellationViz (flagship)
  4. Baseband & Eye — `/baseband` — CH 8 — **soon** — no viz
  5. End-to-End Link — `/end-to-end` — All — **soon** — viz: LinkPulseViz
- **Bento areas:** flagship (Modulation) spans 2×2; Sampling + Info Theory stack to its
  right; Baseband (small) + End-to-End (wide) on the bottom row. Collapses to one column
  under 900px.
- **CTAs:** primary → `/sampling` ("Start with Sampling"); secondary → scroll to the bento
  ("Explore the link"). Signal-chain stops and live tiles are `<Link>`s; soon items are
  non-interactive and marked (`aria-disabled`, "SOON" pill).
- **Hero HUD readouts:** illustrative but kept physically honest — e.g. SQNR uses the real
  `6.02·n + 1.76` law (8-bit → 49.9 dB, per Proakis §6.6 / `docs/book-reference.md`). They
  are labeled as a live demo, not presented as an authoritative measurement, so this stays
  within the Book.pdf rule.
- **i18n:** add `landing.*` keys to `src/i18n/en.ts`; all visible copy goes through `t()`.
  The app is currently EN-only (no language switch wired) — **Turkish strings are out of
  scope** for this change.

---

## 5. Theme, accessibility, performance

- **Light theme parity:** page chrome (text, panels, borders) follows tokens and works in
  both themes. Instrument canvases keep their dark screen + dark-theme neon trace in both
  themes by design. Verify both themes visually.
- **Accessibility:** decorative canvases are `aria-hidden="true"`; tiles have real text and
  visible focus rings; color is never the only signal of "live vs soon" (text + pill +
  cursor). Headline/body contrast meets AA on the dark background.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, the ticker paints a single
  representative frame and does not loop; entrance animations are disabled (already in the
  mockup's media query).
- **Performance:** one shared rAF for all canvases; pause when tab hidden or section
  offscreen; DPR capped at 2. No layout thrash (canvases sized from their bounding box on
  mount + resize).

---

## 6. Type-system migration (platform-wide)

This is the higher-risk part — it changes a locked rule and affects every module.

- **`index.html`** — replace the Google Fonts `<link>` with Fraunces (`ital,opsz,wght`),
  IBM Plex Sans, IBM Plex Mono; update the comment.
- **`src/theme/tokens.css`** — set `--font` = IBM Plex Sans, `--font-head` = Fraunces,
  `--mono` = IBM Plex Mono; add `--scope-bg`. Keep all other tokens.
- **`src/theme/global.css`** — `font-optical-sizing: auto` for headings; ensure mono
  elements use `--mono`. The brand wordmark (`.app__brand`) overrides to `--font` (Plex
  Sans 700) so the techy compound name doesn't render as a serif.
- **`CLAUDE.md`** — rewrite the **UI / Design System → Tipografi** section to the new trio
  (Fraunces / IBM Plex Sans / IBM Plex Mono) so the project rule matches reality.
- **Inherited impact:** existing modules pull fonts from tokens, so headings become
  Fraunces and mono readouts become Plex Mono automatically. A light visual sanity pass of
  each module (Sampling, Modulation, Information Theory) is included; **deep per-module
  restyling is out of scope** (follow-up if desired).

---

## 7. Files

**Create**
- `src/pages/landing/Hero.tsx`, `SignalChain.tsx`, `ModuleBento.tsx`, `ModuleTile.tsx`
- `src/pages/landing/modules.config.ts`
- `src/pages/landing/useCanvasTicker.ts`, `useThemeColors.ts`
- `src/pages/landing/viz/Oscilloscope.tsx`, `ConstellationViz.tsx`, `SamplingViz.tsx`,
  `EntropyViz.tsx`, `LinkPulseViz.tsx`
- `src/pages/landing/landing.css`
- `src/pages/landing/Home.test.tsx` (smoke test)

**Modify**
- `src/pages/Home.tsx` (rewrite to compose the sections)
- `src/pages/pages.css` (drop old `.home*` rules superseded by `landing.css`)
- `index.html`, `src/theme/tokens.css`, `src/theme/global.css`, `src/app.css` (brand font),
  `src/i18n/en.ts`, `CLAUDE.md`

---

## 8. Testing & verification

- **Smoke test (`Home.test.tsx`, vitest + RTL):** renders the hero headline; renders 5
  module tiles; live tiles link to the correct routes; soon tiles are non-interactive and
  carry the "soon" marker; CTAs point to `/sampling` and the bento anchor.
- **Type/build:** `npm run build` (tsc --noEmit, strict, no `any`) and `npm run lint` pass.
- **Manual:** run `npm run dev`; verify hero scope + all tile vizzes animate, hover lifts
  work, layout collapses on mobile, light theme is correct, and
  `prefers-reduced-motion` stops the loops.
- DSP under `src/lib/dsp` is untouched; its existing tests must still pass.

---

## 9. Out of scope (YAGNI)

- Turkish / multi-language strings and a language switcher.
- Wiring landing vizzes to the real `src/lib/dsp` simulations (kept ambient on purpose).
- Deep per-module restyle for the new fonts (modules inherit tokens; revisit later).
- Theory pages, new module content, or any DSP changes.
