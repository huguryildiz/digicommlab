import { describe, it, expect } from 'vitest';
import {
  makeRng,
  generateEnsemble,
  genTwoSineEnsembles,
  crossCorrelation,
  thermalNoisePsd,
  rcNoiseEquivBandwidth,
  type ProcessParams,
} from '@/lib/dsp/random';

describe('makeRng', () => {
  it('is deterministic for a given seed', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0,1)', () => {
    const r = makeRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('differs across seeds', () => {
    expect(makeRng(1)()).not.toEqual(makeRng(2)());
  });
});

const base: ProcessParams = {
  kind: 'white-gaussian',
  amplitude: 1,
  f0: 5,
  n0: 1,
  fs: 200,
  M: 400,
  N: 256,
  seed: 123,
  filterKind: 'rc',
  cutoff: 20,
};

function variance(x: Float64Array): number {
  const m = x.reduce((s, v) => s + v, 0) / x.length;
  return x.reduce((s, v) => s + (v - m) * (v - m), 0) / x.length;
}

describe('generateEnsemble', () => {
  it('returns M realizations of length N', () => {
    const e = generateEnsemble(base);
    expect(e.length).toBe(base.M);
    expect(e[0].length).toBe(base.N);
  });

  it('is reproducible for the same seed', () => {
    const a = generateEnsemble(base);
    const b = generateEnsemble(base);
    expect(Array.from(a[0])).toEqual(Array.from(b[0]));
  });

  it('random-phase sine has power ~ A^2/2', () => {
    const e = generateEnsemble({ ...base, kind: 'randphase-sine', amplitude: 2, N: 1024 });
    const p = variance(e[0]); // zero-mean
    expect(p).toBeGreaterThan(1.6); // A^2/2 = 2
    expect(p).toBeLessThan(2.4);
  });

  it('white process is near zero-mean with positive variance', () => {
    const e = generateEnsemble({ ...base, kind: 'white-gaussian', N: 4096 });
    const mean = e[0].reduce((s, v) => s + v, 0) / e[0].length;
    expect(Math.abs(mean)).toBeLessThan(0.1);
    expect(variance(e[0])).toBeGreaterThan(0);
  });
});

describe('colored & nrz generators', () => {
  it('colored noise is lower-power than its white input variance (LPF removes power)', () => {
    const white = generateEnsemble({ ...base, kind: 'white-gaussian', N: 4096 });
    const colored = generateEnsemble({ ...base, kind: 'colored', cutoff: 10, N: 4096 });
    expect(variance(colored[0])).toBeLessThan(variance(white[0]));
  });

  it('binary NRZ takes only ±A values', () => {
    const e = generateEnsemble({ ...base, kind: 'binary-nrz', amplitude: 1, f0: 10, N: 512 });
    const vals = new Set(Array.from(e[0]).map((v) => Math.round(v * 1000) / 1000));
    for (const v of vals) expect([1, -1]).toContain(v);
  });
});

import { ensembleMean, ensembleAutocorr, timeAutocorr, periodogram } from '@/lib/dsp/random';

describe('estimators', () => {
  it('ensembleMean of zero-mean white ~ 0 across the record', () => {
    const e = generateEnsemble({ ...base, kind: 'white-gaussian', M: 800, N: 64 });
    const m = ensembleMean(e);
    expect(m.length).toBe(64);
    const avg = m.reduce((s, v) => s + Math.abs(v), 0) / m.length;
    expect(avg).toBeLessThan(0.15);
  });

  it('white autocorrelation is a spike at lag 0', () => {
    const e = generateEnsemble({ ...base, kind: 'white-gaussian', M: 600, N: 256 });
    const r = ensembleAutocorr(e, 20);
    const norm = r.map((v) => v / r[0]);
    expect(norm[0]).toBeCloseTo(1, 5);
    for (let k = 2; k < norm.length; k++) expect(Math.abs(norm[k])).toBeLessThan(0.3);
  });

  it('sine autocorrelation matches (A^2/2)cos(2π f0 τ), normalized', () => {
    const N = 1024;
    const p = { ...base, kind: 'randphase-sine' as const, amplitude: 1, f0: 5, fs: 200, N, M: 1 };
    const r = timeAutocorr(generateEnsemble(p)[0], 80);
    const norm = r.map((v) => v / r[0]);
    // τ = lag/fs; the biased estimator's expected value is the (N-k)/N taper times cos(2π f0 τ).
    for (let k = 0; k < norm.length; k += 10) {
      const taper = (N - k) / N;
      const expected = taper * Math.cos((2 * Math.PI * p.f0 * k) / p.fs);
      expect(norm[k]).toBeCloseTo(expected, 1);
    }
  });

  it('periodogram of white noise is approximately flat', () => {
    const e = generateEnsemble({ ...base, kind: 'white-gaussian', M: 400, N: 256 });
    const s = periodogram(e);
    const mean = s.reduce((a, b) => a + b, 0) / s.length;
    const maxDev = Math.max(...s.map((v) => Math.abs(v - mean))) / mean;
    expect(maxDev).toBeLessThan(0.6); // averaged over 400 realizations → fairly flat
  });
});

import { theoreticalAutocorr, filterMagSq } from '@/lib/dsp/random';

