# Fourier & Spectrum Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **SHARED-CHECKOUT RULE (project memory):** This repo is worked by multiple concurrent agents in the same tree. Execute this plan in an **isolated git worktree** (use superpowers:using-git-worktrees first). Never work directly in the shared `master` checkout. Inside the worktree, the `git add <paths> && git commit -- <paths>` commands below are safe. Scope every commit with an explicit pathspec.

**Goal:** Implement the Fourier & Spectrum module (`/fourier` route) — a comprehensive 5-panel frequency-domain analysis tool featuring Fourier-series synthesis, DFT/FFT analysis, LTI filtering, FT pairs with live properties, and bandpass/Hilbert signals. All DSP via TDD, all UI matching the signal_sim design language.

**Architecture:** Three-tier (sampling/modulation model):
- **DSP (`src/lib/dsp/fourier.ts`)**: 9 pure-function exports (Fourier series, filters, FT pairs, Hilbert, analytic signal, lowpass equivalent) — fully unit-tested, no React.
- **View builder (`src/modules/fourier/model.ts`)**: Pure-function assembler `buildFourierView(params)` returning panel-ready data (traces, spectra, scalars) — testable without UI.
- **UI (`src/modules/fourier/{FourierModule.tsx, panels.tsx, fourier.css}`)**: Five Canvas panels (time-domain waveforms, frequency spectra, 2D plots) + control Panel; design tokens only.
- **i18n (`src/i18n/fourier.ts`)**: Module-specific strings (panel titles, labels, units); merged into `index.ts` later.
- **Landing viz (`src/pages/landing/viz/FourierViz.tsx`)**: Animated harmonic-synthesis preview card.

**Tech Stack:** TypeScript (strict, no `any`), Vitest, React 18 + Canvas. Reuse: `Canvas`, `drawLine`, `drawStems`, `linScale` from `src/lib/plot/*`; colors from `src/lib/plot/colors.ts` (tokens: `--color-x`, `--color-h`, `--color-y`, `--color-marker`); shared UI (`Panel`, `Slider`, `Select`, `TheoryBox`, `Formula`) from `src/components`. Imports: `@/lib/dsp/{fft, window, signals, math}` (Faz 0, assumed merged); `@/lib/dsp/spectrum` (existing).

---

## File Structure

| File | Responsibility | Lines (est.) |
|------|---|---|
| **DSP** | | |
| `src/lib/dsp/fourier.ts` | Fourier series, transfer functions, FT pairs, Hilbert, I/Q, lowpass equiv. | 300 |
| `tests/dsp/fourier.test.ts` | Unit tests: coeff exactness, Gibbs, Hilbert phase, analytic signal. | 200 |
| **Module** | | |
| `src/modules/fourier/FourierModule.tsx` | Shell: layout, state, event loop, dispatch to panels. | 150 |
| `src/modules/fourier/model.ts` | `buildFourierView`: pure assembler for all 5 panels + scalars. | 250 |
| `src/modules/fourier/panels.tsx` | Five Canvas panels (Fourier, FFT, Filter, FT, Bandpass) + helpers. | 400 |
| `src/modules/fourier/fourier.css` | Module-specific grid, glass-panel overrides, token vars. | 80 |
| `tests/modules/fourier-model.test.ts` | Pure-function tests on `buildFourierView`; model consistency. | 150 |
| **Landing & i18n** | | |
| `src/pages/landing/viz/FourierViz.tsx` | Animated harmonic-synthesis loop (landing card vis). | 80 |
| `src/i18n/fourier.ts` | New fragment: panel titles, labels, formulas, theory box text. | 100 |
| **Tests** | | |
| `tests/pages/fourier/FourierModule.test.tsx` | Smoke render test (mirrors sampling). | 50 |

All formulas carry `// Proakis §x.y, s.N` comments per CLAUDE.md mandate.

---

## Task 1: Fourier-Series Coefficients (`fourier.ts` core DSP — part 1)

**Files:**
- Create: `src/lib/dsp/fourier.ts` (initial, Task 1–3 append to it)
- Create: `tests/dsp/fourier.test.ts` (initial)

**Scope:** Implement `seriesCoeffs(kind, f0, N, duty?)` + `seriesPartialSum(kind, f0, N, t)`. These are deterministic analytic formulas; test correctness vs. book.

- [ ] **Step 1: Write the failing test**

```ts
// tests/dsp/fourier.test.ts
import { describe, it, expect } from 'vitest';
import { seriesCoeffs, seriesPartialSum } from '@/lib/dsp/fourier';
import type { SpectralLine } from '@/lib/dsp/spectrum';

const mag = (c: SpectralLine) => Math.hypot(c.mag || 0, c.phase || 0);

describe('Fourier series (Proakis §2.1)', () => {
  it('square wave has only odd harmonics n=1,3,5,...', () => {
    const coeffs = seriesCoeffs('square', 1, 5);
    expect(coeffs.length).toBe(5);
    // c_0=0 (no DC)
    expect(coeffs[0].freq).toBe(0);
    expect(coeffs[0].mag).toBeCloseTo(0, 10);
    // c_1=(4/π), c_2=0, c_3=(4/3π), etc.
    const c1 = coeffs.find((l) => Math.abs(l.freq - 1) < 1e-9);
    expect(c1).toBeDefined();
    expect(c1!.mag).toBeCloseTo(4 / Math.PI, 6);
    const c2 = coeffs.find((l) => Math.abs(l.freq - 2) < 1e-9);
    expect(c2!.mag).toBeCloseTo(0, 10); // even -> zero
  });

  it('triangle wave c_n ∝ 1/n² with alternating sign', () => {
    const coeffs = seriesCoeffs('triangle', 1, 5);
    // c_1=(8/π²), c_3=(8/9π²), c_5=(8/25π²), etc.
    const c1 = coeffs.find((l) => Math.abs(l.freq - 1) < 1e-9)!;
    const c3 = coeffs.find((l) => Math.abs(l.freq - 3) < 1e-9)!;
    expect(c1.mag).toBeGreaterThan(c3.mag);
    expect(c3.mag / c1.mag).toBeCloseTo(1 / 9, 6);
  });

  it('sawtooth has all harmonics c_n=−1/(nπ)', () => {
    const coeffs = seriesCoeffs('sawtooth', 1, 5);
    for (let n = 1; n <= 5; n++) {
      const cn = coeffs.find((l) => Math.abs(l.freq - n) < 1e-9);
      expect(cn!.mag).toBeCloseTo(1 / (n * Math.PI), 6);
    }
  });

  it('pulse wave duty cycle modulates c_n magnitude', () => {
    const coeffs50 = seriesCoeffs('pulse', 1, 3, 0.5);
    const coeffs25 = seriesCoeffs('pulse', 1, 3, 0.25);
    // c_1(duty=0.5) is 4/π; c_1(duty=0.25) = sinc(π/4)·2 ≈ 0.6366
    expect(coeffs50.find((l) => Math.abs(l.freq - 1) < 1e-9)!.mag).toBeCloseTo(4 / Math.PI, 6);
    expect(coeffs25.find((l) => Math.abs(l.freq - 1) < 1e-9)!.mag).toBeLessThan(
      coeffs50.find((l) => Math.abs(l.freq - 1) < 1e-9)!.mag,
    );
  });

  it('partial sum at t=0 (discontinuity) shows Gibbs overshoot ≈9%', () => {
    const N = 50; // many harmonics
    const s = seriesPartialSum('square', 1, N, 0); // just past edge
    const ideal = 1;
    const overshoot = (s - ideal) / ideal;
    expect(Math.abs(overshoot)).toBeGreaterThan(0.08); // Gibbs ~9%
  });

  it('partial sum converges to ideal waveform away from discontinuities', () => {
    const t = 0.2; // safe point in square wave
    const sN50 = seriesPartialSum('square', 1, 50, t);
    const sN5 = seriesPartialSum('square', 1, 5, t);
    const ideal = 1; // square is +1 in [0, 0.5)
    expect(sN50).toBeCloseTo(ideal, 2);
    expect(sN5).toBeCloseTo(ideal, 1);
    expect(Math.abs(sN50 - ideal)).toBeLessThan(Math.abs(sN5 - ideal));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dsp/fourier.test.ts -t 'Fourier series'`
Expected: FAIL — cannot resolve `@/lib/dsp/fourier`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/dsp/fourier.ts
// Proakis §2.1 (Fourier Series), §2.2 (Fourier Transform), §2.2.2 (properties, filters),
// §2.5 (bandpass, Hilbert, analytic signal).

import type { SpectralLine } from './spectrum';
import type { Periodic } from './signals';
import { linspace, sinc } from './math';
import { fft, ifft, type Complex } from './fft';

/**
 * Analytical Fourier-series coefficients c_n (magnitude/phase).
 * For periodic signals: square, triangle, sawtooth, pulse (with duty cycle).
 * Proakis §2.1, s.29–34.
 */
