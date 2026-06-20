import { describe, it, expect } from 'vitest';
import {
  oversample,
  sigmaDeltaModulate,
  sigmaDeltaDecode,
  sigmaDeltaSnrDb,
} from '@/lib/dsp/sigmadelta';

describe('oversample', () => {
  it('linearly interpolates by the integer ratio', () => {
    const up = oversample([0, 1], 4);
    expect(up).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
  it('returns a copy when ratio ≤ 1', () => {
    expect(oversample([1, 2, 3], 1)).toEqual([1, 2, 3]);
  });
});

describe('sigmaDeltaModulate', () => {
  it('outputs ±1 bits, one per input sample', () => {
    const x = Array.from({ length: 64 }, (_, n) => 0.5 * Math.sin((2 * Math.PI * n) / 64));
    const { bits, integrator, error } = sigmaDeltaModulate(x);
    expect(bits).toHaveLength(64);
    expect(integrator).toHaveLength(64);
    expect(error).toHaveLength(64);
    for (const b of bits) expect(Math.abs(b)).toBe(1);
  });

  it('the average bit value tracks a DC input (the loop is in balance)', () => {
    const dc = 0.3;
    const x = new Array(2000).fill(dc);
    const { bits } = sigmaDeltaModulate(x);
    const mean = bits.reduce((s, b) => s + b, 0) / bits.length;
    expect(mean).toBeCloseTo(dc, 1);
  });
});

describe('sigmaDeltaDecode', () => {
  it('lowpass-averaged bitstream recovers a slow input', () => {
    const x = Array.from({ length: 512 }, (_, n) => 0.6 * Math.sin((2 * Math.PI * n) / 512));
    const { bits } = sigmaDeltaModulate(x);
    const rec = sigmaDeltaDecode(bits, 32);
    // Compare on the settled tail (skip the moving-average warm-up).
    let se = 0;
    let cnt = 0;
    for (let n = 64; n < x.length; n++) {
      se += (rec[n] - x[n]) ** 2;
      cnt++;
    }
    expect(Math.sqrt(se / cnt)).toBeLessThan(0.15);
  });
});

describe('sigmaDeltaSnrDb', () => {
  it('first-order noise shaping adds ≈ 9 dB per octave of OSR', () => {
    const a = sigmaDeltaSnrDb(64);
    const b = sigmaDeltaSnrDb(128);
    expect(b - a).toBeCloseTo(30 * Math.log10(2), 6); // ≈ 9.03 dB
  });
  it('increases with oversampling ratio', () => {
    expect(sigmaDeltaSnrDb(256)).toBeGreaterThan(sigmaDeltaSnrDb(16));
  });
});
