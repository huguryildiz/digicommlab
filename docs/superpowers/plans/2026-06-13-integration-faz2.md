# Faz 2 — Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **RUN ORDER:** This is the LAST phase. Run it only after **Faz 0** (shared DSP), the **Fourier module** plan, and the **Analog module** plan are all complete and merged to `master`. The Fourier/Analog module plans intentionally deferred all shared-file edits (`App.tsx`, `i18n/index.ts`, `modules.config.ts`, `ModuleTile.tsx`, `landing.css`) to this plan so the two parallel tracks never collide.

> **SHARED-CHECKOUT RULE (project memory):** Other agents work the same tree. Do this integration in an **isolated worktree off the merged `master`** (use superpowers:using-git-worktrees). Scope every commit with an explicit pathspec (`git add <paths> && git commit -- <paths>`); never bare `git commit`. Merge back to `master` only at the final green gate.

**Goal:** Wire the finished Fourier and Analog modules into the app shell — routes, navigation (Fourier·Analog first), i18n fragment merge, and landing-page cards — and verify the whole app builds, tests, and lints clean.

**Architecture:** Five shared files change. `i18n/index.ts` spreads the two module string fragments into the lookup dict; `i18n/en.ts` gains the two nav labels. `App.tsx` registers two routes and prepends two nav links. The landing config (`modules.config.ts`) gains two card entries and two new `VizKind`/`BentoArea` values; `ModuleTile.tsx` maps the new viz kinds to the module viz components; `landing.css` regrids the bento for seven tiles.

**Tech Stack:** React 18, react-router-dom (HashRouter), TypeScript strict, Vitest + @testing-library/react.

---

## Module export contracts (verified from the module plans)

The integration code below imports these EXACT names — confirmed against the Fourier/Analog plans:

| Symbol | Module | Notes |
|--------|--------|-------|
| `FourierModule` | `@/modules/fourier/FourierModule` | named fn export |
| `AnalogModule` | `@/modules/analog/AnalogModule` | named fn export |
| `fourier` | `@/i18n/fourier` | `export const fourier` (Record) |
| `analogDict` | `@/i18n/analog` | `export const analogDict` (Record) — note the different name |
| `FourierViz` | `@/pages/landing/viz/FourierViz` | named fn export |
| `AmFmViz` | `@/pages/landing/viz/AmFmViz` | named fn export |

---

## File Structure

- **Modify** `src/i18n/index.ts` — merge `fourier` + `analogDict` fragments into the lookup dict.
- **Modify** `src/i18n/en.ts` — add `nav.fourier`, `nav.analog` labels (app-shell strings live here, not in module fragments).
- **Modify** `src/App.tsx` — import both modules, prepend two nav entries, add two routes.
- **Modify** `src/pages/landing/modules.config.ts` — extend `VizKind` + `BentoArea`, add two `LANDING_MODULES` entries, renumber to book order.
- **Modify** `src/pages/landing/ModuleTile.tsx` — add `Viz` switch cases for the two new viz kinds.
- **Modify** `src/pages/landing/landing.css` — 7-tile bento grid + two new `.tile--*` placements.
- **Modify** `tests/i18n/i18n.test.ts` — assert every fragment key resolves through `t`.
- **Create** `tests/App.integration.test.tsx` — assert nav order + both routes render.
- **Create** `tests/pages/landing-config.test.ts` — assert both cards present and `live`.

---

## Task 1: Merge i18n fragments + nav labels

**Files:**
- Modify: `src/i18n/index.ts`
- Modify: `src/i18n/en.ts`
- Test: `tests/i18n/i18n.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/i18n/i18n.test.ts`:

```ts
import { fourier } from '@/i18n/fourier';
import { analogDict } from '@/i18n/analog';

describe('module i18n fragments are merged', () => {
  it('resolves the new nav labels', () => {
    expect(t('nav.fourier')).toBe('Fourier & Spectrum');
    expect(t('nav.analog')).toBe('Analog AM/FM');
  });

  it('resolves every Fourier fragment key', () => {
    for (const k of Object.keys(fourier)) expect(t(k)).toBe(fourier[k]);
  });

  it('resolves every Analog fragment key', () => {
    for (const k of Object.keys(analogDict)) expect(t(k)).toBe(analogDict[k]);
  });
});
```

