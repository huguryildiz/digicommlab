import { describe, it, expect } from 'vitest';
import {
  regenerativeBer,
  analogBer,
  requiredEbN0DbRegen,
  requiredEbN0DbAnalog,
} from '@/lib/dsp/repeater';
import { qfunc } from '@/lib/dsp/math';

describe('regenerative vs analog repeater BER', () => {
  it('regenerative = K · Q(sqrt(2 Eb/N0)) (Eq. 8.10.1)', () => {
    const g = 10 ** (8 / 10);
    expect(regenerativeBer(50, 8)).toBeCloseTo(50 * qfunc(Math.sqrt(2 * g)), 12);
  });
  it('analog = Q(sqrt(2 Eb/(K N0))) (Eq. 8.10.2)', () => {
    const g = 10 ** (8 / 10);
    expect(analogBer(50, 8)).toBeCloseTo(qfunc(Math.sqrt((2 * g) / 50)), 12);
  });
  it('K=1: regenerative and analog coincide', () => {
    expect(regenerativeBer(1, 7)).toBeCloseTo(analogBer(1, 7), 12);
  });
  it('analog is worse than regenerative for K > 1 at the same Eb/N0', () => {
    expect(analogBer(100, 10)).toBeGreaterThan(regenerativeBer(100, 10));
  });
});

describe('required Eb/N0 (Example 8.10.1: K=100, target 1e-5)', () => {
  it('regenerative ≈ 11.3 dB', () => {
    expect(requiredEbN0DbRegen(100, 1e-5)).toBeCloseTo(11.3, 1);
  });
  it('analog ≈ 29.6 dB', () => {
    expect(requiredEbN0DbAnalog(100, 1e-5)).toBeCloseTo(29.6, 1);
  });
  it('the gap is ≈ 18.3 dB', () => {
    const gap = requiredEbN0DbAnalog(100, 1e-5) - requiredEbN0DbRegen(100, 1e-5);
    expect(gap).toBeGreaterThan(18);
    expect(gap).toBeLessThan(18.7);
  });
});
