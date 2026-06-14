import { describe, it, expect } from 'vitest';
import { vsbFilter } from '@/lib/dsp/analog';

describe('vsbFilter', () => {
  // Proakis §3.2.4 (Ex 3.2.7 / Fig 3.21): vestigial response centred on f_c,
  // unity above the vestige, zero below, H(f_c)=1/2, complementary across f_c.
  const fc = 1000;
  const vestige = 100;

  it('passes unity above the vestige and zero below', () => {
    const freq = [fc - 200, fc + 200];
    const out = vsbFilter([1, 1], freq, fc, vestige);
    expect(out[0]).toBeCloseTo(0, 6); // fc-200 < fc-vestige -> 0
    expect(out[1]).toBeCloseTo(1, 6); // fc+200 > fc+vestige -> 1
  });

  it('is one-half at the carrier', () => {
    expect(vsbFilter([1], [fc], fc, vestige)[0]).toBeCloseTo(0.5, 6);
  });

  it('has complementary symmetry across the carrier', () => {
    const d = 40;
    const hi = vsbFilter([1], [fc + d], fc, vestige)[0];
    const lo = vsbFilter([1], [fc - d], fc, vestige)[0];
    expect(hi + lo).toBeCloseTo(1, 6); // H(fc+δ) + H(fc-δ) = 1
  });

  it('scales the input magnitude (not just the gain)', () => {
    expect(vsbFilter([2], [fc], fc, vestige)[0]).toBeCloseTo(1.0, 6); // 2 * 0.5
  });
});
