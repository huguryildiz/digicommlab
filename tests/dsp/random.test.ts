import { describe, it, expect } from 'vitest';
import { makeRng, generateEnsemble, type ProcessParams } from '@/lib/dsp/random';

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
