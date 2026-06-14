import { describe, it, expect } from 'vitest';
import type { Complex } from '@/lib/dsp/fft';
import { ofdmModulate, ofdmDemodulate, cabs, addCyclicPrefix, removeCyclicPrefix, convolveChannel, channelFreqResponse } from '@/lib/dsp/ofdm';

function expectComplexClose(a: Complex[], b: Complex[], digits = 9): void {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i++) {
    expect(a[i].re).toBeCloseTo(b[i].re, digits);
    expect(a[i].im).toBeCloseTo(b[i].im, digits);
  }
}

describe('ofdmModulate / ofdmDemodulate', () => {
  it('demodulate(modulate(X)) recovers the subcarrier symbols (FFT∘IFFT identity)', () => {
    const X: Complex[] = [
      { re: 0.707, im: 0.707 },
      { re: -0.707, im: 0.707 },
      { re: 0.707, im: -0.707 },
      { re: -0.707, im: -0.707 },
    ];
    const time = ofdmModulate(X);
    expect(time).toHaveLength(X.length);
    const recovered = ofdmDemodulate(time);
    expectComplexClose(recovered, X);
  });
});

describe('cabs', () => {
  it('returns the complex magnitude', () => {
    expect(cabs({ re: 3, im: 4 })).toBeCloseTo(5, 12);
  });
});

describe('addCyclicPrefix / removeCyclicPrefix', () => {
  it('prepends the last cp samples and removes them again', () => {
    const time: Complex[] = [
      { re: 1, im: 0 },
      { re: 2, im: 0 },
      { re: 3, im: 0 },
      { re: 4, im: 0 },
    ];
    const withCp = addCyclicPrefix(time, 2);
    expect(withCp).toHaveLength(6);
    expect(withCp.map((z) => z.re)).toEqual([3, 4, 1, 2, 3, 4]);
    const body = removeCyclicPrefix(withCp, 2, 4);
    expect(body.map((z) => z.re)).toEqual([1, 2, 3, 4]);
  });
  it('cp = 0 is a no-op', () => {
    const time: Complex[] = [{ re: 5, im: -1 }];
    expect(addCyclicPrefix(time, 0)).toEqual(time);
  });
});

describe('convolveChannel', () => {
  it('is the linear convolution of two complex sequences', () => {
    const a: Complex[] = [{ re: 1, im: 0 }, { re: 1, im: 0 }];
    const h: Complex[] = [{ re: 1, im: 0 }, { re: 1, im: 0 }];
    const y = convolveChannel(a, h);
    expect(y).toHaveLength(3);
    expect(y.map((z) => z.re)).toEqual([1, 2, 1]);
  });
  it('a unit-impulse channel passes the signal through unchanged', () => {
    const a: Complex[] = [{ re: 2, im: 1 }, { re: -1, im: 3 }];
    const h: Complex[] = [{ re: 1, im: 0 }];
    const y = convolveChannel(a, h);
    expect(y.map((z) => z.re)).toEqual([2, -1]);
    expect(y.map((z) => z.im)).toEqual([1, 3]);
  });
});

describe('channelFreqResponse', () => {
  it('a unit-impulse channel has a flat |H| = 1 over all subcarriers', () => {
    const h: Complex[] = [{ re: 1, im: 0 }];
    const H = channelFreqResponse(h, 8);
    expect(H).toHaveLength(8);
    for (const v of H) expect(cabs(v)).toBeCloseTo(1, 12);
  });
});
