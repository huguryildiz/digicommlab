# DigiCommLab Phase 0 — Infrastructure & Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the DigiCommLab project skeleton — a deployable React + TypeScript app shell with navigation, theming, shared control/plot/simulation primitives, the DSP math foundation, tests, and GitHub Pages CI — so subsequent phases can drop in feature modules.

**Architecture:** Vite + React 18 + TypeScript. A decoupled pure-TS DSP/utility layer (`src/lib`) is unit-tested with Vitest; React components and views consume it. Routing via HashRouter (GitHub Pages friendly). Custom Canvas/SVG rendering (no charting library). A shared simulation-loop engine powers later live demos.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Vitest, react-router-dom 6 (HashRouter), KaTeX, ESLint + Prettier, GitHub Actions → GitHub Pages.

> **This is Plan 1 of 6.** Phases 1–5 (Sampling, Modulation, Huffman, Baseband, End-to-End) get their own plans written after this phase is executed, so they reflect the exact primitive APIs created here. Spec: `docs/superpowers/specs/2026-06-13-digicommlab-design.md`.

> **Conventions:** TDD for pure logic in `src/lib/dsp` and `src/lib/sim` (write the failing test first). Config files and presentational React components are created directly then verified by build/lint. Commit after every task. Run all commands from the repo root `/Users/huguryildiz/Documents/GitHub/digital-communications`.

---

## File Structure (Phase 0)

```
package.json                         # deps + scripts
vite.config.ts                       # Vite + Vitest config, base: './'
tsconfig.json                        # strict TS
index.html                           # SPA entry
.eslintrc.cjs  .prettierrc           # lint/format
.github/workflows/deploy.yml         # build+test+deploy to Pages
README.md
src/
├─ main.tsx                          # React mount
├─ vite-env.d.ts
├─ App.tsx                           # AppShell + HashRouter + routes
├─ test/setup.ts                     # vitest jsdom setup
├─ theme/ tokens.css  global.css
├─ i18n/ index.ts  en.ts             # t() + English dictionary
├─ lib/
│  ├─ dsp/ math.ts                   # erf/erfc/qfunc/clamp/linspace (TDD)
│  ├─ plot/ draw.ts  Canvas.tsx      # linScale + draw helpers (TDD on scale); canvas wrapper
│  └─ sim/ sources.ts  useSimulationLoop.ts  # bit sources (TDD); rAF loop
├─ components/
│  ├─ Slider.tsx Toggle.tsx Select.tsx NumberInput.tsx
│  ├─ Formula.tsx Readout.tsx Panel.tsx TheoryBox.tsx TransportControls.tsx
│  └─ index.ts
├─ pages/ Home.tsx  ModulePlaceholder.tsx
tests/                               # vitest specs mirror src/lib
├─ dsp/ math.test.ts
├─ plot/ draw.test.ts
├─ sim/ sources.test.ts
└─ i18n/ i18n.test.ts
```

---

## Task 1: Initialize package.json and install dependencies