(If `tests/i18n/i18n.test.ts` does not already import `t`, add `import { t } from '@/i18n';` at the top.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/i18n/i18n.test.ts`
Expected: FAIL — `t('nav.fourier')` returns the key `'nav.fourier'` (fragments not merged yet).

- [ ] **Step 3: Write minimal implementation**

Replace `src/i18n/index.ts` with:

```ts
import { en } from './en';
import { fourier } from './fourier';
import { analogDict } from './analog';

const dict: Record<string, string> = { ...en, ...fourier, ...analogDict };

/** Translate a key. Falls back to the key itself if missing. */
export function t(key: string): string {
  return dict[key] ?? key;
}
```

Add to `src/i18n/en.ts` (inside the `en` object, next to the other `nav.*` entries):

```ts
  'nav.fourier': 'Fourier & Spectrum',
  'nav.analog': 'Analog AM/FM',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/i18n/i18n.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/index.ts src/i18n/en.ts tests/i18n/i18n.test.ts
git commit -- src/i18n/index.ts src/i18n/en.ts tests/i18n/i18n.test.ts \
  -m "feat(i18n): merge fourier+analog string fragments, add nav labels"
```

---

## Task 2: Routes + navigation order

**Files:**
- Modify: `src/App.tsx`
- Test: `tests/App.integration.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/App.integration.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';

describe('App navigation', () => {
  it('shows Fourier and Analog nav links before Sampling', () => {
    render(<App />);
    const links = screen.getAllByRole('link').map((a) => a.textContent);
    const iFourier = links.indexOf('Fourier & Spectrum');
    const iAnalog = links.indexOf('Analog AM/FM');
    const iSampling = links.indexOf('Sampling & Quantization');
    expect(iFourier).toBeGreaterThanOrEqual(0);
    expect(iAnalog).toBeGreaterThan(iFourier);
    expect(iSampling).toBeGreaterThan(iAnalog);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/App.integration.test.tsx`
Expected: FAIL — `indexOf('Fourier & Spectrum')` is `-1`.

- [ ] **Step 3: Write minimal implementation**

In `src/App.tsx`, add imports next to the other module imports:

```tsx
import { FourierModule } from '@/modules/fourier/FourierModule';
import { AnalogModule } from '@/modules/analog/AnalogModule';
```

Prepend the two entries to the `NAV` array (they must come first):

```tsx
const NAV = [
  { to: '/fourier', key: 'nav.fourier' },
  { to: '/analog', key: 'nav.analog' },
  { to: '/sampling', key: 'nav.sampling' },
  { to: '/modulation', key: 'nav.modulation' },
  { to: '/baseband', key: 'nav.baseband' },
  { to: '/information-theory', key: 'nav.infotheory' },
  { to: '/end-to-end', key: 'nav.endToEnd' },
];
```

Add the two routes inside `<Routes>` (next to the existing module routes):

```tsx
          <Route path="/fourier" element={<FourierModule />} />
          <Route path="/analog" element={<AnalogModule />} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/App.integration.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx tests/App.integration.test.tsx
git commit -- src/App.tsx tests/App.integration.test.tsx \
  -m "feat(app): register /fourier and /analog routes, nav first"
```

---

## Task 3: Landing config + viz wiring

**Files:**
- Modify: `src/pages/landing/modules.config.ts`
- Modify: `src/pages/landing/ModuleTile.tsx`
- Test: `tests/pages/landing-config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/pages/landing-config.test.ts
import { describe, it, expect } from 'vitest';
import { LANDING_MODULES } from '@/pages/landing/modules.config';

describe('landing modules', () => {
  it('includes live Fourier and Analog cards routed correctly', () => {
    const fourier = LANDING_MODULES.find((m) => m.id === 'fourier');
    const analog = LANDING_MODULES.find((m) => m.id === 'analog');
    expect(fourier).toMatchObject({ route: '/fourier', status: 'live', chapter: 'CH 2' });
    expect(analog).toMatchObject({ route: '/analog', status: 'live', chapter: 'CH 3' });
  });

  it('orders Fourier and Analog first', () => {
    expect(LANDING_MODULES[0].id).toBe('fourier');
    expect(LANDING_MODULES[1].id).toBe('analog');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pages/landing-config.test.ts`
Expected: FAIL — no module with `id === 'fourier'`.

- [ ] **Step 3: Write minimal implementation**

In `src/pages/landing/modules.config.ts`, extend the two union types:

```ts
export type VizKind = 'constellation' | 'sampling' | 'entropy' | 'linkpulse' | 'fourier' | 'amfm';
export type BentoArea = 'mod' | 'samp' | 'info' | 'base' | 'e2e' | 'four' | 'anlg';
```

Prepend two entries to `LANDING_MODULES` and renumber the existing ones to book order (`num` only — ids/routes unchanged):

```ts
  {
    id: 'fourier',
    num: '01',
    titleKey: 'landing.mod.fourier.title',
    descKey: 'landing.mod.fourier.desc',
    chapter: 'CH 2',
    route: '/fourier',
    status: 'live',
    area: 'four',
    viz: 'fourier',
    compact: true,
  },
  {
    id: 'analog',
    num: '02',
    titleKey: 'landing.mod.analog.title',
    descKey: 'landing.mod.analog.desc',
    chapter: 'CH 3',
    route: '/analog',
    status: 'live',
    area: 'anlg',
    viz: 'amfm',
    compact: true,
  },
```

Renumber the existing entries: `sampling` → `'03'`, `infotheory` → `'04'`, `modulation` → `'05'`, `baseband` → `'06'`, `end-to-end` → `'07'`.

> The landing card titles/descs (`landing.mod.fourier.*`, `landing.mod.analog.*`) are provided by the module i18n fragments (`fourier`/`analogDict`) merged in Task 1. If a fragment is missing one, add it to that fragment file and re-run Task 1's test.

In `src/pages/landing/ModuleTile.tsx`, add imports and switch cases to the `Viz` component:

```tsx
import { FourierViz } from './viz/FourierViz';
import { AmFmViz } from './viz/AmFmViz';
```

```tsx
    case 'fourier':
      return <FourierViz />;
    case 'amfm':
      return <AmFmViz />;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pages/landing-config.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/landing/modules.config.ts src/pages/landing/ModuleTile.tsx tests/pages/landing-config.test.ts
git commit -- src/pages/landing/modules.config.ts src/pages/landing/ModuleTile.tsx tests/pages/landing-config.test.ts \
  -m "feat(landing): add Fourier+Analog cards and viz wiring"
```

---

## Task 4: Bento grid for seven tiles

**Files:**
- Modify: `src/pages/landing/landing.css`

(No unit test — visual layout. Verified manually in Task 5.)

- [ ] **Step 1: Update the grid template**

In `src/pages/landing/landing.css`, replace the `.bento` `grid-template-areas` block:

```css
  grid-template-areas:
    'four four anlg anlg'
    'mod mod samp info'
    'mod mod base e2e';
```

Change the `.bento` column count to four (find the `grid-template-columns` on `.bento` and set it to `repeat(4, 1fr)`; if it currently uses a 3-column value, replace that value).

- [ ] **Step 2: Add the two new tile placements**

Next to the existing `.tile--mod { grid-area: mod; }` rules, add:

```css
.tile--four {
  grid-area: four;
}
.tile--anlg {
  grid-area: anlg;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/landing/landing.css
git commit -- src/pages/landing/landing.css \
  -m "style(landing): 7-tile bento grid with Fourier+Analog on top row"
```

> Layout note: this places the two foundational modules across the top row. The exact bento aesthetic is adjustable — if the user wants a different arrangement, only `grid-template-areas` + the responsive override (`@media` block near line 654) need editing.

---

## Task 5: Final green gate + merge

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: PASS — all existing + new (`fft`, `window`, `signals`, `fourier`, `analog`, model, module, integration, i18n, landing-config) tests green.

- [ ] **Step 2: Typecheck + lint**

Run: `npm run build` then `npm run lint`
Expected: no TypeScript errors (every `VizKind`/`BentoArea` switch is exhaustive; no `any`), zero lint warnings.

- [ ] **Step 3: Manual smoke**

Run: `npm run dev`, then in the browser:
- Landing shows seven cards; Fourier (01) and Analog (02) render their viz on the top row.
- Nav lists **Fourier & Spectrum** and **Analog AM/FM** first; each opens a page with five panels.
- Toggle dark/light — both new modules read colors from tokens (no hard-coded colors).

- [ ] **Step 4: Merge to master**

After the gate is green, merge the integration worktree into `master` (fast-forward or a single merge commit). The two new modules are now live.

---

## Self-Review

- **Spec coverage:** Implements spec §5 (Entegrasyon) in full — `App.tsx` routes+nav (Fourier·Analog first, per user), `i18n/index.ts` fragment merge, `modules.config.ts` cards. Adds the two pieces the spec implied but didn't enumerate: the `ModuleTile.tsx` viz switch and the `landing.css` regrid (both required for the cards to actually render).
- **Placeholder scan:** No TBD/TODO. Every step has concrete code, exact run commands, and expected output.
- **Type consistency:** Imports match the module plans' exact exports — `fourier` vs `analogDict` (different names, handled), `FourierModule`/`AnalogModule`, `FourierViz`/`AmFmViz`. New `VizKind` values `'fourier'`/`'amfm'` match the `viz` fields in the card entries and the `ModuleTile` switch cases. New `BentoArea` values `'four'`/`'anlg'` match the `area` fields and the `.tile--four`/`.tile--anlg` CSS.
- **Dependency order:** Explicitly gated on Faz 0 + both module plans merged; scoped commits + worktree per shared-checkout rule.
