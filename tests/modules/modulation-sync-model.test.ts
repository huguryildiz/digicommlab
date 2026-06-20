import { describe, it, expect } from 'vitest';
import { buildPllView, buildTimingView } from '@/modules/modulation/sync-model';

describe('buildPllView', () => {
  it('produces a converging phase-error trace and its time axis', () => {
    const v = buildPllView({ zeta: 1.0, omegaN: 2, phi0Deg: 60 });
    expect(v.trace.length).toBeGreaterThan(100);
    expect(v.trace[0].t).toBeCloseTo(0, 12);
    expect(Math.abs(v.trace[v.trace.length - 1].err)).toBeLessThan(0.05);
    // damping label classifies the regime (ζ = 1 is critical)
    expect(v.regime).toBe('critical');
  });
  it('labels under/over-damped regimes', () => {
    expect(buildPllView({ zeta: 0.3, omegaN: 2, phi0Deg: 60 }).regime).toBe('under');
    expect(buildPllView({ zeta: 2, omegaN: 2, phi0Deg: 60 }).regime).toBe('over');
  });
});

describe('buildTimingView', () => {
  it('exposes the autocorrelation peak, early/late samples and the S-curve', () => {
    const v = buildTimingView({ tau: 0.2, delta: 0.25 });
    expect(v.autocorr.length).toBeGreaterThan(50);
    expect(v.early.x).toBeCloseTo(0.2 - 0.25, 12);
    expect(v.late.x).toBeCloseTo(0.2 + 0.25, 12);
    expect(v.sCurve.length).toBeGreaterThan(10);
    // current error matches the discriminator at τ
    expect(v.errorNow).toBeCloseTo(v.early.y - v.late.y, 9);
  });
});
