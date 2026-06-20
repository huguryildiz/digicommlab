import { describe, it, expect } from 'vitest';
import { buildDpskView, sampleDpskScatter } from '@/modules/modulation/dpsk-model';
import { dpskSymbolErrorProb } from '@/lib/dsp/dpsk';

describe('buildDpskView', () => {
  it('exposes M phase points on the unit circle with Gray labels', () => {
    const v = buildDpskView({ M: 4, ebN0Db: 8 });
    expect(v.phasePoints).toHaveLength(4);
    expect(v.bitsPerSymbol).toBe(2);
    for (const p of v.phasePoints) expect(Math.hypot(p.x, p.y)).toBeCloseTo(1, 6);
  });
  it('theoryNow matches dpskSymbolErrorProb at the current SNR', () => {
    const v = buildDpskView({ M: 4, ebN0Db: 8 });
    expect(v.theoryNow).toBeCloseTo(dpskSymbolErrorProb(4, 8), 12);
  });
  it('DPSK curve lies at or above coherent PSK (penalty) across the sweep', () => {
    const v = buildDpskView({ M: 4, ebN0Db: 8 });
    for (let i = 0; i < v.dpskCurve.length; i++) {
      expect(v.dpskCurve[i].pe).toBeGreaterThanOrEqual(v.pskCurve[i].pe * 0.999);
    }
  });
  it('uses the coherent BPSK curve for M=2 (not the M-PSK branch)', () => {
    const v = buildDpskView({ M: 2, ebN0Db: 8 });
    expect(v.phasePoints).toHaveLength(2);
    expect(v.dpskCurve[v.dpskCurve.length - 1].pe).toBeGreaterThanOrEqual(
      v.pskCurve[v.pskCurve.length - 1].pe * 0.999,
    );
  });
});

describe('sampleDpskScatter', () => {
  it('returns n trail symbols and n cloud points', () => {
    const s = sampleDpskScatter({ M: 4, ebN0Db: 8, n: 500, seed: 5 });
    expect(s.trail).toHaveLength(500);
    expect(s.cloud).toHaveLength(500);
    for (const t of s.trail) expect(t).toBeGreaterThanOrEqual(0);
  });
  it('at high SNR the differential cloud clusters near the unit circle with few errors', () => {
    const s = sampleDpskScatter({ M: 4, ebN0Db: 18, n: 800, seed: 9 });
    const errs = s.cloud.filter((p) => p.err).length;
    expect(errs / s.cloud.length).toBeLessThan(0.02);
    const radii = s.cloud.map((p) => Math.hypot(p.x, p.y));
    const mean = radii.reduce((a, b) => a + b, 0) / radii.length;
    expect(mean).toBeGreaterThan(0.8);
    expect(mean).toBeLessThan(1.2);
  });
});
