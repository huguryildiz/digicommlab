import { describe, it, expect } from 'vitest';
import { simulatePll, phaseErrorVariance, mlPhaseEstimate } from '@/lib/dsp/pll';

describe('simulatePll (2nd-order loop, §8.8.1)', () => {
  it('locks: the phase error converges toward zero from the initial offset', () => {
    const r = simulatePll({ zeta: 0.707, omegaN: 2, dt: 0.02, steps: 800, phi0: 1.0 });
    expect(r.phaseError[0]).toBeCloseTo(1.0, 6);
    expect(Math.abs(r.phaseError[r.phaseError.length - 1])).toBeLessThan(0.02);
  });
  it('underdamped rings more than overdamped (more zero crossings)', () => {
    const signChanges = (e: number[]) => {
      let c = 0;
      for (let i = 1; i < e.length; i++) if (e[i] < 0 !== e[i - 1] < 0) c++;
      return c;
    };
    const under = simulatePll({ zeta: 0.25, omegaN: 3, dt: 0.02, steps: 800, phi0: 1.0 });
    const over = simulatePll({ zeta: 2.5, omegaN: 3, dt: 0.02, steps: 800, phi0: 1.0 });
    expect(under.phaseError.some((e) => e < -1e-3)).toBe(true); // it overshoots
    expect(signChanges(under.phaseError)).toBeGreaterThan(signChanges(over.phaseError));
  });
});

describe('phaseErrorVariance', () => {
  it('is 1/ρ_L (Eq. 8.8.21)', () => {
    expect(phaseErrorVariance(50)).toBeCloseTo(1 / 50, 12);
  });
});

describe('mlPhaseEstimate', () => {
  it('recovers an injected carrier phase from quadrature correlator sums', () => {
    const phi = 0.7;
    const yc: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < 200; i++) {
      yc.push(Math.cos(phi));
      ys.push(Math.sin(phi));
    }
    expect(mlPhaseEstimate(yc, ys)).toBeCloseTo(phi, 6);
  });
});
