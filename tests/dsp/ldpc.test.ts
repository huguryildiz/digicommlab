import { describe, it, expect } from 'vitest';
import {
  DEMO_LDPC_H,
  checkNeighbors,
  varNeighbors,
  parityOk,
  sumProductDecode,
} from '@/lib/dsp/ldpc';

const H = DEMO_LDPC_H; // 4×6, girth-6, regular (dv=2, dc=3)

describe('LDPC sum-product decoding (§13.6)', () => {
  it('Tanner adjacency matches H (regular dv=2, dc=3)', () => {
    expect(checkNeighbors(H).length).toBe(4);
    expect(checkNeighbors(H).every((vs) => vs.length === 3)).toBe(true);
    expect(varNeighbors(H).length).toBe(6);
    expect(varNeighbors(H).every((cs) => cs.length === 2)).toBe(true);
  });

  it('parityOk is true for the all-zero codeword, false with one flipped bit', () => {
    expect(parityOk([0, 0, 0, 0, 0, 0], H)).toBe(true);
    expect(parityOk([0, 0, 1, 0, 0, 0], H)).toBe(false);
  });

  it('belief propagation corrects a single error (all-zero codeword) and stops early', () => {
    for (let bit = 0; bit < 6; bit++) {
      const llr = [6, 6, 6, 6, 6, 6];
      llr[bit] = -6; // one confidently-wrong bit
      const iters = sumProductDecode(llr, H, 20);
      const last = iters[iters.length - 1];
      expect(last.ok).toBe(true);
      expect(last.hard).toEqual([0, 0, 0, 0, 0, 0]);
      expect(iters.length).toBeLessThan(20);
    }
  });

  it('clean strong input decodes in the first iteration', () => {
    const iters = sumProductDecode([8, 8, 8, 8, 8, 8], H, 20);
    expect(iters[0].ok).toBe(true);
    expect(iters.length).toBe(1);
  });
});
