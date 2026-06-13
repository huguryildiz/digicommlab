import { describe, it, expect } from 'vitest';
import { linScale } from '@/lib/plot/draw';

describe('linScale', () => {
  it('maps domain endpoints to range endpoints', () => {
    const s = linScale([0, 1], [0, 100]);
    expect(s(0)).toBe(0);
    expect(s(1)).toBe(100);
    expect(s(0.5)).toBe(50);
  });
  it('supports inverted ranges (screen y grows downward)', () => {
    const s = linScale([0, 1], [100, 0]);
    expect(s(0)).toBe(100);
    expect(s(1)).toBe(0);
  });
});
