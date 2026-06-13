import { describe, it, expect } from 'vitest';
import {
  OPT_RX_SIGNAL_SETS,
  buildOptRxView,
  type OptRxParams,
} from '@/modules/modulation/model';

const base: OptRxParams = { signalSetId: 'binary', ebN0Db: 8, symbolIndex: 0, sps: 32 };

describe('buildOptRxView', () => {
  it('exposes three 1-D signal sets', () => {
    expect(OPT_RX_SIGNAL_SETS.map((s) => s.id)).toEqual(['binary', 'pam4', 'pam8']);
  });

  it('binary set has 2 amplitudes ascending and one threshold at 0', () => {
    const v = buildOptRxView(base);
    expect(v.M).toBe(2);
    expect(v.amplitudes).toHaveLength(2);
    expect(v.amplitudes[0]).toBeLessThan(v.amplitudes[1]);
    expect(v.thresholds).toHaveLength(1);
    expect(v.thresholds[0]).toBeCloseTo(0, 12);
  });

  it('4-PAM set has 4 amplitudes and 3 thresholds', () => {
    const v = buildOptRxView({ ...base, signalSetId: 'pam4' });
    expect(v.M).toBe(4);
    expect(v.amplitudes).toHaveLength(4);
    expect(v.thresholds).toHaveLength(3);
  });

  it('basis is unit energy and length sps', () => {
    const v = buildOptRxView(base);
    expect(v.basis).toHaveLength(32);
    const energy = v.basis.reduce((s, x) => s + x * x, 0);
    expect(energy).toBeCloseTo(1, 12);
  });

  it('symbol waveform = amplitude × basis; peakSnr = 2E/N0', () => {
    const v = buildOptRxView({ ...base, symbolIndex: 1 });
    const expectedEnergy = v.amplitudes[1] * v.amplitudes[1];
    expect(v.symbolEnergy).toBeCloseTo(expectedEnergy, 10);
    expect(v.peakSnr).toBeCloseTo((2 * v.symbolEnergy) / v.n0, 10);
  });

  it('theoretical Pe decreases as Eb/N0 grows', () => {
    const lo = buildOptRxView({ ...base, ebN0Db: 2 });
    const hi = buildOptRxView({ ...base, ebN0Db: 12 });
    expect(hi.theoreticalPe).toBeLessThan(lo.theoreticalPe);
  });
});
