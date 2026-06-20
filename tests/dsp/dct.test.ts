import { describe, it, expect } from 'vitest';
import {
  dct1d,
  idct1d,
  dct2d,
  idct2d,
  JPEG_LUMA_Q,
  scaleQuantTable,
  quantizeBlock,
  dequantizeBlock,
  zigzagOrder,
  compressBlock,
  energyCompaction,
} from '@/lib/dsp/dct';

function makeBlock(fn: (r: number, c: number) => number): number[][] {
  return Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => fn(r, c)));
}

describe('1-D DCT', () => {
  it('is invertible (DCT-II ∘ DCT-III = identity)', () => {
    const x = [10, -3, 4, 7, 2, 0, -5, 8];
    const back = idct1d(dct1d(x));
    for (let i = 0; i < 8; i++) expect(back[i]).toBeCloseTo(x[i], 9);
  });
  it('is orthonormal — energy is preserved (Parseval)', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const X = dct1d(x);
    const ex = x.reduce((s, v) => s + v * v, 0);
    const eX = X.reduce((s, v) => s + v * v, 0);
    expect(eX).toBeCloseTo(ex, 9);
  });
});

describe('2-D DCT', () => {
  it('round-trips an 8×8 block exactly', () => {
    const block = makeBlock((r, c) => Math.sin(r) * 30 + c * 4 - 50);
    const back = idct2d(dct2d(block));
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) expect(back[r][c]).toBeCloseTo(block[r][c], 7);
  });

  it('a flat block has all its energy in the DC coefficient', () => {
    const block = makeBlock(() => 50);
    const X = dct2d(block);
    expect(X[0][0]).toBeCloseTo(50 * 8, 6); // DC = mean × N (orthonormal scaling)
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) if (r || c) expect(Math.abs(X[r][c])).toBeLessThan(1e-6);
  });
});

describe('quantization table', () => {
  it('Table 7.5 matches the textbook DC divisor and shape', () => {
    expect(JPEG_LUMA_Q[0][0]).toBe(16);
    expect(JPEG_LUMA_Q[7][7]).toBe(99);
    expect(JPEG_LUMA_Q).toHaveLength(8);
  });
  it('higher quality yields smaller (finer) divisors', () => {
    const hi = scaleQuantTable(JPEG_LUMA_Q, 90);
    const lo = scaleQuantTable(JPEG_LUMA_Q, 20);
    expect(hi[0][0]).toBeLessThan(lo[0][0]);
    // entries are clamped into [1, 255]
    for (const row of lo) for (const v of row) expect(v).toBeGreaterThanOrEqual(1);
    for (const row of hi) for (const v of row) expect(v).toBeLessThanOrEqual(255);
  });
  it('quantize → dequantize is a multiple of the table entry', () => {
    const coeffs = makeBlock((r, c) => (r + c) * 13.7);
    const q = quantizeBlock(coeffs, JPEG_LUMA_Q);
    const dq = dequantizeBlock(q, JPEG_LUMA_Q);
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) expect(dq[r][c]).toBe(q[r][c] * JPEG_LUMA_Q[r][c]);
  });
});

describe('zigzagOrder', () => {
  it('visits all 64 positions starting at the DC corner', () => {
    const order = zigzagOrder();
    expect(order).toHaveLength(64);
    expect(order[0]).toEqual([0, 0]);
    expect(order[1]).toEqual([0, 1]);
    expect(order[2]).toEqual([1, 0]);
    const seen = new Set(order.map(([r, c]) => r * 8 + c));
    expect(seen.size).toBe(64);
  });
});

describe('compressBlock / energyCompaction', () => {
  it('higher quality lowers reconstruction error and keeps more coefficients', () => {
    const block = makeBlock((r, c) => 40 * Math.cos((r * c) / 6) + 100);
    const hi = compressBlock(block, 95);
    const lo = compressBlock(block, 15);
    expect(hi.mse).toBeLessThanOrEqual(lo.mse);
    expect(hi.nonZero).toBeGreaterThanOrEqual(lo.nonZero);
    expect(hi.nonZero).toBeLessThanOrEqual(64);
  });

  it('the DCT compacts a smooth block into a few coefficients', () => {
    const block = makeBlock((r, c) => 30 * Math.cos((Math.PI * r) / 8) + 20 * Math.cos((Math.PI * c) / 8));
    const X = dct2d(block);
    // ≥ 95% of the energy is captured by the 8 largest coefficients.
    expect(energyCompaction(X, 8)).toBeGreaterThan(0.95);
  });
});