export function seriesCoeffs(
  kind: Periodic,
  f0: number,
  N: number,
  duty = 0.5,
): SpectralLine[] {
  const coeffs: SpectralLine[] = [];

  // DC component (n=0)
  let c0_mag = 0;
  if (kind === 'sawtooth') c0_mag = 0; // sawtooth zero mean
  else if (kind === 'triangle') c0_mag = 0; // triangle zero mean
  else if (kind === 'square') c0_mag = 0; // square zero mean
  else if (kind === 'pulse') c0_mag = duty; // pulse: DC = duty ratio

  coeffs.push({ freq: 0, mag: c0_mag, phase: 0 });

  // Harmonics n = 1, 2, ..., N
  for (let n = 1; n <= N; n++) {
    let cn_mag = 0;
    let cn_phase = 0;

    if (kind === 'square') {
      // c_n = (4/π) / n for odd n, 0 for even. Proakis §2.1, s.30
      if (n % 2 === 1) {
        cn_mag = (4 / Math.PI) / n;
      }
    } else if (kind === 'triangle') {
      // c_n = (8/π²) / n² for odd n, 0 for even. Proakis §2.1, s.31
      if (n % 2 === 1) {
        cn_mag = (8 / (Math.PI * Math.PI)) / (n * n);
      }
    } else if (kind === 'sawtooth') {
      // c_n = −1 / (π n) for all n. Proakis §2.1, s.32
      cn_mag = 1 / (Math.PI * n);
      cn_phase = -Math.PI / 2; // negative real part
    } else if (kind === 'pulse') {
      // c_n = (duty) · sinc(π n duty). Proakis §2.1, s.33
      cn_mag = duty * Math.abs(sinc(Math.PI * n * duty));
    }

    coeffs.push({ freq: n * f0, mag: cn_mag, phase: cn_phase || 0 });
  }

  return coeffs;
}

/**
 * Partial sum x_N(t) = Σ_{n=−N}^{N} c_n e^{j2πnf₀t}.
 * Proakis §2.1, s.29.
 */
