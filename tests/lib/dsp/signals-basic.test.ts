import { describe, it, expect } from 'vitest';
import { rectPulse, triPulse, unitStep, sgn, expSignal, classifySignal } from '@/lib/dsp/signals';

describe('basic signals', () => {
  it('rectPulse is 1 inside ±width/2, 0 outside', () => {
    expect(rectPulse(0, 2)).toBe(1);
    expect(rectPulse(0.9, 2)).toBe(1);
    expect(rectPulse(1.1, 2)).toBe(0);
  });
  it('triPulse is a triangle peaking at 1', () => {
    expect(triPulse(0, 2)).toBe(1);
    expect(triPulse(1, 2)).toBeCloseTo(0.5, 6);
    expect(triPulse(2, 2)).toBe(0);
  });
  it('unitStep and sgn', () => {
    expect(unitStep(-0.5)).toBe(0);
    expect(unitStep(0.5)).toBe(1);
    expect(sgn(-3)).toBe(-1);
    expect(sgn(3)).toBe(1);
  });
  it('expSignal is a one-sided decaying exponential', () => {
    expect(expSignal(-1, 1)).toBe(0);
    expect(expSignal(0, 1)).toBe(1);
    expect(expSignal(1, 1)).toBeCloseTo(Math.exp(-1), 6);
  });
  it('classifySignal flags energy vs power and even/odd', () => {
    const t = Array.from({ length: 201 }, (_, i) => -1 + (i * 2) / 200);
    const rect = t.map((tt) => rectPulse(tt, 1));
    const c = classifySignal(t, rect);
    expect(c.type).toBe('energy');
    expect(c.even).toBe(true);
  });
});
