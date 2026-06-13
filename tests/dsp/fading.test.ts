import { describe, it, expect } from 'vitest';
import {
  exponentialPdp,
  rmsDelaySpread,
  coherenceBandwidth,
  coherenceTime,
  type Tap,
} from '@/lib/dsp/fading';

describe('exponentialPdp', () => {
  it('returns nTaps taps with unit total power and exponential decay', () => {
    const taps = exponentialPdp(4, 1.0, 1e-6); // nTaps, tauRms (us), tapSpacing (s)
    expect(taps).toHaveLength(4);
    const total = taps.reduce((s, t) => s + t.power, 0);
    expect(total).toBeCloseTo(1, 10); // normalized to unit power
    expect(taps[0].power).toBeGreaterThan(taps[3].power); // decaying
    expect(taps[0].delay).toBe(0);
  });
});

describe('rmsDelaySpread', () => {
  it('is zero for a single tap', () => {
    const taps: Tap[] = [{ delay: 0, power: 1 }];
    expect(rmsDelaySpread(taps)).toBeCloseTo(0, 12);
  });
  it('matches the std of a two-equal-tap profile', () => {
    const taps: Tap[] = [
      { delay: 0, power: 1 },
      { delay: 2e-6, power: 1 },
    ];
    // mean delay = 1us; spread = 1us
    expect(rmsDelaySpread(taps)).toBeCloseTo(1e-6, 12);
  });
});

describe('coherenceBandwidth / coherenceTime', () => {
  it('coherence bandwidth is inversely proportional to delay spread', () => {
    expect(coherenceBandwidth(1e-6)).toBeCloseTo(1 / (2 * Math.PI * 1e-6), 6);
    expect(coherenceBandwidth(2e-6)).toBeLessThan(coherenceBandwidth(1e-6));
  });
  it('coherence time is inversely proportional to Doppler', () => {
    expect(coherenceTime(100)).toBeCloseTo(1 / (2 * Math.PI * 100), 9);
    expect(coherenceTime(200)).toBeLessThan(coherenceTime(100));
  });
});