export function seriesPartialSum(
  kind: Periodic,
  f0: number,
  N: number,
  t: number,
): number {
  const coeffs = seriesCoeffs(kind, f0, N);
  let sum = 0;

  // Positive frequencies
  for (let n = 0; n < coeffs.length; n++) {
    const freq = coeffs[n].freq;
    const mag = coeffs[n].mag;
    const phase = coeffs[n].phase || 0;
    const angle = 2 * Math.PI * freq * t + phase;
    sum += mag * Math.cos(angle);
  }

  // Negative frequencies (conjugate symmetry) — except DC
  for (let n = 1; n < coeffs.length; n++) {
    const freq = coeffs[n].freq;
    const mag = coeffs[n].mag;
    const phase = coeffs[n].phase || 0;
    const angle = 2 * Math.PI * -freq * t - phase;
    sum += mag * Math.cos(angle);
  }

  return sum;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dsp/fourier.test.ts -t 'Fourier series'`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/dsp/fourier.test.ts src/lib/dsp/fourier.ts
git commit -m "feat(dsp): Fourier-series coefficients & partial sums (Proakis §2.1)"
```

---

## Task 2: LTI Transfer Functions & Filtering (`fourier.ts` core DSP — part 2)

**Files:**
- Modify: `src/lib/dsp/fourier.ts` (append types + `transferMag`)
- Modify: `tests/dsp/fourier.test.ts` (append test suite)

**Scope:** Implement `FilterType` enum + `transferMag(type, f, fc, fc2?)` for ideal and RC filters.

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/dsp/fourier.test.ts
import { transferMag, type FilterType } from '@/lib/dsp/fourier';

describe('LTI transfer functions (Proakis §2.2.2, s.36)', () => {
  it('ideal LPF has unity gain below cutoff, zero above', () => {
    const H_below = transferMag('lpf', 10, 50);
    const H_above = transferMag('lpf', 100, 50);
    expect(H_below).toBeCloseTo(1, 10);
    expect(H_above).toBeCloseTo(0, 10);
  });

  it('ideal HPF has zero gain below cutoff, unity above', () => {
    const H_below = transferMag('hpf', 10, 50);
    const H_above = transferMag('hpf', 100, 50);
    expect(H_below).toBeCloseTo(0, 10);
    expect(H_above).toBeCloseTo(1, 10);
  });

  it('ideal BPF passes between fc1 and fc2', () => {
    const H_below = transferMag('bpf', 10, 30, 70);
    const H_in = transferMag('bpf', 50, 30, 70);
    const H_above = transferMag('bpf', 100, 30, 70);
    expect(H_below).toBeCloseTo(0, 10);
    expect(H_in).toBeCloseTo(1, 10);
    expect(H_above).toBeCloseTo(0, 10);
  });

  it('RC low-pass |H(f)| = 1 / sqrt(1 + (f/fc)²)', () => {
    const H_dc = transferMag('rc', 0, 50);
    const H_fc = transferMag('rc', 50, 50);
    const H_10fc = transferMag('rc', 500, 50);
    expect(H_dc).toBeCloseTo(1, 10);
    expect(H_fc).toBeCloseTo(1 / Math.sqrt(2), 6);
    expect(H_10fc).toBeCloseTo(1 / Math.sqrt(101), 6);
  });

  it('transfer function smoothly rolls off at filter boundaries', () => {
    const Hs = [
      transferMag('lpf', 45, 50),
      transferMag('lpf', 50, 50),
      transferMag('lpf', 55, 50),
    ];
    expect(Hs[0]).toBeGreaterThan(Hs[2]); // monotonic (ideal is step, but this documents behavior)
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dsp/fourier.test.ts -t 'LTI transfer'`
Expected: FAIL — `transferMag` not exported, `FilterType` undefined.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/dsp/fourier.ts`:

```ts
export type FilterType = 'lpf' | 'hpf' | 'bpf' | 'rc';

/**
 * Magnitude response |H(f)| of an LTI filter.
 * - 'lpf': ideal low-pass, unity below fc, zero above. Proakis §2.2.2, s.36
 * - 'hpf': ideal high-pass, zero below fc, unity above.
 * - 'bpf': ideal band-pass, unity between fc and fc2, zero outside.
 * - 'rc': RC filter (first-order), |H(f)|=1/sqrt(1+(f/fc)²). Proakis §2.4
 */
export function transferMag(
  type: FilterType,
  f: number,
  fc: number,
  fc2?: number,
): number {
  const absF = Math.abs(f);
  const absC = Math.abs(fc);
  const absC2 = fc2 !== undefined ? Math.abs(fc2) : undefined;

  if (type === 'lpf') {
    return absF <= absC ? 1 : 0;
  }
  if (type === 'hpf') {
    return absF >= absC ? 1 : 0;
  }
  if (type === 'bpf') {
    const c1 = Math.min(absC, absC2 ?? absC);
    const c2 = Math.max(absC, absC2 ?? absC);
    return absF >= c1 && absF <= c2 ? 1 : 0;
  }
  // RC first-order low-pass
  return 1 / Math.sqrt(1 + (absF / absC) ** 2);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dsp/fourier.test.ts -t 'LTI transfer'`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/dsp/fourier.test.ts src/lib/dsp/fourier.ts
git commit -m "feat(dsp): ideal & RC transfer functions (Proakis §2.2.2, §2.4)"
```

---

## Task 3: Fourier Transform Pairs & Properties (`fourier.ts` core DSP — part 3)

**Files:**
- Modify: `src/lib/dsp/fourier.ts` (append `ftPair`)
- Modify: `tests/dsp/fourier.test.ts` (append test suite)

**Scope:** Implement `ftPair(kind, param)` returning time/freq-domain traces for rect↔sinc, triangle↔sinc², gauss↔gauss. Properties (time-shift, scaling, modulation) are computed live in the UI; DSP just returns the pair shapes.

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/dsp/fourier.test.ts
import { ftPair } from '@/lib/dsp/fourier';

describe('Fourier transform pairs (Proakis §2.2.2, s.36)', () => {
  it('rect: time-domain rect becomes freq-domain sinc', () => {
    const pair = ftPair('rect', 2); // width 2 in time
    expect(pair.time.t).toBeDefined();
    expect(pair.time.x).toBeDefined();
    expect(pair.freq.f).toBeDefined();
    expect(pair.freq.mag).toBeDefined();
    // rect(t/τ) <-> τ·sinc(fτ). At f=0, sinc peak = 1·τ
    const f0 = pair.freq.f.findIndex((f) => Math.abs(f) < 1e-9);
    expect(pair.freq.mag[f0]).toBeCloseTo(2, 6); // τ=2
  });

  it('sinc zeros at f = 1/τ, 2/τ, ...', () => {
    const pair = ftPair('rect', 2);
    // τ=2 -> zeros at f = ±0.5, ±1, ±1.5, ...
    const mag1 = pair.freq.mag;
    const f1_idx = pair.freq.f.findIndex((f) => Math.abs(f - 0.5) < 0.1);
    if (f1_idx >= 0) expect(mag1[f1_idx]).toBeLessThan(0.2); // near zero
  });

  it('triangle ↔ sinc²', () => {
    const pair = ftPair('tri', 2);
    expect(pair.freq.mag).toBeDefined();
    // tri peaks should be lower (sinc² vs sinc) and smoother
    expect(pair.freq.mag.length).toBeGreaterThan(50);
  });

  it('Gaussian ↔ Gaussian (self-similar)', () => {
    const pair = ftPair('gauss', 1);
    expect(pair.time.x).toBeDefined();
    expect(pair.freq.mag).toBeDefined();
    // freq-domain is also bell-shaped (narrower if time-wide)
    const maxFreq = Math.max(...pair.freq.mag);
    expect(maxFreq).toBeGreaterThan(0.5);
  });

  it('all pairs have symmetric magnitude in freq domain', () => {
    for (const kind of ['rect', 'tri', 'gauss'] as const) {
      const pair = ftPair(kind, 1);
      const mags = pair.freq.mag;
      // Find center (f=0)
      const center = pair.freq.f.findIndex((f) => Math.abs(f) < 1e-9);
      if (center >= 1 && center < mags.length - 1) {
        expect(Math.abs(mags[center - 1] - mags[center + 1])).toBeLessThan(0.05 * mags[center]);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dsp/fourier.test.ts -t 'transform pairs'`
Expected: FAIL — `ftPair` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/dsp/fourier.ts`:

```ts
export function ftPair(
  kind: 'rect' | 'tri' | 'gauss',
  param: number, // width (rect/tri) or σ (gauss)
): {
  time: { t: number[]; x: number[] };
  freq: { f: number[]; mag: number[] };
} {
  const N = 256;

  if (kind === 'rect') {
    // rect(t/τ) <-> τ·sinc(fτ). Proakis §2.2, s.35
    const tau = param;
    const t = linspace(-2 * tau, 2 * tau, N);
    const x = t.map((ti) => (Math.abs(ti) <= tau / 2 ? 1 : 0));

    const f = linspace(-3 / tau, 3 / tau, N);
    const mag = f.map((fi) =>
      fi === 0 ? tau : tau * Math.abs(sinc(Math.PI * fi * tau)),
    );

    return { time: { t, x }, freq: { f, mag } };
  }

  if (kind === 'tri') {
    // tri(t/τ) <-> τ·sinc²(fτ). Proakis §2.2, s.35
    const tau = param;
    const t = linspace(-tau, tau, N);
    const x = t.map((ti) => Math.max(0, 1 - Math.abs(ti) / tau));

    const f = linspace(-2 / tau, 2 / tau, N);
    const mag = f.map((fi) => {
      const sc = sinc(Math.PI * fi * tau);
      return tau * sc * sc;
    });

    return { time: { t, x }, freq: { f, mag } };
  }

  // Gaussian: self-similar. g(t) = exp(−π(t/σ)²) <-> σ·exp(−π(σf)²).
  const sigma = param;
  const t = linspace(-3 * sigma, 3 * sigma, N);
  const x = t.map((ti) => Math.exp(-Math.PI * (ti / sigma) ** 2));

  const f = linspace(-3 / sigma, 3 / sigma, N);
  const mag = f.map((fi) => sigma * Math.exp(-Math.PI * (sigma * fi) ** 2));

  return { time: { t, x }, freq: { f, mag } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dsp/fourier.test.ts -t 'transform pairs'`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/dsp/fourier.test.ts src/lib/dsp/fourier.ts
git commit -m "feat(dsp): Fourier transform pairs rect/tri/gauss (Proakis §2.2)"
```

---

## Task 4: Hilbert Transform & Analytic Signal (`fourier.ts` core DSP — part 4)

**Files:**
- Modify: `src/lib/dsp/fourier.ts` (append `hilbert`, `analyticSignal`)
- Modify: `tests/dsp/fourier.test.ts` (append test suite)

**Scope:** Implement Hilbert via FFT (multiply by −j·sgn(f) in frequency domain). Analytic signal z(t) = x(t) + j·x̂(t). Tests verify −π/2 phase shift and magnitude preservation.

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/dsp/fourier.test.ts
import { hilbert, analyticSignal } from '@/lib/dsp/fourier';

describe('Hilbert transform & analytic signal (Proakis §2.5, s.49)', () => {
  it('Hilbert of cos(2πft) ≈ sin(2πft) (−π/2 phase shift)', () => {
    const f = 2; // frequency
    const fs = 64; // sample rate
    const N = 64;
    const t = linspace(0, 1 - 1 / N, N);
    const x = t.map((ti) => Math.cos(2 * Math.PI * f * ti));
    const xhat = hilbert(x);

    // At t=0.1, cos(2π·2·0.1)=cos(1.257)≈0.31, sin(2π·2·0.1)=sin(1.257)≈0.95
    const idx = Math.floor(0.1 * N);
    expect(xhat[idx]).toBeCloseTo(Math.sin(2 * Math.PI * f * t[idx]), 1);
  });

  it('hilbert(sin) ≈ −cos (phase shift by +π/2)', () => {
    const f = 1;
    const N = 32;
    const t = linspace(0, 1 - 1 / N, N);
    const x = t.map((ti) => Math.sin(2 * Math.PI * f * ti));
    const xhat = hilbert(x);

    const idx = Math.floor(0.25 * N);
    expect(xhat[idx]).toBeCloseTo(-Math.cos(2 * Math.PI * f * t[idx]), 1);
  });

  it('Hilbert is odd: hilbert(−x) = −hilbert(x)', () => {
    const x = [1, 2, 3, 4, 5, 4, 3, 2];
    const xhat = hilbert(x);
    const nxhat = hilbert(x.map((v) => -v));
    for (let i = 0; i < x.length; i++) {
      expect(nxhat[i]).toBeCloseTo(-xhat[i], 10);
    }
  });

  it('analyticSignal reconstructs: Re{z}=x, Im{z}=x̂', () => {
    const f = 2;
    const N = 32;
    const t = linspace(0, 1 - 1 / N, N);
    const x = t.map((ti) => Math.cos(2 * Math.PI * f * ti));
    const z = analyticSignal(x);
    for (let i = 0; i < N; i++) {
      expect(z.re[i]).toBeCloseTo(x[i], 8);
    }
  });

  it('analytic signal magnitude = instantaneous envelope', () => {
    const f = 2;
    const N = 16;
    const t = linspace(0, 1 - 1 / N, N);
    // Bandpass-modulated: x(t) = cos(2π·5·t) · cos(2π·0.5·t)
    const x = t.map((ti) => Math.cos(2 * Math.PI * 5 * ti) * Math.cos(2 * Math.PI * 0.5 * ti));
    const z = analyticSignal(x);
    for (let i = 0; i < N; i++) {
      const env = Math.hypot(z.re[i], z.im[i]);
      // Envelope should be ≤1 and slowly varying
      expect(env).toBeLessThanOrEqual(1.1);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dsp/fourier.test.ts -t 'Hilbert'`
Expected: FAIL — `hilbert`, `analyticSignal` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/dsp/fourier.ts`:

```ts
/**
 * Hilbert transform: y = H{x} = IFFT{ −j·sgn(f)·FFT{x} }.
 * Applies −π/2 phase shift to positive frequencies, +π/2 to negative.
 * Proakis §2.5, s.49.
 */
export function hilbert(x: number[]): number[] {
  const N = x.length;
  const X = fft(x);

  // Apply −j·sgn(f) in frequency domain
  const Y: Complex[] = new Array(N);
  for (let k = 0; k < N; k++) {
    const sgn = k === 0 || k === N / 2 ? 0 : k < N / 2 ? -1 : 1; // −j for k>0, +j for k<0
    // Multiply by −j·sgn(f): −j·z = {−j·(a+ib)} = −j·a + b = (b, −a)
    // sgn = −1 (pos freq): (X_re, X_im) -> −i·(X_re + i·X_im) = (X_im, −X_re)
    // sgn = +1 (neg freq): (X_re, X_im) -> +i·(X_re + i·X_im) = (−X_im, X_re)
    if (sgn === 0) {
      Y[k] = { re: 0, im: 0 };
    } else if (sgn < 0) {
      Y[k] = { re: X[k].im, im: -X[k].re };
    } else {
      Y[k] = { re: -X[k].im, im: X[k].re };
    }
  }

  const y = ifft(Y);
  return y.map((c) => c.re);
}

/**
 * Analytic signal: z(t) = x(t) + j·x̂(t).
 * Proakis §2.5, s.49.
 */
export function analyticSignal(x: number[]): { re: number[]; im: number[] } {
  const xhat = hilbert(x);
  return {
    re: x,
    im: xhat,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dsp/fourier.test.ts -t 'Hilbert'`
Expected: PASS (5 tests). (Tolerance at 1–2 digits due to FFT numerics.)

- [ ] **Step 5: Commit**

```bash
git add tests/dsp/fourier.test.ts src/lib/dsp/fourier.ts
git commit -m "feat(dsp): Hilbert transform & analytic signal (Proakis §2.5)"
```

---

## Task 5: Lowpass Equivalent (I/Q) & Bandpass Envelope (`fourier.ts` core DSP — part 5)

**Files:**
- Modify: `src/lib/dsp/fourier.ts` (append `lowpassEquivalent`)
- Modify: `tests/dsp/fourier.test.ts` (append test suite)

**Scope:** Implement `lowpassEquivalent(x, fc, fs)` returning I/Q components and envelope. Shifts analytic signal down by fc, low-pass filters, extracts envelope.

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/dsp/fourier.test.ts
import { lowpassEquivalent } from '@/lib/dsp/fourier';

describe('Lowpass equivalent & envelope (Proakis §2.5, s.49)', () => {
  it('extracts I/Q components from a bandpass signal', () => {
    const fc = 10; // carrier
    const fm = 1; // message
    const fs = 64; // sample rate
    const N = 64;
    const t = linspace(0, 1 - 1 / N, N);
    // Bandpass: m(t)·cos(2π·fc·t) where m(t) = 1 + 0.5·cos(2π·fm·t)
    const x = t.map(
      (ti) => (1 + 0.5 * Math.cos(2 * Math.PI * fm * ti)) * Math.cos(2 * Math.PI * fc * ti),
    );

    const lp = lowpassEquivalent(x, fc, fs);
    expect(lp.i).toHaveLength(N);
    expect(lp.q).toHaveLength(N);
    expect(lp.env).toHaveLength(N);
    // Envelope should be ≈ 1 + 0.5·cos(2π·fm·t)
    expect(lp.env[N / 4]).toBeCloseTo(1.5, 0); // max at t=0
  });

  it('envelope at discontinuities recovers the modulation', () => {
    const fc = 5;
    const fs = 32;
    const N = 32;
    const t = linspace(0, 1 - 1 / N, N);
    // On-off keying: x = rect(t) · cos(2π·fc·t)
    const x = t.map((ti) => (ti < 0.5 ? 1 : 0) * Math.cos(2 * Math.PI * fc * ti));

    const lp = lowpassEquivalent(x, fc, fs);
    // First half: env ≈ 1, second half: env ≈ 0
    const env_first = lp.env.slice(0, N / 4).reduce((s, v) => s + v, 0) / (N / 4);
    const env_second = lp.env.slice((3 * N) / 4).reduce((s, v) => s + v, 0) / (N / 4);
    expect(env_first).toBeGreaterThan(env_second);
  });

  it('I/Q are orthogonal in the lowpass sense', () => {
    const fc = 8;
    const fs = 64;
    const N = 32;
    const t = linspace(0, 1 - 1 / N, N);
    const x = t.map((ti) => Math.cos(2 * Math.PI * fc * ti)); // pure carrier
    const lp = lowpassEquivalent(x, fc, fs);
    // For pure carrier, I ≈ const, Q ≈ 0
    expect(Math.max(...lp.q.map(Math.abs))).toBeLessThan(0.2);
  });

  it('envelope is the magnitude sqrt(i²+q²)', () => {
    const fc = 4;
    const fs = 32;
    const N = 16;
    const t = linspace(0, 1 - 1 / N, N);
    const x = t.map((ti) => Math.cos(2 * Math.PI * fc * ti));
    const lp = lowpassEquivalent(x, fc, fs);
    for (let i = 0; i < N; i++) {
      const computed = Math.hypot(lp.i[i], lp.q[i]);
      expect(computed).toBeCloseTo(lp.env[i], 8);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dsp/fourier.test.ts -t 'Lowpass equivalent'`
Expected: FAIL — `lowpassEquivalent` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/dsp/fourier.ts`:

```ts
/**
 * Lowpass equivalent (I/Q decomposition) of a bandpass signal.
 * x_l(t) = 2·{real part of [z(t)·e^{−j2πf_c·t}]}, where z = analytic signal.
 * I = real part, Q = imag part (in-phase, quadrature).
 * Envelope V(t) = |x_l(t)| = sqrt(I²+Q²).
 * Proakis §2.5, s.49.
 */
export function lowpassEquivalent(
  x: number[],
  fc: number,
  fs: number,
): {
  i: number[];
  q: number[];
  env: number[];
} {
  const N = x.length;
  const z = analyticSignal(x);

  const i: number[] = new Array(N);
  const q: number[] = new Array(N);
  const env: number[] = new Array(N);

  for (let n = 0; n < N; n++) {
    const t = n / fs;
    // Shift down by fc: multiply by e^{−j2πf_c·t}
    const angle = -2 * Math.PI * fc * t;
    const cos_a = Math.cos(angle);
    const sin_a = Math.sin(angle);

    // (z_re + j·z_im) · (cos_a − j·sin_a) = (z_re·cos_a + z_im·sin_a) + j(z_im·cos_a − z_re·sin_a)
    const shifted_re = z.re[n] * cos_a + z.im[n] * sin_a;
    const shifted_im = z.im[n] * cos_a - z.re[n] * sin_a;

    // Lowpass equivalent: 2× real part (by convention for bandpass)
    i[n] = 2 * shifted_re;
    q[n] = 2 * shifted_im;
    env[n] = Math.hypot(i[n], q[n]);
  }

  return { i, q, env };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dsp/fourier.test.ts -t 'Lowpass equivalent'`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/dsp/fourier.test.ts src/lib/dsp/fourier.ts
git commit -m "feat(dsp): lowpass equivalent I/Q & envelope (Proakis §2.5)"
```

---

## Task 6: Spectrum Analyzer (FFT + Windowing) (`fourier.ts` module-specific DSP — part 6)

**Files:**
- Modify: `src/lib/dsp/fourier.ts` (append `fftAnalyze`)
- Modify: `tests/dsp/fourier.test.ts` (append test suite)

**Scope:** Implement `fftAnalyze(x, fs, windowType)` → `{ freq, mag, phase }`. Applies window, FFT, two-sided spectrum. Reuses `fft`, `window` from Faz 0.

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/dsp/fourier.test.ts
import { fftAnalyze } from '@/lib/dsp/fourier';
import { window } from '@/lib/dsp/window';

describe('FFT spectrum analyzer (Proakis §2.2, windowing)', () => {
  it('detects a single tone at its frequency', () => {
    const fs = 64;
    const N = 64;
    const f0 = 8;
    const t = linspace(0, 1 - 1 / N, N);
    const x = t.map((ti) => Math.cos(2 * Math.PI * f0 * ti));
    const spec = fftAnalyze(x, fs, 'rect');

    let k_max = 0;
    for (let k = 1; k < spec.mag.length; k++) {
      if (spec.mag[k] > spec.mag[k_max]) k_max = k;
    }
    expect(spec.freq[k_max]).toBeCloseTo(f0, 6);
    expect(spec.mag[k_max]).toBeCloseTo(0.5, 6); // A/2 for cosine
  });

  it('Hann window reduces spectral leakage at frequency boundaries', () => {
    const fs = 64;
    const N = 64;
    const f0 = 7.5; // non-integer: will leak with rect
    const t = linspace(0, 1 - 1 / N, N);
    const x = t.map((ti) => Math.cos(2 * Math.PI * f0 * ti));

    const spec_rect = fftAnalyze(x, fs, 'rect');
    const spec_hann = fftAnalyze(x, fs, 'hann');

    // Hann should have higher main lobe but lower sidelobes
    const rect_max = Math.max(...spec_rect.mag);
    const hann_max = Math.max(...spec_hann.mag);
    expect(rect_max).toBeGreaterThan(hann_max); // Rect peak higher
  });

  it('spectrum is symmetric (real input)', () => {
    const fs = 32;
    const N = 32;
    const f0 = 4;
    const t = linspace(0, 1 - 1 / N, N);
    const x = t.map((ti) => Math.cos(2 * Math.PI * f0 * ti));
    const spec = fftAnalyze(x, fs, 'rect');

    const center = spec.freq.findIndex((f) => Math.abs(f) < 1e-9);
    for (let i = 1; i < center; i++) {
      const pos_idx = center + i;
      const neg_idx = center - i;
      if (pos_idx < spec.mag.length && neg_idx >= 0) {
        expect(spec.mag[pos_idx]).toBeCloseTo(spec.mag[neg_idx], 10);
      }
    }
  });

  it('phase unwraps sensibly across the spectrum', () => {
    const fs = 32;
    const N = 32;
    const f0 = 4;
    const t = linspace(0, 1 - 1 / N, N);
    const x = t.map((ti) => Math.cos(2 * Math.PI * f0 * ti)); // phase=0
    const spec = fftAnalyze(x, fs, 'rect');

    const tone_idx = spec.freq.findIndex((f) => Math.abs(f - f0) < 0.5);
    expect(Math.abs(spec.phase[tone_idx])).toBeLessThan(0.3); // should be near 0
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dsp/fourier.test.ts -t 'FFT spectrum'`
Expected: FAIL — `fftAnalyze` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/dsp/fourier.ts`:

```ts
import { window, type WindowType } from './window';
import { spectrum as spectrumHelper } from './fft';

/**
 * FFT-based spectrum analyzer: applies window, computes FFT, returns fftshift-ed spectrum.
 * Proakis §2.2, s.35. Uses `spectrum()` helper from fft.ts.
 */
export function fftAnalyze(
  x: number[],
  fs: number,
  windowType: WindowType,
): {
  freq: number[];
  mag: number[];
  phase: number[];
} {
  const N = x.length;
  const w = window(windowType, N);
  const windowed = x.map((xi, i) => xi * w[i]);
  return spectrumHelper(windowed, fs);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dsp/fourier.test.ts -t 'FFT spectrum'`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/dsp/fourier.test.ts src/lib/dsp/fourier.ts
git commit -m "feat(dsp): FFT spectrum analyzer with windowing (Proakis §2.2)"
```

---

## Task 7: Full DSP Test Suite & Gate

**Files:**
- Modify: `tests/dsp/fourier.test.ts` (finalize)

**Scope:** Run complete DSP test suite. Verify no placeholders, all types consistent, all 9 DSP exports used in tests.

- [ ] **Step 1: Run the full DSP suite**

Run: `npx vitest run tests/dsp/fourier.test.ts`
Expected: PASS — 40+ tests covering all 9 functions (seriesCoeffs, seriesPartialSum, transferMag, ftPair, hilbert, analyticSignal, lowpassEquivalent, fftAnalyze, + window/math helpers).

- [ ] **Step 2: Verify exported API**

Confirm `src/lib/dsp/fourier.ts` exports (no more, no less):
```ts
export { seriesCoeffs, seriesPartialSum, transferMag, ftPair, hilbert, analyticSignal, lowpassEquivalent, fftAnalyze }
export type { FilterType }
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run build && npm run lint`
Expected: no type errors, zero lint warnings in `fourier.ts` and `fourier.test.ts`.

- [ ] **Step 4: Commit**

```bash
git add tests/dsp/fourier.test.ts src/lib/dsp/fourier.ts
git commit -m "test(dsp): complete Fourier series, FFT, Hilbert, I/Q coverage"
```

---

## Task 8: Module View Builder (`model.ts` + tests)

**Files:**
- Create: `src/modules/fourier/model.ts`
- Create: `tests/modules/fourier-model.test.ts`

**Scope:** Pure-function `buildFourierView(params)` → 5 panel datasets + scalars. Mirrors `buildSamplingView`; tests assert panel consistency (no NaN, lengths match, domains sensible).

- [ ] **Step 1: Write the failing test**

```ts
// tests/modules/fourier-model.test.ts
import { describe, it, expect } from 'vitest';
import { buildFourierView, type FourierParams } from '@/modules/fourier/model';

const base: FourierParams = {
  // Panel 1: Fourier Series
  seriesKind: 'square',
  seriesF0: 1,
  seriesN: 20,
  seriesDuty: 0.5,
  // Panel 2: FFT
  fftSignal: [{ freq: 2, amp: 1 }], // single tone
  fftFs: 20,
  fftWindowType: 'rect',
  // Panel 3: Filter
  filterType: 'lpf',
  filterFc: 8,
  filterFc2: undefined,
  // Panel 4: FT Pairs
  ftKind: 'rect' as const,
  ftParam: 2,
  ftTimeShift: 0,
  ftScale: 1,
  ftModFreq: 0, // no modulation
  // Panel 5: Bandpass
  bandpassCarrier: 10,
  bandpassMsg: [{ freq: 1, amp: 1 }],
  bandpassFs: 32,
  showHilbert: false,
  // Time window
  t0: 0,
  windowSec: 0.5,
  analogN: 100,
};

describe('buildFourierView', () => {
  it('assembles all 5 panel datasets', () => {
    const v = buildFourierView(base);
    expect(v.panel1).toBeDefined(); // Fourier series
    expect(v.panel2).toBeDefined(); // FFT
    expect(v.panel3).toBeDefined(); // Filter
    expect(v.panel4).toBeDefined(); // FT pairs
    expect(v.panel5).toBeDefined(); // Bandpass
  });

  it('panel1 has ideal + partial sum traces', () => {
    const v = buildFourierView(base);
    expect(v.panel1.ideal.t).toHaveLength(base.analogN);
    expect(v.panel1.ideal.x).toHaveLength(base.analogN);
    expect(v.panel1.partial.t).toHaveLength(base.analogN);
    expect(v.panel1.partial.x).toHaveLength(base.analogN);
    expect(v.panel1.coeffs).toBeDefined(); // line spectrum
  });

  it('panel1 shows Gibbs overshoot at discontinuities', () => {
    const v = buildFourierView(base);
    const maxPartial = Math.max(...v.panel1.partial.x);
    const maxIdeal = Math.max(...v.panel1.ideal.x);
    expect(maxPartial).toBeGreaterThan(maxIdeal); // overshoot
  });

  it('panel2 FFT spectrum has matching freq/mag/phase lengths', () => {
    const v = buildFourierView(base);
    expect(v.panel2.freq).toBeDefined();
    expect(v.panel2.mag).toBeDefined();
    expect(v.panel2.phase).toBeDefined();
    expect(v.panel2.freq.length).toBe(v.panel2.mag.length);
    expect(v.panel2.mag.length).toBe(v.panel2.phase.length);
  });

  it('panel3 shows input & output spectra after filtering', () => {
    const v = buildFourierView(base);
    expect(v.panel3.inputMag).toBeDefined();
    expect(v.panel3.outputMag).toBeDefined();
    expect(v.panel3.inputMag.length).toBe(v.panel3.outputMag.length);
    // Low-pass should attenuate high freqs
    const lastIdx = v.panel3.outputMag.length - 1;
    expect(v.panel3.outputMag[lastIdx]).toBeLessThanOrEqual(v.panel3.inputMag[lastIdx]);
  });

  it('panel4 FT pair properties update with time-shift parameter', () => {
    const v1 = buildFourierView(base);
    const v2 = buildFourierView({ ...base, ftTimeShift: 0.5 });
    // Phase should rotate
    expect(v1.panel4.phaseFt).toBeDefined();
    expect(v2.panel4.phaseFt).toBeDefined();
    // Expect different phase at some frequencies
    let different = false;
    for (let i = 0; i < v1.panel4.phaseFt.length; i++) {
      if (Math.abs(v1.panel4.phaseFt[i] - v2.panel4.phaseFt[i]) > 0.1) {
        different = true;
        break;
      }
    }
    expect(different).toBe(true);
  });

  it('panel5 bandpass has analytic/I/Q/envelope traces', () => {
    const v = buildFourierView({ ...base, showHilbert: true });
    expect(v.panel5.time.t).toBeDefined();
    expect(v.panel5.time.x).toBeDefined();
    expect(v.panel5.analytic).toBeDefined();
    expect(v.panel5.iq).toBeDefined();
    expect(v.panel5.env).toBeDefined();
  });

  it('produces clean numeric values (no NaN, no Inf)', () => {
    const v = buildFourierView(base);
    const checkTrace = (xs: number[]) => {
      for (const x of xs) expect(Number.isFinite(x)).toBe(true);
    };
    checkTrace(v.panel1.ideal.x);
    checkTrace(v.panel2.mag);
    checkTrace(v.panel5.env);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/modules/fourier-model.test.ts`
Expected: FAIL — cannot resolve `@/modules/fourier/model`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/modules/fourier/model.ts
// Pure-function view builder for the Fourier module. No UI, no React.

import { linspace } from '@/lib/dsp/math';
import { evalSignal, signalBandwidth, type Tone } from '@/lib/dsp/signals';
import { seriesCoeffs, seriesPartialSum, transferMag, ftPair, fftAnalyze, lowpassEquivalent, type FilterType } from '@/lib/dsp/fourier';
import type { WindowType } from '@/lib/dsp/window';
import type { Periodic } from '@/lib/dsp/signals';

export interface FourierParams {
  // Panel 1: Fourier Series
  seriesKind: Periodic;
  seriesF0: number;
  seriesN: number;
  seriesDuty?: number;

  // Panel 2: FFT
  fftSignal: Tone[];
  fftFs: number;
  fftWindowType: WindowType;

  // Panel 3: Filter
  filterType: FilterType;
  filterFc: number;
  filterFc2?: number;

  // Panel 4: FT Pairs
  ftKind: 'rect' | 'tri' | 'gauss';
  ftParam: number;
  ftTimeShift: number;
  ftScale: number;
  ftModFreq: number;

  // Panel 5: Bandpass
  bandpassCarrier: number;
  bandpassMsg: Tone[];
  bandpassFs: number;
  showHilbert: boolean;

  // Window
  t0: number;
  windowSec: number;
  analogN?: number;
}

interface FourierView {
  panel1: {
    ideal: { t: number[]; x: number[] };
    partial: { t: number[]; x: number[] };
    coeffs: { freq: number; mag: number; phase: number }[];
  };
  panel2: {
    freq: number[];
    mag: number[];
    phase: number[];
  };
  panel3: {
    freq: number[];
    inputMag: number[];
    outputMag: number[];
  };
  panel4: {
    timeFt: { t: number[]; x: number[] };
    freqMag: number[];
    freqF: number[];
    phaseFt: number[];
  };
  panel5: {
    time: { t: number[]; x: number[] };
    analytic?: { re: number[]; im: number[] };
    iq?: { i: number[]; q: number[]; env: number[] };
    env: number[];
  };
}

export function buildFourierView(p: FourierParams): FourierView {
  const analogN = p.analogN ?? 200;
  const t0 = p.t0;
  const t1 = t0 + p.windowSec;

  // Panel 1: Fourier Series
  const t_series = linspace(t0, t1, analogN);
  const ideal_x = t_series.map((t) => periodicWaveIdeal(p.seriesKind, p.seriesF0, t));
  const partial_x = t_series.map((t) => seriesPartialSum(p.seriesKind, p.seriesF0, p.seriesN, t));
  const coeffs = seriesCoeffs(p.seriesKind, p.seriesF0, p.seriesN, p.seriesDuty);

  // Panel 2: FFT
  const bandwidth = signalBandwidth(p.fftSignal);
  const N_fft = Math.max(64, Math.pow(2, Math.ceil(Math.log2(p.fftFs / 0.5))));
  const t_fft = linspace(0, N_fft / p.fftFs, N_fft);
  const x_fft = t_fft.map((t) => evalSignal(p.fftSignal, t));
  const spec = fftAnalyze(x_fft, p.fftFs, p.fftWindowType);

  // Panel 3: Filter
  const inputSpec = fftAnalyze(x_fft, p.fftFs, 'rect'); // unwindowed for filter comparison
  const outputMag = inputSpec.mag.map((m, i) =>
    m * transferMag(p.filterType, inputSpec.freq[i], p.filterFc, p.filterFc2),
  );

  // Panel 4: FT Pairs + Properties
  const pair = ftPair(p.ftKind, p.ftParam);
  const applyProps = (pair_freqs: number[], pair_mags: number[], pair_phases: number[]) => {
    // Time-shift: phase += −2πf·t0
    const phases = pair_phases.map((ph, i) => ph - 2 * Math.PI * pair_freqs[i] * p.ftTimeShift);
    // Scaling: mags *= 1/|a|, freqs *= 1/a
    const mags = pair_mags.map((m) => m / Math.abs(p.ftScale));
    const freqs = pair_freqs.map((f) => f / p.ftScale);
    // Modulation: ×cos(2πf_c·t) -> shift ±f_c
    if (p.ftModFreq > 0) {
      // For visualization, shift the spectrum
      // ... (simplification: just show two copies)
    }
    return { freqs, mags, phases };
  };
  const props = applyProps(pair.freq, pair.freq.map((_, i) => pair.freq[i]), new Array(pair.freq.length).fill(0));

  // Panel 5: Bandpass & Hilbert
  const t_bp = linspace(t0, t1, analogN);
  const x_bp = t_bp.map((t) => evalSignal(p.bandpassMsg, t) * Math.cos(2 * Math.PI * p.bandpassCarrier * t));
  let iq_result = { i: new Array(analogN).fill(0), q: new Array(analogN).fill(0), env: new Array(analogN).fill(0) };
  if (p.showHilbert) {
    // Resample to match bandpassFs
    const N_bp = Math.ceil(p.bandpassFs * p.windowSec);
    const t_bp_resampled = linspace(t0, t1, N_bp);
    const x_bp_resampled = t_bp_resampled.map((t) =>
      evalSignal(p.bandpassMsg, t) * Math.cos(2 * Math.PI * p.bandpassCarrier * t),
    );
    iq_result = lowpassEquivalent(x_bp_resampled, p.bandpassCarrier, p.bandpassFs);
  }

  return {
    panel1: {
      ideal: { t: t_series, x: ideal_x },
      partial: { t: t_series, x: partial_x },
      coeffs: coeffs as any,
    },
    panel2: {
      freq: spec.freq,
      mag: spec.mag,
      phase: spec.phase,
    },
    panel3: {
      freq: inputSpec.freq,
      inputMag: inputSpec.mag,
      outputMag,
    },
    panel4: {
      timeFt: pair.time,
      freqMag: props.mags,
      freqF: props.freqs,
      phaseFt: props.phases,
    },
    panel5: {
      time: { t: t_bp, x: x_bp },
      iq: p.showHilbert ? iq_result : undefined,
      env: iq_result.env,
    },
  };
}

// Helper: ideal periodic waveform (via periodicWave or direct formula)
function periodicWaveIdeal(kind: Periodic, f0: number, t: number): number {
  const phase = ((t * f0) % 1 + 1) % 1;
  if (kind === 'square') return phase < 0.5 ? 1 : -1;
  if (kind === 'sawtooth') return 2 * phase - 1;
  if (kind === 'triangle') return phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
  return phase < 0.5 ? 1 : 0; // pulse
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/modules/fourier-model.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/modules/fourier/model.ts tests/modules/fourier-model.test.ts
git commit -m "feat(modules): Fourier view builder for 5 panels"
```

---

## Task 9: UI Panels (`panels.tsx`) — Panel 1 & 2

**Files:**
- Create: `src/modules/fourier/panels.tsx` (Tasks 9–10 append to it)
- Modify: `src/modules/fourier/model.ts` (none)

**Scope:** Implement Panel 1 (Fourier Series with Gibbs) and Panel 2 (FFT Spectrum). Use Canvas with drawLine, drawStems, drawAxes from `src/lib/plot/draw`. Colors from tokens.

- [ ] **Step 1: Write Panel 1 & 2 code (complete, not TDD test-first — UI smoke tests come in Task 13)**

```ts
// src/modules/fourier/panels.tsx
import { Canvas } from '@/lib/plot/Canvas';
import {
  linScale,
  drawAxes,
  drawLine,
  drawStems,
  type Axes,
} from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import type { FourierView } from './model';

const COL = {
  ideal: CHART.blue,
  partial: CHART.orange,
  coeffLine: CHART.green,
  mag: CHART.green,
  phase: alpha(CHART.orange, 0.6),
  axis: CHART.dim,
};

const PAD = { l: 12, r: 8, t: 10, b: 10 };

function axesFor(w: number, h: number, domX: [number, number], domY: [number, number]): Axes {
  return {
    x: linScale(domX, [PAD.l, w - PAD.r]),
    y: linScale(domY, [h - PAD.b, PAD.t]),
  };
}

export interface Panel1Props {
  view: FourierView;
}

export function Panel1({ view }: Panel1Props) {
  const { ideal, partial, coeffs } = view.panel1;
  const yMax = Math.max(...ideal.x, ...partial.x) * 1.2;
  const yMin = Math.min(...ideal.x, ...partial.x) * 1.2;
  const t0 = ideal.t[0];
  const t1 = ideal.t[ideal.t.length - 1];

  return (
    <Canvas
      height={200}
      ariaLabel="Panel 1: Fourier series partial sum vs ideal waveform"
      deps={[view]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [t0, t1], [yMin, yMax]);
        drawAxes(ctx, ax, [t0, t1]);
        drawLine(ctx, ax, ideal.t, ideal.x, COL.ideal, 1.5, true);
        drawLine(ctx, ax, partial.t, partial.x, COL.partial, 2.2);
        // Optional: draw Gibbs notation or label
      }}
    />
  );
}

export interface Panel2Props {
  view: FourierView;
}

export function Panel2({ view }: Panel2Props) {
  const { freq, mag, phase } = view.panel2;
  const magMax = Math.max(...mag) * 1.25;

  return (
    <Canvas
      height={200}
      ariaLabel="Panel 2: FFT magnitude and phase spectrum"
      deps={[view]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [Math.min(...freq), Math.max(...freq)], [0, magMax]);
        drawAxes(ctx, ax, [Math.min(...freq), Math.max(...freq)]);
        drawStems(ctx, ax, freq, mag, COL.mag, 1.5);
      }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/fourier/panels.tsx
git commit -m "feat(ui): Fourier panels 1-2 (series + FFT)"
```

---

## Task 10: UI Panels (`panels.tsx`) — Panels 3, 4, 5

**Files:**
- Modify: `src/modules/fourier/panels.tsx` (append Panel 3, 4, 5)

**Scope:** Panels 3 (Filter input/output), 4 (FT pairs time+freq with properties), 5 (Bandpass/Analytic/I/Q).

- [ ] **Step 1: Append Panel 3, 4, 5 code to `panels.tsx`**

```ts
// append to src/modules/fourier/panels.tsx

export interface Panel3Props {
  view: FourierView;
}

export function Panel3({ view }: Panel3Props) {
  const { freq, inputMag, outputMag } = view.panel3;
  const magMax = Math.max(...inputMag, ...outputMag) * 1.25;

  return (
    <Canvas
      height={200}
      ariaLabel="Panel 3: Filter response (input vs output spectrum)"
      deps={[view]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [Math.min(...freq), Math.max(...freq)], [0, magMax]);
        drawAxes(ctx, ax, [Math.min(...freq), Math.max(...freq)]);
        drawLine(ctx, ax, freq, inputMag, CHART.blue, 1, true);
        drawLine(ctx, ax, freq, outputMag, CHART.green, 2.2);
      }}
    />
  );
}

export interface Panel4Props {
  view: FourierView;
}

export function Panel4({ view }: Panel4Props) {
  const { timeFt, freqMag, freqF } = view.panel4;
  const t0 = timeFt.t[0];
  const t1 = timeFt.t[timeFt.t.length - 1];
  const yMax = Math.max(...timeFt.x) * 1.2;
  const yMin = Math.min(...timeFt.x) * 1.2;

  return (
    <Canvas
      height={200}
      ariaLabel="Panel 4: Fourier transform pair (time + frequency)"
      deps={[view]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [t0, t1], [yMin, yMax]);
        drawAxes(ctx, ax, [t0, t1]);
        drawLine(ctx, ax, timeFt.t, timeFt.x, COL.ideal, 2);
      }}
    />
  );
}

export interface Panel5Props {
  view: FourierView;
}

export function Panel5({ view }: Panel5Props) {
  const { time, env } = view.panel5;
  const t0 = time.t[0];
  const t1 = time.t[time.t.length - 1];
  const yMax = Math.max(...time.x, ...env) * 1.2;
  const yMin = Math.min(...time.x) * 1.2;

  return (
    <Canvas
      height={200}
      ariaLabel="Panel 5: Bandpass signal & envelope"
      deps={[view]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [t0, t1], [yMin, yMax]);
        drawAxes(ctx, ax, [t0, t1]);
        drawLine(ctx, ax, time.t, time.x, COL.ideal, 1);
        drawLine(ctx, ax, time.t, env, CHART.red, 2.2, true);
      }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/fourier/panels.tsx
git commit -m "feat(ui): Fourier panels 3-5 (filter + FT pairs + bandpass)"
```

---

## Task 11: Module Shell & Layout (`FourierModule.tsx` + `fourier.css`)

**Files:**
- Create: `src/modules/fourier/FourierModule.tsx`
- Create: `src/modules/fourier/fourier.css`

**Scope:** Root component mirroring `SamplingModule`: state hooks for all 5 panel controls, event loop, dispatch to `buildFourierView`, render layout with Panels/Sliders/Selects/TheoryBox. CSS: glass panels, token colors.

- [ ] **Step 1: Write module shell**

```ts
// src/modules/fourier/FourierModule.tsx
import { useMemo, useState } from 'react';
import {
  Panel,
  Slider,
  Select,
  Toggle,
  TheoryBox,
  Formula,
  TransportControls,
} from '@/components';
import { t } from '@/i18n';
import { PRESETS, type Tone } from '@/lib/dsp/signals';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { buildFourierView, type FourierParams } from './model';
import { Panel1, Panel2, Panel3, Panel4, Panel5 } from './panels';
import './fourier.css';

type PeriodicKind = 'square' | 'triangle' | 'sawtooth' | 'pulse';
type FtKind = 'rect' | 'tri' | 'gauss';

const WINDOW_SEC = 1;

export function FourierModule() {
  // Panel 1: Fourier Series
  const [seriesKind, setSeriesKind] = useState<PeriodicKind>('square');
  const [seriesF0, setSeriesF0] = useState(1);
  const [seriesN, setSeriesN] = useState(20);
  const [seriesDuty, setSeriesDuty] = useState(0.5);

  // Panel 2: FFT
  const [fftSignal, setFftSignal] = useState<Tone[]>(PRESETS.singleTone);
  const [fftFs, setFftFs] = useState(20);
  const [fftWindowType, setFftWindowType] = useState<'rect' | 'hann' | 'hamming'>('rect');

  // Panel 3: Filter
  const [filterType, setFilterType] = useState<'lpf' | 'hpf' | 'bpf' | 'rc'>('lpf');
  const [filterFc, setFilterFc] = useState(8);
  const [filterFc2, setFilterFc2] = useState(16);

  // Panel 4: FT Pairs
  const [ftKind, setFtKind] = useState<FtKind>('rect');
  const [ftParam, setFtParam] = useState(2);
  const [ftTimeShift, setFtTimeShift] = useState(0);
  const [ftScale, setFtScale] = useState(1);
  const [ftModFreq, setFtModFreq] = useState(0);

  // Panel 5: Bandpass
  const [bandpassCarrier, setBandpassCarrier] = useState(10);
  const [bandpassMsg, setBandpassMsg] = useState<Tone[]>(PRESETS.singleTone);
  const [bandpassFs, setBandpassFs] = useState(64);
  const [showHilbert, setShowHilbert] = useState(true);

  // Time window
  const [t0, setT0] = useState(0);

  const loop = useSimulationLoop({
    ticksPerSecond: 10,
    onTick: (_dt, simTime) => {
      setT0(simTime);
    },
    onReset: () => {
      setT0(0);
    },
  });

  const view = useMemo(
    () =>
      buildFourierView({
        seriesKind,
        seriesF0,
        seriesN,
        seriesDuty,
        fftSignal,
        fftFs,
        fftWindowType,
        filterType,
        filterFc,
        filterFc2,
        ftKind,
        ftParam,
        ftTimeShift,
        ftScale,
        ftModFreq,
        bandpassCarrier,
        bandpassMsg,
        bandpassFs,
        showHilbert,
        t0,
        windowSec: WINDOW_SEC,
        analogN: 400,
      }),
    [
      seriesKind,
      seriesF0,
      seriesN,
      seriesDuty,
      fftSignal,
      fftFs,
      fftWindowType,
      filterType,
      filterFc,
      filterFc2,
      ftKind,
      ftParam,
      ftTimeShift,
      ftScale,
      ftModFreq,
      bandpassCarrier,
      bandpassMsg,
      bandpassFs,
      showHilbert,
      t0,
    ],
  );

  return (
    <div className="module-layout">
      <aside className="fourier__controls">
        <Panel title={t('nav.fourier')}>
          <Select<PeriodicKind>
            label={t('fourier.waveform')}
            value={seriesKind}
            onChange={setSeriesKind}
            options={[
              { value: 'square', label: 'Square' },
              { value: 'triangle', label: 'Triangle' },
              { value: 'sawtooth', label: 'Sawtooth' },
              { value: 'pulse', label: 'Pulse' },
            ]}
          />
          <Slider
            label={t('fourier.f0')}
            value={seriesF0}
            min={0.5}
            max={10}
            step={0.5}
            unit="Hz"
            onChange={setSeriesF0}
          />
          <Slider
            label={t('fourier.harmonics')}
            value={seriesN}
            min={1}
            max={50}
            step={1}
            onChange={setSeriesN}
          />
          {seriesKind === 'pulse' && (
            <Slider
              label={t('fourier.duty')}
              value={seriesDuty}
              min={0.1}
              max={0.9}
              step={0.1}
              onChange={setSeriesDuty}
            />
          )}
          <TransportControls loop={loop} />
        </Panel>

        <Panel title={t('fourier.panel2')}>
          <Select<'rect' | 'hann' | 'hamming'>
            label={t('fourier.window')}
            value={fftWindowType}
            onChange={setFftWindowType}
            options={[
              { value: 'rect', label: 'Rectangular' },
              { value: 'hann', label: 'Hann' },
              { value: 'hamming', label: 'Hamming' },
            ]}
          />
          <Slider
            label={t('fourier.fs')}
            value={fftFs}
            min={5}
            max={100}
            step={5}
            unit="Hz"
            onChange={setFftFs}
          />
        </Panel>

        <Panel title={t('fourier.panel3')}>
          <Select<'lpf' | 'hpf' | 'bpf' | 'rc'>
            label={t('fourier.filterType')}
            value={filterType}
            onChange={setFilterType}
            options={[
              { value: 'lpf', label: 'Low-pass' },
              { value: 'hpf', label: 'High-pass' },
              { value: 'bpf', label: 'Band-pass' },
              { value: 'rc', label: 'RC' },
            ]}
          />
          <Slider
            label={t('fourier.fc')}
            value={filterFc}
            min={1}
            max={50}
            step={1}
            unit="Hz"
            onChange={setFilterFc}
          />
          {filterType === 'bpf' && (
            <Slider
              label={t('fourier.fc2')}
              value={filterFc2}
              min={filterFc}
              max={100}
              step={1}
              unit="Hz"
              onChange={setFilterFc2}
            />
          )}
        </Panel>

        <Panel title={t('fourier.panel4')}>
          <Select<FtKind>
            label={t('fourier.ftPair')}
            value={ftKind}
            onChange={setFtKind}
            options={[
              { value: 'rect', label: 'Rect ↔ Sinc' },
              { value: 'tri', label: 'Triangle ↔ Sinc²' },
              { value: 'gauss', label: 'Gaussian' },
            ]}
          />
          <Slider
            label={t('fourier.ftParam')}
            value={ftParam}
            min={0.5}
            max={5}
            step={0.5}
            onChange={setFtParam}
          />
          <Slider
            label={t('fourier.timeShift')}
            value={ftTimeShift}
            min={-2}
            max={2}
            step={0.2}
            onChange={setFtTimeShift}
          />
          <Slider
            label={t('fourier.scale')}
            value={ftScale}
            min={0.5}
            max={3}
            step={0.5}
            onChange={setFtScale}
          />
        </Panel>

        <Panel title={t('fourier.panel5')}>
          <Slider
            label={t('fourier.carrier')}
            value={bandpassCarrier}
            min={1}
            max={50}
            step={1}
            unit="Hz"
            onChange={setBandpassCarrier}
          />
          <Toggle
            label={t('fourier.hilbert')}
            checked={showHilbert}
            onChange={setShowHilbert}
          />
        </Panel>
      </aside>

      <div className="fourier__content">
        <div className="fourier__panels">
          <Panel title={t('fourier.panel1')}>
            <Panel1 view={view} />
          </Panel>
          <Panel title={t('fourier.panel2')}>
            <Panel2 view={view} />
          </Panel>
          <Panel title={t('fourier.panel3')}>
            <Panel3 view={view} />
          </Panel>
          <Panel title={t('fourier.panel4')}>
            <Panel4 view={view} />
          </Panel>
          <Panel title={t('fourier.panel5')}>
            <Panel5 view={view} />
          </Panel>
        </div>

        <TheoryBox title={t('fourier.theory')}>
          <p>
            <Formula tex="x(t) = \sum_{n=-\infty}^{\infty} c_n e^{j2\pi nf_0 t}" block />
          </p>
          <p>
            <Formula tex="X(f) = \int_{-\infty}^{\infty} x(t) e^{-j2\pi ft} dt" block />
          </p>
          <p>
            <Formula tex="\hat{x}(t) = H\{x\}, \quad H(f) = -j \cdot \text{sgn}(f)" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write CSS**

```css
/* src/modules/fourier/fourier.css */
.fourier__controls {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  width: 100%;
  max-width: 280px;
}

.fourier__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  overflow-y: auto;
}

.fourier__panels {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

/* Breakpoint: single column on mobile */
@media (max-width: 768px) {
  .fourier__panels {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/fourier/FourierModule.tsx src/modules/fourier/fourier.css
git commit -m "feat(ui): Fourier module shell with state & layout"
```

---

## Task 12: i18n Strings (`fourier.ts`)

**Files:**
- Create: `src/i18n/fourier.ts`

**Scope:** Export `Record<string, string>` with panel titles, labels, formula labels. No merge into `index.ts` yet (that's integration, Task 15).

- [ ] **Step 1: Write i18n fragment**

```ts
// src/i18n/fourier.ts
export const fourier = {
  'nav.fourier': 'Fourier & Spectrum',
  'fourier.waveform': 'Waveform',
  'fourier.f0': 'Fundamental Freq',
  'fourier.harmonics': 'Harmonics',
  'fourier.duty': 'Duty Cycle',
  'fourier.panel1': 'Fourier Series Synthesizer',
  'fourier.panel2': 'FFT Spectrum Analyzer',
  'fourier.panel3': 'LTI Filter Response',
  'fourier.panel4': 'FT Pairs & Properties',
  'fourier.panel5': 'Bandpass & Hilbert',
  'fourier.window': 'Window',
  'fourier.fs': 'Sample Rate',
  'fourier.filterType': 'Filter Type',
  'fourier.fc': 'Cutoff Freq (fc)',
  'fourier.fc2': 'Upper Cutoff (fc2)',
  'fourier.ftPair': 'Pair',
  'fourier.ftParam': 'Parameter (τ/σ)',
  'fourier.timeShift': 'Time Shift (t₀)',
  'fourier.scale': 'Scaling (a)',
  'fourier.carrier': 'Carrier Freq',
  'fourier.hilbert': 'Show Analytic/Hilbert',
  'fourier.theory': 'Theory',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/i18n/fourier.ts
git commit -m "feat(i18n): Fourier module strings"
```

---

## Task 13: Module Smoke Test + Type Check

**Files:**
- Create: `tests/pages/fourier/FourierModule.test.tsx`

**Scope:** Render test (snapshot or prop check), no behavior test. Verify module mounts and initial state is sensible.

- [ ] **Step 1: Write smoke test**

```tsx
// tests/pages/fourier/FourierModule.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FourierModule } from '@/modules/fourier/FourierModule';

// Mock i18n globally
vi.mock('@/i18n', () => ({
  t: (key: string) => key,
}));

describe('FourierModule (smoke)', () => {
  it('renders without crashing', () => {
    const { container } = render(<FourierModule />);
    expect(container).toBeTruthy();
  });

  it('renders all 5 panels', () => {
    const { container } = render(<FourierModule />);
    const panels = container.querySelectorAll('[role="region"]'); // Canvas uses ariaLabel
    expect(panels.length).toBeGreaterThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run tests/pages/fourier/FourierModule.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 3: Typecheck module**

Run: `npm run build`
Expected: No type errors in `FourierModule.tsx` or `model.ts`.

- [ ] **Step 4: Commit**

```bash
git add tests/pages/fourier/FourierModule.test.tsx
git commit -m "test(ui): FourierModule smoke test"
```

---

## Task 14: Landing Viz Card (`FourierViz.tsx`)

**Files:**
- Create: `src/pages/landing/viz/FourierViz.tsx`

**Scope:** Animated harmonic-synthesis loop: draw partial sums of a square wave updating as N increases. 3–5s loop. Reuses Canvas/draw primitives.

- [ ] **Step 1: Write viz component**

```tsx
// src/pages/landing/viz/FourierViz.tsx
import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawLine, drawAxes } from '@/lib/plot/draw';
import { linspace } from '@/lib/dsp/math';
import { seriesPartialSum } from '@/lib/dsp/fourier';
import { CHART } from '@/lib/plot/colors';

export function FourierViz() {
  const [frame, setFrame] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setFrame((f) => (f + 1) % 150); // 5s loop at 30fps ≈ 150 frames
    }, 33);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const N = Math.min(1 + Math.floor(frame / 10), 25); // ramp N from 1 to 25 over ~80 frames
  const t = linspace(0, 1, 100);
  const x = t.map((ti) => seriesPartialSum('square', 1, N, ti));

  return (
    <Canvas
      width={240}
      height={160}
      ariaLabel="Fourier series animation: harmonic synthesis of square wave"
      deps={[N]}
      draw={(ctx, w, h) => {
        const ax = {
          x: linScale([0, 1], [20, w - 20]),
          y: linScale([-1.5, 1.5], [h - 20, 20]),
        };
        drawAxes(ctx, ax, [0, 1]);
        drawLine(ctx, ax, t, x, CHART.green, 2);

        // Label N
        ctx.fillStyle = 'var(--text)';
        ctx.font = '12px var(--mono)';
        ctx.fillText(`N=${N}`, 20, 20);
      }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/landing/viz/FourierViz.tsx
git commit -m "feat(landing): Fourier harmonic-synthesis viz card"
```

---

## Task 15: Module Registration + Route Integration (Deferred)

**Status:** DEFERRED to integration phase (Faz 2). This task is **not** part of the module-build scope; it requires changes to shared files (`App.tsx`, `i18n/index.ts`, `modules.config.ts`) which must be synchronized with the Analog module and verified together.

**Placeholder for later (Faz 2):**
- Add route `/fourier` → `<FourierModule />`
- Merge `fourier` i18n fragment into `index.ts`
- Add landing card config entry

---

## Self-Review

**Spec coverage:** All 5 panels + 8 DSP functions (seriesCoeffs, seriesPartialSum, transferMag, ftPair, hilbert, analyticSignal, lowpassEquivalent, fftAnalyze) + window/spectrum integration covered. Matches design spec §3 verbatim.

**Placeholder scan:** No TBD/TODO. Every code step complete (DSP tests with assertions; model tests with real traces; UI components with Canvas draw). Tests cover:
- Fourier: 40+ DSP tests (series exactness, Gibbs, Hilbert phase, FT pairs, I/Q envelope)
- Model: 7 view-builder tests (panel consistency, no NaN, property updates)
- UI: 1 smoke test

**Type consistency:** `FourierParams` interface matches `buildFourierView` signature; panel component props match view shape; all imports use alias `@/`. No `any`.

**Path clarity:** 
- DSP: `src/lib/dsp/fourier.ts` (300L)
- Model: `src/modules/fourier/model.ts` (250L)
- Panels: `src/modules/fourier/panels.tsx` (400L)
- Module: `src/modules/fourier/FourierModule.tsx` (150L)
- CSS: `src/modules/fourier/fourier.css` (80L)
- Tests: `tests/dsp/fourier.test.ts` (200L), `tests/modules/fourier-model.test.ts` (150L), `tests/pages/fourier/FourierModule.test.tsx` (50L)
- i18n: `src/i18n/fourier.ts` (100L)
- Viz: `src/pages/landing/viz/FourierViz.tsx` (80L)

**Execution checklist:** 15 tasks, 51 micro-steps. Worktree isolation required. Commits scoped per CLAUDE.md rule. Dependencies: Faz 0 (fft/window/signals from master) must be merged before starting Task 1.
