import { describe, it, expect } from 'vitest';
import { awgnBerAntipodal, rayleighBerAntipodal, rayleighBerOrthogonal } from '@/lib/dsp/diversity';
import { qfunc } from '@/lib/dsp/math';

describe('awgnBerAntipodal', () => {
  it('equals Q(sqrt(2*gamma_b))', () => {
    const gammaBdB = 7;
    const g = 10 ** (gammaBdB / 10);
    expect(awgnBerAntipodal(gammaBdB)).toBeCloseTo(qfunc(Math.sqrt(2 * g)), 12);
  });
  it('decreases as Eb/N0 grows', () => {
    expect(awgnBerAntipodal(10)).toBeLessThan(awgnBerAntipodal(4));
  });
});

describe('rayleighBerAntipodal', () => {
  it('matches the closed form 0.5*(1 - sqrt(g/(1+g)))', () => {
    const g = 10 ** (6 / 10);
    expect(rayleighBerAntipodal(6)).toBeCloseTo(0.5 * (1 - Math.sqrt(g / (1 + g))), 12);
  });
  it('decays only inversely with SNR (far worse than AWGN at high SNR)', () => {
    expect(rayleighBerAntipodal(20)).toBeGreaterThan(awgnBerAntipodal(20));
    // large-SNR asymptote ~ 1/(4*g)
    const g = 10 ** (20 / 10);
    expect(rayleighBerAntipodal(20)).toBeCloseTo(1 / (4 * g), 4);
  });
});

describe('rayleighBerOrthogonal', () => {
  it('matches 0.5*(1 - sqrt(g/(2+g))) and is worse than antipodal', () => {
    const g = 10 ** (6 / 10);
    expect(rayleighBerOrthogonal(6)).toBeCloseTo(0.5 * (1 - Math.sqrt(g / (2 + g))), 12);
    expect(rayleighBerOrthogonal(6)).toBeGreaterThan(rayleighBerAntipodal(6));
  });
});