describe('theoretical references', () => {
  it('sine theoretical autocorr is (A^2/2)cos(2π f0 τ)', () => {
    const p = { ...base, kind: 'randphase-sine' as const, amplitude: 2, f0: 4 };
    const lags = [0, 5, 10];
    const tau = lags.map((k) => k / p.fs);
    const r = theoreticalAutocorr(p, Float64Array.from(tau));
    for (let i = 0; i < lags.length; i++) {
      expect(r[i]).toBeCloseTo((p.amplitude ** 2 / 2) * Math.cos(2 * Math.PI * p.f0 * tau[i]), 6);
    }
  });

  it('NRZ theoretical autocorr is triangular, zero at τ = T', () => {
    const p = { ...base, kind: 'binary-nrz' as const, amplitude: 1, f0: 10 };
    const T = 1 / p.f0;
    const r = theoreticalAutocorr(p, Float64Array.from([0, T / 2, T, 2 * T]));
    expect(r[0]).toBeCloseTo(1, 6); // A^2
    expect(r[1]).toBeCloseTo(0.5, 6);
    expect(r[2]).toBeCloseTo(0, 6);
    expect(r[3]).toBeCloseTo(0, 6);
  });

  it('white theoretical autocorr is N0/2 spike at lag 0, on the same scale as the estimate', () => {
    const p = { ...base, kind: 'white-gaussian' as const, n0: 1, N: 4096, M: 1 };
    const r = theoreticalAutocorr(p, Float64Array.from([0, 0.01, 0.02]));
    expect(r[0]).toBeCloseTo(p.n0 / 2, 6); // variance N0/2, NOT scaled by fs
    expect(r[1]).toBe(0);
    expect(r[2]).toBe(0);
    // theory at lag 0 must match the generated process variance (estimator) within Monte-Carlo tolerance
    const est = timeAutocorr(generateEnsemble(p)[0], 4);
    expect(est[0]).toBeCloseTo(r[0], 1);
  });

  it('RC filter magnitude-squared is 1 at DC and 0.5 at cutoff', () => {
    const p = { ...base, filterKind: 'rc' as const, cutoff: 10 };
    const h = filterMagSq(p, Float64Array.from([0, p.cutoff]));
    expect(h[0]).toBeCloseTo(1, 6);
    expect(h[1]).toBeCloseTo(0.5, 6);
  });

  it('ideal LPF magnitude-squared is a brick wall at cutoff', () => {
    const p = { ...base, filterKind: 'ideal-lpf' as const, cutoff: 10 };
    const h = filterMagSq(p, Float64Array.from([5, 15]));
    expect(h[0]).toBe(1);
    expect(h[1]).toBe(0);
  });
});

describe('multiple processes (§5.2.3 / §5.2.6)', () => {
  const two: ProcessParams = {
    kind: 'randphase-sine',
    amplitude: 1,
    f0: 5,
    n0: 1,
    fs: 200,
    M: 300,
    N: 256,
    seed: 3,
    filterKind: 'rc',
    cutoff: 20,
  };

  it('cross-correlation at zero lag matches (A²/2)cosφ', () => {
    const maxLag = 40;
    for (const phiDeg of [0, 90, 180]) {
      const phi = (phiDeg * Math.PI) / 180;
      const { x, y } = genTwoSineEnsembles(two, phi);
      const rxy = crossCorrelation(x, y, maxLag);
      const atZero = rxy[maxLag]; // index maxLag → lag 0
      const theory = (two.amplitude ** 2 / 2) * Math.cos(phi);
      expect(atZero).toBeCloseTo(theory, 1);
    }
  });

  it('φ = 90° makes the two sinusoids uncorrelated at zero lag', () => {
    const { x, y } = genTwoSineEnsembles(two, Math.PI / 2);
    const rxy = crossCorrelation(x, y, 20);
    expect(Math.abs(rxy[20])).toBeLessThan(0.05);
  });

  it('sum-process power adds the cross term: P_Z = A²(1+cosφ)', () => {
    const phi = Math.PI / 3; // 60°
    const { x, y } = genTwoSineEnsembles(two, phi);
    const z = x.map((xi, m) => xi.map((v, n) => v + y[m][n]));
    // mean power of Z across the ensemble
    let pz = 0;
    for (const zi of z) for (const v of zi) pz += v * v;
    pz /= z.length * z[0].length;
    const theory = two.amplitude ** 2 * (1 + Math.cos(phi));
    expect(pz).toBeCloseTo(theory, 1);
  });
});

describe('white & thermal noise (§5.3.2)', () => {
  it('thermal PSD is flat (≈ kT) at low f and rolls off at high f', () => {
    const kT = 1.380649e-23 * 300;
    expect(thermalNoisePsd(1e6, 300) / kT).toBeCloseTo(1, 5); // 1 MHz ≈ kT (relative)
    expect(thermalNoisePsd(0, 300) / kT).toBeCloseTo(1, 9); // f → 0 limit
    expect(thermalNoisePsd(1e13, 300)).toBeLessThan(kT * 0.9); // rolls off near 10 THz
  });
  it('RC noise-equivalent bandwidth is π f_c / 2', () => {
    expect(rcNoiseEquivBandwidth(20)).toBeCloseTo((Math.PI * 20) / 2, 9);
  });
});
