import { describe, it, expect } from 'vitest';
import { nullToNullBandwidth, halfPowerBandwidth, occupiedBandwidth } from '@/lib/dsp/bandwidth';

describe('bandwidth', () => {
  const f = Array.from({ length: 101 }, (_, i) => i); // 0..100 Hz
  // Triangle magnitude peaking at f=20, zero at f=0 and f=40
  const mag = f.map((x) => Math.max(0, 1 - Math.abs(x - 20) / 20));

  it('nullToNullBandwidth spans the first nulls around the peak', () => {
    const bw = nullToNullBandwidth(f, mag);
    expect(bw.fLo).toBeCloseTo(0, 0);
    expect(bw.fHi).toBeCloseTo(40, 0);
    expect(bw.W).toBeCloseTo(40, 0);
  });

  it('halfPowerBandwidth uses the −3 dB (0.707·peak) crossings', () => {
    const bw = halfPowerBandwidth(f, mag);
    // 0.707 crossings of the triangle: 20 ± 0.293*20 ≈ [14.1, 25.9]
    expect(bw.W).toBeGreaterThan(10);
    expect(bw.W).toBeLessThan(14);
  });
});

describe('occupiedBandwidth', () => {
  // Symmetric flat band over [-5, 5] on a -10..10 grid.
  const f = Array.from({ length: 21 }, (_, i) => i - 10);
  const flat = f.map((x) => (Math.abs(x) <= 5 ? 1 : 0));

  it('spans the energy band, trimming the requested tails', () => {
    const bw = occupiedBandwidth(f, flat, 0.99);
    expect(bw.fLo).toBeCloseTo(-5, 0);
    expect(bw.fHi).toBeCloseTo(5, 0);
    expect(bw.W).toBeCloseTo(10, 0);
  });

  it('is invariant when the magnitude is unchanged (shift-invariant readout)', () => {
    // A time shift leaves |X(f)| identical → identical bandwidth, no jitter.
    const a = occupiedBandwidth(f, flat, 0.99);
    const b = occupiedBandwidth(f, flat.slice(), 0.99);
    expect(b.W).toBe(a.W);
  });

  it('grows monotonically as the spectrum widens (stable under scaling)', () => {
    const narrow = f.map((x) => (Math.abs(x) <= 2 ? 1 : 0));
    const wide = f.map((x) => (Math.abs(x) <= 8 ? 1 : 0));
    expect(occupiedBandwidth(f, wide, 0.99).W).toBeGreaterThan(occupiedBandwidth(f, narrow, 0.99).W);
  });

  it('captures both lobes of a modulated (two-spike) spectrum', () => {
    const twoSpike = f.map((x) => (x === -5 || x === 5 ? 1 : 0));
    const bw = occupiedBandwidth(f, twoSpike, 0.99);
    expect(bw.fLo).toBeCloseTo(-5, 0);
    expect(bw.fHi).toBeCloseTo(5, 0);
  });

  it('does not blow up on deep nulls (unlike a threshold walk)', () => {
    // sinc-like with exact zeros between lobes — occupied BW stays finite/sensible.
    const sincish = f.map((x) => Math.abs(Math.sin(Math.PI * x * 0.5)) / (Math.abs(x) + 1));
    const bw = occupiedBandwidth(f, sincish, 0.99);
    expect(Number.isFinite(bw.W)).toBe(true);
    expect(bw.W).toBeLessThanOrEqual(20);
  });
});