**Files:**
- Create: `package.json`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "digicommlab",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "description": "EE413 Interactive Digital Communications Lab",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint . --max-warnings 0",
    "format": "prettier --write ."
  },
  "dependencies": {
    "katex": "^0.16.11",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@types/katex": "^0.16.7",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^8.8.0",
    "@typescript-eslint/parser": "^8.8.0",
    "@vitejs/plugin-react": "^4.3.2",
    "eslint": "^8.57.1",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-react-refresh": "^0.4.12",
    "jsdom": "^25.0.1",
    "prettier": "^3.3.3",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vitest": "^2.1.2"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created; a `package-lock.json` is written; no error exit.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: initialize package.json and install dependencies"
```

---

## Task 2: TypeScript and Vite/Vitest configuration

**Files:**
- Create: `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `src/vite-env.d.ts`, `src/test/setup.ts`

- [ ] **Step 1: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 2: Create `vite.config.ts`** (note `base: './'` makes assets relative — works on GitHub Pages without hardcoding the repo name; ESM-safe alias via `import.meta.url`)

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 3: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 4: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json vite.config.ts src/vite-env.d.ts src/test/setup.ts
git commit -m "chore: add TypeScript, Vite, and Vitest configuration"
```

---

## Task 3: HTML entry, React mount, and minimal App (verify it runs)

**Files:**
- Create: `index.html`, `src/main.tsx`, `src/App.tsx` (temporary minimal version, replaced in Task 11)

- [ ] **Step 1: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DigiCommLab — EE413 Interactive Digital Communications Lab</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Create temporary `src/App.tsx`**

```tsx
export default function App() {
  return <h1>DigiCommLab</h1>;
}
```

- [ ] **Step 4: Verify the build succeeds**

Run: `npm run build`
Expected: `tsc --noEmit` passes with no errors; Vite writes `dist/` with no error exit.

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.tsx src/App.tsx
git commit -m "feat: add HTML entry and minimal React app"
```

---

## Task 4: ESLint and Prettier configuration

**Files:**
- Create: `.eslintrc.cjs`, `.prettierrc`, `.eslintignore`

- [ ] **Step 1: Create `.eslintrc.cjs`**

```cjs
module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  },
};
```

- [ ] **Step 2: Create `.eslintignore`**

```
dist
node_modules
coverage
```

- [ ] **Step 3: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 4: Verify lint runs**

Run: `npm run lint`
Expected: completes with exit code 0 (no errors) on the current minimal source.

- [ ] **Step 5: Commit**

```bash
git add .eslintrc.cjs .eslintignore .prettierrc
git commit -m "chore: add ESLint and Prettier configuration"
```

---

## Task 5: Theme tokens and global CSS

**Files:**
- Create: `src/theme/tokens.css`, `src/theme/global.css`

- [ ] **Step 1: Create `src/theme/tokens.css`**

```css
:root {
  --bg: #0f1419;
  --surface: #1a212b;
  --surface-2: #232c38;
  --text: #e6edf3;
  --text-dim: #9aa7b4;
  --border: #2d3742;
  --accent: #4cc9f0;
  --accent-2: #f72585;
  --ok: #4ade80;
  --err: #f87171;
  --warn: #fbbf24;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --space-4: 24px;
  --space-5: 40px;
  --radius: 10px;
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --mono: 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
}

:root[data-theme='light'] {
  --bg: #f6f8fa;
  --surface: #ffffff;
  --surface-2: #eef2f6;
  --text: #11181c;
  --text-dim: #4b5563;
  --border: #d0d7de;
  --accent: #0969da;
  --accent-2: #cf222e;
}
```

- [ ] **Step 2: Create `src/theme/global.css`**

```css
@import './tokens.css';

* {
  box-sizing: border-box;
}
html,
body,
#root {
  height: 100%;
  margin: 0;
}
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  -webkit-font-smoothing: antialiased;
}
a {
  color: var(--accent);
  text-decoration: none;
}
h1,
h2,
h3 {
  margin: 0 0 var(--space-3);
}
button {
  font-family: inherit;
  cursor: pointer;
}
canvas {
  display: block;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/theme/tokens.css src/theme/global.css
git commit -m "feat: add theme tokens and global styles"
```

---

## Task 6: i18n scaffold (TDD)

**Files:**
- Create: `src/i18n/en.ts`, `src/i18n/index.ts`
- Test: `tests/i18n/i18n.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/i18n/i18n.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { t } from '@/i18n';

describe('t()', () => {
  it('returns the English string for a known key', () => {
    expect(t('app.title')).toBe('DigiCommLab');
  });

  it('falls back to the key itself when missing', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/i18n/i18n.test.ts`
Expected: FAIL — cannot resolve `@/i18n`.

- [ ] **Step 3: Create `src/i18n/en.ts`**

```ts
export const en: Record<string, string> = {
  'app.title': 'DigiCommLab',
  'app.subtitle': 'EE413 Interactive Digital Communications Lab',
  'nav.home': 'Home',
  'nav.sampling': 'Sampling & Quantization',
  'nav.modulation': 'Modulation & Detection',
  'nav.baseband': 'Baseband & Eye Diagram',
  'nav.huffman': 'Huffman & Entropy',
  'nav.endToEnd': 'End-to-End Link',
  'common.comingSoon': 'Coming soon.',
};
```

- [ ] **Step 4: Create `src/i18n/index.ts`**

```ts
import { en } from './en';

const dict: Record<string, string> = en;

/** Translate a key. Falls back to the key itself if missing. */
export function t(key: string): string {
  return dict[key] ?? key;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/i18n/i18n.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/i18n tests/i18n
git commit -m "feat: add i18n scaffold with t() fallback"
```

---

## Task 7: DSP math utilities (TDD)

**Files:**
- Create: `src/lib/dsp/math.ts`
- Test: `tests/dsp/math.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/dsp/math.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { erf, qfunc, clamp, linspace } from '@/lib/dsp/math';

describe('erf', () => {
  it('erf(0) is 0', () => {
    expect(erf(0)).toBeCloseTo(0, 6);
  });
  it('erf(1) ~= 0.842701', () => {
    expect(erf(1)).toBeCloseTo(0.842701, 4);
  });
  it('is odd: erf(-x) = -erf(x)', () => {
    expect(erf(-0.7)).toBeCloseTo(-erf(0.7), 6);
  });
});

describe('qfunc', () => {
  it('Q(0) = 0.5', () => {
    expect(qfunc(0)).toBeCloseTo(0.5, 6);
  });
  it('Q(1) ~= 0.158655', () => {
    expect(qfunc(1)).toBeCloseTo(0.158655, 4);
  });
  it('Q(2) ~= 0.022750', () => {
    expect(qfunc(2)).toBeCloseTo(0.02275, 4);
  });
});

describe('clamp', () => {
  it('clamps within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('linspace', () => {
  it('includes both endpoints', () => {
    expect(linspace(0, 1, 5)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
  it('handles n=1', () => {
    expect(linspace(2, 9, 1)).toEqual([2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/dsp/math.test.ts`
Expected: FAIL — cannot resolve `@/lib/dsp/math`.

- [ ] **Step 3: Create `src/lib/dsp/math.ts`**

```ts
/** Error function (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7). */
export function erf(x: number): number {
  const sign = Math.sign(x);
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** Complementary error function. */
export function erfc(x: number): number {
  return 1 - erf(x);
}

/** Gaussian tail probability Q(x) = P(X > x) for X ~ N(0,1). */
export function qfunc(x: number): number {
  return 0.5 * erfc(x / Math.SQRT2);
}

/** Constrain x to [lo, hi]. */
export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** n evenly spaced values from a to b inclusive (n>=1). */
export function linspace(a: number, b: number, n: number): number[] {
  if (n <= 1) return [a];
  const out = new Array<number>(n);
  const step = (b - a) / (n - 1);
  for (let i = 0; i < n; i++) out[i] = a + step * i;
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/dsp/math.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsp/math.ts tests/dsp/math.test.ts
git commit -m "feat: add DSP math utilities (erf, erfc, qfunc, clamp, linspace)"
```

---

## Task 8: Plot scale + draw helpers (TDD on scale) and Canvas wrapper

**Files:**
- Create: `src/lib/plot/draw.ts`, `src/lib/plot/Canvas.tsx`
- Test: `tests/plot/draw.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/plot/draw.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { linScale } from '@/lib/plot/draw';

describe('linScale', () => {
  it('maps domain endpoints to range endpoints', () => {
    const s = linScale([0, 1], [0, 100]);
    expect(s(0)).toBe(0);
    expect(s(1)).toBe(100);
    expect(s(0.5)).toBe(50);
  });
  it('supports inverted ranges (screen y grows downward)', () => {
    const s = linScale([0, 1], [100, 0]);
    expect(s(0)).toBe(100);
    expect(s(1)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/plot/draw.test.ts`
Expected: FAIL — cannot resolve `@/lib/plot/draw`.

- [ ] **Step 3: Create `src/lib/plot/draw.ts`**

```ts
export type Scale = (v: number) => number;

/** Linear scale mapping a domain interval to a range interval. */
export function linScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const m = (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * m;
}

export interface Axes {
  x: Scale;
  y: Scale;
}

/** Clear the canvas. */
export function clear(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
}

/** Draw x/y axes with a baseline at data y=0 if in range. */
export function drawAxes(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  domainX: [number, number],
  color = 'rgba(154,167,180,0.5)',
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const y0 = ax.y(0);
  ctx.beginPath();
  ctx.moveTo(ax.x(domainX[0]), y0);
  ctx.lineTo(ax.x(domainX[1]), y0);
  ctx.stroke();
}

/** Draw a polyline through (xs[i], ys[i]). */
export function drawLine(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  xs: number[],
  ys: number[],
  color: string,
  width = 2,
  dashed = false,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dashed ? [5, 4] : []);
  ctx.beginPath();
  for (let i = 0; i < xs.length; i++) {
    const px = ax.x(xs[i]);
    const py = ax.y(ys[i]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Draw stems (vertical lines from y=0) with dot heads — for sampled signals. */
export function drawStems(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  xs: number[],
  ys: number[],
  color: string,
  radius = 3,
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  const y0 = ax.y(0);
  for (let i = 0; i < xs.length; i++) {
    const px = ax.x(xs[i]);
    const py = ax.y(ys[i]);
    ctx.beginPath();
    ctx.moveTo(px, y0);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Draw a scatter of points. */
export function drawScatter(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  xs: number[],
  ys: number[],
  color: string,
  radius = 2,
): void {
  ctx.fillStyle = color;
  for (let i = 0; i < xs.length; i++) {
    ctx.beginPath();
    ctx.arc(ax.x(xs[i]), ax.y(ys[i]), radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Fill a rectangular data region (e.g. spectral overlap). */
export function shadeRegion(
  ctx: CanvasRenderingContext2D,
  ax: Axes,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  fill: string,
): void {
  const px = ax.x(x0);
  const py = ax.y(y1);
  ctx.fillStyle = fill;
  ctx.fillRect(px, py, ax.x(x1) - px, ax.y(y0) - py);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/plot/draw.test.ts`
Expected: PASS.

- [ ] **Step 5: Create `src/lib/plot/Canvas.tsx`** (DPR-aware canvas that re-draws on resize and dependency changes)

```tsx
import { useEffect, useRef } from 'react';

export interface CanvasProps {
  /** Draw callback; receives the 2D context and CSS-pixel width/height. */
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  /** Re-run draw whenever any dependency changes. */
  deps?: unknown[];
  height?: number;
  className?: string;
  ariaLabel?: string;
}

export function Canvas({ draw, deps = [], height = 240, className, ariaLabel }: CanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h);
    };

    render();
    const ro = new ResizeObserver(render);
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, ...deps]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ width: '100%' }}
    />
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/plot tests/plot
git commit -m "feat: add plot scale/draw helpers and DPR-aware Canvas wrapper"
```

---

## Task 9: Simulation bit sources (TDD) and animation-loop hook

**Files:**
- Create: `src/lib/sim/sources.ts`, `src/lib/sim/useSimulationLoop.ts`
- Test: `tests/sim/sources.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/sim/sources.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { textToBits, bitsToText, randomBitSource } from '@/lib/sim/sources';

describe('textToBits', () => {
  it("encodes 'A' (65) as 8 MSB-first bits", () => {
    expect(textToBits('A')).toEqual([0, 1, 0, 0, 0, 0, 0, 1]);
  });
});

describe('text <-> bits roundtrip', () => {
  it('recovers the original ASCII text', () => {
    const s = 'Hello, EE413!';
    expect(bitsToText(textToBits(s))).toBe(s);
  });
});

describe('randomBitSource', () => {
  it('is reproducible for a fixed seed', () => {
    const a = randomBitSource(42);
    const b = randomBitSource(42);
    const seqA = Array.from({ length: 16 }, () => a());
    const seqB = Array.from({ length: 16 }, () => b());
    expect(seqA).toEqual(seqB);
  });
  it('only emits 0 or 1', () => {
    const src = randomBitSource(7);
    for (let i = 0; i < 100; i++) {
      const bit = src();
      expect(bit === 0 || bit === 1).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/sim/sources.test.ts`
Expected: FAIL — cannot resolve `@/lib/sim/sources`.

- [ ] **Step 3: Create `src/lib/sim/sources.ts`**

```ts
export type Bit = 0 | 1;

/** Encode text as ASCII bytes, MSB-first, 8 bits per character. */
export function textToBits(text: string): Bit[] {
  const bits: Bit[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) & 0xff;
    for (let b = 7; b >= 0; b--) bits.push(((code >> b) & 1) as Bit);
  }
  return bits;
}

/** Decode MSB-first 8-bit groups back into text (trailing partial group ignored). */
export function bitsToText(bits: Bit[]): string {
  let s = '';
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let code = 0;
    for (let b = 0; b < 8; b++) code = (code << 1) | bits[i + b];
    s += String.fromCharCode(code);
  }
  return s;
}

/** mulberry32 — small deterministic PRNG returning floats in [0,1). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A reproducible Bernoulli(0.5) bit source. */
export function randomBitSource(seed = 1): () => Bit {
  const rng = makeRng(seed);
  return () => (rng() < 0.5 ? 0 : 1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/sim/sources.test.ts`
Expected: PASS.

- [ ] **Step 5: Create `src/lib/sim/useSimulationLoop.ts`** (requestAnimationFrame loop with play/pause/step/speed)

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SimLoop {
  running: boolean;
  speed: number;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  step: () => void;
  reset: () => void;
  setSpeed: (n: number) => void;
}

export interface SimLoopOptions {
  /** Logical ticks per second at speed = 1. */
  ticksPerSecond?: number;
  /** Called once per logical tick: (dt seconds, total sim seconds). */
  onTick: (dt: number, simTime: number) => void;
  /** Called when reset() is invoked. */
  onReset?: () => void;
}

export function useSimulationLoop({
  ticksPerSecond = 4,
  onTick,
  onReset,
}: SimLoopOptions): SimLoop {
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const accRef = useRef(0);
  const simTimeRef = useRef(0);
  const onTickRef = useRef(onTick);
  const speedRef = useRef(speed);
  onTickRef.current = onTick;
  speedRef.current = speed;

  const doTick = useCallback(() => {
    const dt = 1 / ticksPerSecond;
    simTimeRef.current += dt;
    onTickRef.current(dt, simTimeRef.current);
  }, [ticksPerSecond]);

  useEffect(() => {
    if (!running) return;
    const frame = (now: number) => {
      if (lastRef.current == null) lastRef.current = now;
      const elapsed = (now - lastRef.current) / 1000;
      lastRef.current = now;
      accRef.current += elapsed * speedRef.current;
      const interval = 1 / ticksPerSecond;
      while (accRef.current >= interval) {
        accRef.current -= interval;
        doTick();
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
    };
  }, [running, ticksPerSecond, doTick]);

  const start = useCallback(() => setRunning(true), []);
  const stop = useCallback(() => setRunning(false), []);
  const toggle = useCallback(() => setRunning((r) => !r), []);
  const step = useCallback(() => doTick(), [doTick]);
  const reset = useCallback(() => {
    setRunning(false);
    accRef.current = 0;
    simTimeRef.current = 0;
    lastRef.current = null;
    onReset?.();
  }, [onReset]);

  return { running, speed, start, stop, toggle, step, reset, setSpeed };
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/sim tests/sim
git commit -m "feat: add simulation bit sources and animation-loop hook"
```

---

## Task 10: Shared UI components

**Files:**
- Create: `src/components/Slider.tsx`, `Toggle.tsx`, `Select.tsx`, `NumberInput.tsx`, `Formula.tsx`, `Readout.tsx`, `Panel.tsx`, `TheoryBox.tsx`, `TransportControls.tsx`, `index.ts`
- Create: `src/components/components.css`

- [ ] **Step 1: Create `src/components/Slider.tsx`**

```tsx
export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

export function Slider({ label, value, min, max, step = 1, unit, onChange }: SliderProps) {
  return (
    <label className="ctl-slider">
      <span className="ctl-slider__row">
        <span>{label}</span>
        <span className="ctl-slider__val">
          {value}
          {unit ? ` ${unit}` : ''}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
```

- [ ] **Step 2: Create `src/components/Toggle.tsx`**

```tsx
export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="ctl-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
```

- [ ] **Step 3: Create `src/components/Select.tsx`**

```tsx
export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
}

export function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  return (
    <label className="ctl-select">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 4: Create `src/components/NumberInput.tsx`**

```tsx
export interface NumberInputProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}

export function NumberInput({ label, value, min, max, step = 1, onChange }: NumberInputProps) {
  return (
    <label className="ctl-number">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
```

- [ ] **Step 5: Create `src/components/Formula.tsx`** (KaTeX renderer)

```tsx
import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export interface FormulaProps {
  /** LaTeX source. */
  tex: string;
  block?: boolean;
}

export function Formula({ tex, block = false }: FormulaProps) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: block, throwOnError: false }),
    [tex, block],
  );
  return (
    <span
      className={block ? 'formula formula--block' : 'formula'}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

- [ ] **Step 6: Create `src/components/Readout.tsx`**

```tsx
export interface ReadoutProps {
  label: string;
  value: string | number;
  unit?: string;
  tone?: 'default' | 'ok' | 'err' | 'warn';
}

export function Readout({ label, value, unit, tone = 'default' }: ReadoutProps) {
  return (
    <div className={`readout readout--${tone}`}>
      <span className="readout__label">{label}</span>
      <span className="readout__value">
        {value}
        {unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
}
```

- [ ] **Step 7: Create `src/components/Panel.tsx`**

```tsx
import type { ReactNode } from 'react';

export interface PanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, children, className }: PanelProps) {
  return (
    <section className={`panel${className ? ` ${className}` : ''}`}>
      {title ? <h3 className="panel__title">{title}</h3> : null}
      {children}
    </section>
  );
}
```

- [ ] **Step 8: Create `src/components/TheoryBox.tsx`**

```tsx
import type { ReactNode } from 'react';

export interface TheoryBoxProps {
  title?: string;
  children: ReactNode;
}

export function TheoryBox({ title = 'Theory', children }: TheoryBoxProps) {
  return (
    <details className="theory-box">
      <summary>{title}</summary>
      <div className="theory-box__body">{children}</div>
    </details>
  );
}
```

- [ ] **Step 9: Create `src/components/TransportControls.tsx`** (binds to `SimLoop` from Task 9)

```tsx
import type { SimLoop } from '@/lib/sim/useSimulationLoop';

export interface TransportControlsProps {
  loop: SimLoop;
  speedMin?: number;
  speedMax?: number;
}

export function TransportControls({ loop, speedMin = 0.25, speedMax = 8 }: TransportControlsProps) {
  return (
    <div className="transport">
      <button onClick={loop.toggle}>{loop.running ? '❚❚ Pause' : '▶ Play'}</button>
      <button onClick={loop.step} disabled={loop.running}>
        ⏭ Step
      </button>
      <button onClick={loop.reset}>↺ Reset</button>
      <label className="transport__speed">
        Speed ×{loop.speed}
        <input
          type="range"
          min={speedMin}
          max={speedMax}
          step={0.25}
          value={loop.speed}
          onChange={(e) => loop.setSpeed(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 10: Create `src/components/components.css`**

```css
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-3);
  margin-bottom: var(--space-3);
}
.panel__title {
  font-size: 0.95rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ctl-slider,
.ctl-select,
.ctl-number,
.ctl-toggle {
  display: block;
  margin-bottom: var(--space-3);
  font-size: 0.9rem;
}
.ctl-slider__row {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-1);
}
.ctl-slider__val {
  font-family: var(--mono);
  color: var(--accent);
}
.ctl-slider input[type='range'] {
  width: 100%;
}
.ctl-toggle {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.readout {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border);
}
.readout__value {
  font-family: var(--mono);
}
.readout--ok .readout__value {
  color: var(--ok);
}
.readout--err .readout__value {
  color: var(--err);
}
.readout--warn .readout__value {
  color: var(--warn);
}
.theory-box {
  background: var(--surface-2);
  border-radius: var(--radius);
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-3);
}
.theory-box summary {
  cursor: pointer;
  color: var(--accent);
}
.transport {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.transport button {
  background: var(--surface-2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-2) var(--space-3);
}
.formula--block {
  display: block;
  margin: var(--space-2) 0;
}
```

- [ ] **Step 11: Create `src/components/index.ts`** (barrel)

```ts
export { Slider } from './Slider';
export { Toggle } from './Toggle';
export { Select } from './Select';
export { NumberInput } from './NumberInput';
export { Formula } from './Formula';
export { Readout } from './Readout';
export { Panel } from './Panel';
export { TheoryBox } from './TheoryBox';
export { TransportControls } from './TransportControls';
```

- [ ] **Step 12: Verify the build compiles**

Run: `npm run build`
Expected: `tsc -b` and Vite build succeed with no errors.

- [ ] **Step 13: Commit**

```bash
git add src/components
git commit -m "feat: add shared UI components (controls, formula, panel, transport)"
```

---

## Task 11: App shell, routing, Home page, and module placeholders

**Files:**
- Create: `src/pages/ModulePlaceholder.tsx`, `src/pages/Home.tsx`, `src/pages/pages.css`
- Modify: `src/App.tsx` (replace the temporary version from Task 3)
- Create: `src/app.css`

- [ ] **Step 1: Create `src/pages/ModulePlaceholder.tsx`**

```tsx
import { Panel } from '@/components';
import { t } from '@/i18n';

export function ModulePlaceholder({ title }: { title: string }) {
  return (
    <Panel title={title}>
      <p>{t('common.comingSoon')}</p>
    </Panel>
  );
}
```

- [ ] **Step 2: Create `src/pages/Home.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { t } from '@/i18n';

const MODULES = [
  { path: '/sampling', key: 'nav.sampling', chapter: 'CH7' },
  { path: '/modulation', key: 'nav.modulation', chapter: 'CH9' },
  { path: '/baseband', key: 'nav.baseband', chapter: 'CH8' },
  { path: '/huffman', key: 'nav.huffman', chapter: 'CH10' },
  { path: '/end-to-end', key: 'nav.endToEnd', chapter: 'All' },
] as const;

export function Home() {
  return (
    <div className="home">
      <h1>{t('app.title')}</h1>
      <p className="home__subtitle">{t('app.subtitle')}</p>
      <div className="home__grid">
        {MODULES.map((m) => (
          <Link key={m.path} to={m.path} className="home__card">
            <span className="home__chapter">{m.chapter}</span>
            <span className="home__cardtitle">{t(m.key)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/pages/pages.css`**

```css
.home {
  max-width: 980px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-3);
}
.home__subtitle {
  color: var(--text-dim);
  margin-top: calc(-1 * var(--space-2));
}
.home__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-3);
  margin-top: var(--space-4);
}
.home__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-4);
  color: var(--text);
  transition: border-color 0.15s;
}
.home__card:hover {
  border-color: var(--accent);
}
.home__chapter {
  font-family: var(--mono);
  font-size: 0.8rem;
  color: var(--accent);
}
.home__cardtitle {
  font-size: 1.1rem;
  font-weight: 600;
}
```

- [ ] **Step 4: Create `src/app.css`**

```css
.app {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.app__nav {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.app__brand {
  font-weight: 700;
  margin-right: var(--space-3);
}
.app__nav a {
  color: var(--text-dim);
  font-size: 0.9rem;
}
.app__nav a.active {
  color: var(--accent);
}
.app__spacer {
  flex: 1;
}
.app__main {
  flex: 1;
  padding: var(--space-3);
}
.module-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: var(--space-3);
  max-width: 1280px;
  margin: 0 auto;
}
@media (max-width: 820px) {
  .module-layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Replace `src/App.tsx`** with the full shell

```tsx
import { useState } from 'react';
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { t } from '@/i18n';
import { Home } from '@/pages/Home';
import { ModulePlaceholder } from '@/pages/ModulePlaceholder';
import './theme/global.css';
import './components/components.css';
import './pages/pages.css';
import './app.css';

const NAV = [
  { to: '/sampling', key: 'nav.sampling' },
  { to: '/modulation', key: 'nav.modulation' },
  { to: '/baseband', key: 'nav.baseband' },
  { to: '/huffman', key: 'nav.huffman' },
  { to: '/end-to-end', key: 'nav.endToEnd' },
];

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const applyTheme = (next: 'dark' | 'light') => {
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <HashRouter>
      <div className="app">
        <nav className="app__nav">
          <NavLink to="/" className="app__brand">
            {t('app.title')}
          </NavLink>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to}>
              {t(n.key)}
            </NavLink>
          ))}
          <span className="app__spacer" />
          <button onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </nav>
        <main className="app__main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sampling" element={<ModulePlaceholder title={t('nav.sampling')} />} />
            <Route
              path="/modulation"
              element={<ModulePlaceholder title={t('nav.modulation')} />}
            />
            <Route path="/baseband" element={<ModulePlaceholder title={t('nav.baseband')} />} />
            <Route path="/huffman" element={<ModulePlaceholder title={t('nav.huffman')} />} />
            <Route
              path="/end-to-end"
              element={<ModulePlaceholder title={t('nav.endToEnd')} />}
            />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
```

- [ ] **Step 6: Verify dev server renders**

Run: `npm run build`
Expected: build succeeds. (Optional manual check: `npm run dev`, open the printed URL, confirm Home shows 5 cards and nav links route to "Coming soon." placeholders.)

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/app.css src/pages
git commit -m "feat: add app shell, HashRouter nav, Home page, and module placeholders"
```

---

## Task 12: GitHub Actions deploy workflow and README

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main, master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Create `README.md`**

````markdown
# DigiCommLab

**EE413 Interactive Digital Communications Lab** — a browser-only, interactive learning tool
covering sampling & quantization, digital modulation & detection (with MAP/ML), baseband
transmission & eye diagrams, and Huffman coding & entropy, plus an end-to-end link simulation.

## Develop

```bash
npm install
npm run dev      # start dev server
npm test         # run unit tests (Vitest)
npm run build    # type-check + production build to dist/
npm run lint     # eslint
```

## Deploy

Pushing to the default branch builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. Enable Pages → "GitHub Actions" in the repo settings.
The Vite `base` is `./` (relative), so the app works under any Pages subpath.

## Architecture

- `src/lib/dsp` — pure, unit-tested DSP/math (no React).
- `src/lib/plot` — Canvas/SVG drawing primitives.
- `src/lib/sim` — simulation loop + bit sources for live demos.
- `src/components` — shared UI controls.
- `src/modules` — feature views (added per phase).

See `docs/superpowers/specs/2026-06-13-digicommlab-design.md` for the full design.
````

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "ci: add GitHub Pages deploy workflow and README"
```

---

## Task 13: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites pass (i18n, dsp/math, plot/draw, sim/sources).

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: exit code 0, no errors.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: `tsc --noEmit` clean; Vite emits `dist/` with `index.html` and hashed assets.

- [ ] **Step 4: Confirm clean tree**

Run: `git status -s`
Expected: empty output (everything committed).

---

## Self-Review (spec coverage for Phase 0)

- **Project shell / nav / theming** → Tasks 3, 5, 11. ✓
- **Decoupled DSP layer + tests (TDD)** → Tasks 7 (math), 8 (draw scale), 9 (sources). ✓
- **Canvas/SVG rendering primitives (D3)** → Task 8 (`Canvas`, draw helpers). SVG helpers (tree/regions) are added in the phases that need them (Huffman/Modulation). ✓
- **Simulation engine skeleton (D5 live demos)** → Task 9 (`useSimulationLoop`, sources) + Task 10 (`TransportControls`). ✓
- **i18n-ready, English (D1)** → Task 6. ✓
- **HashRouter + deep links (D4)** → Task 11. ✓
- **GitHub Pages + CI (D4)** → Task 12; `base: './'` resolves the repo-name open item. ✓
- **KaTeX formulas (slide fidelity)** → Task 10 (`Formula`). ✓
- **Shared controls** (Slider/Toggle/Select/NumberInput/Readout/Panel/TheoryBox) → Task 10. ✓

Feature modules (CH7–CH10 + capstone) are intentionally **out of Phase 0** and covered by Plans 2–6.
No placeholders or undefined cross-references remain; `SimLoop` (Task 9) is consumed by
`TransportControls` (Task 10) with matching shape.
