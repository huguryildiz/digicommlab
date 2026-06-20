import { describe, it, expect } from 'vitest';
import {
  rscNextState,
  rscParity,
  rscEncodeParity,
  makeInterleaver,
  turboEncode,
  bcjrDecode,
  turboDecode,
  turboChannelLLRs,
} from '@/lib/dsp/turbocodes';
import { makeRng } from '@/lib/dsp/random';

const berOf = (a: number[], b: number[]): number =>
  a.reduce((acc, v, i) => acc + (v !== b[i] ? 1 : 0), 0) / a.length;

describe('turbo codes (§13.5)', () => {
  it('RSC is systematic & recursive: 4 states, valid transitions', () => {
    // every (state, input) lands in a state in 0..3
    for (let s = 0; s < 4; s++) {
      for (let u = 0; u < 2; u++) {
        expect(rscNextState(s, u)).toBeGreaterThanOrEqual(0);
        expect(rscNextState(s, u)).toBeLessThan(4);
        expect([0, 1]).toContain(rscParity(s, u));
      }
    }
    // recursive: parity stream depends on history, not just current bit
    expect(rscEncodeParity([1, 0, 0, 0])).not.toEqual([1, 0, 0, 0]);
  });

  it('interleaver is a permutation of 0..N−1', () => {
    const perm = makeInterleaver(16, makeRng(7));
    expect([...perm].sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i));
  });

  it('encode produces three length-N streams', () => {
    const u = [1, 0, 1, 1, 0, 0, 1, 0];
    const perm = makeInterleaver(u.length, makeRng(1));
    const enc = turboEncode(u, perm);
    expect(enc.sys).toEqual(u);
    expect(enc.par1.length).toBe(u.length);
    expect(enc.par2.length).toBe(u.length);
  });

  it('BCJR APP LLR signs recover bits at high SNR (no a-priori)', () => {
    const u = [1, 0, 0, 1, 1, 0];
    const par = rscEncodeParity(u);
    // strong, correct-sign channel LLRs (bit 0 → +, bit 1 → −)
    const lcSys = u.map((b) => (b === 0 ? 8 : -8));
    const lcPar = par.map((b) => (b === 0 ? 8 : -8));
    const { app } = bcjrDecode(lcSys, lcPar, new Array(u.length).fill(0));
    const hard = app.map((v) => (v < 0 ? 1 : 0));
    expect(hard).toEqual(u);
  });

  it('iterative decode recovers the frame error-free at high Eb/N0', () => {
    const rng = makeRng(42);
    const u = Array.from({ length: 64 }, () => (rng() < 0.5 ? 0 : 1));
    const perm = makeInterleaver(u.length, makeRng(99));
    const enc = turboEncode(u, perm);
    const ch = turboChannelLLRs(enc, 5, makeRng(123));
    const iters = turboDecode(ch.lcSys, ch.lcPar1, ch.lcPar2, perm, 6);
    expect(berOf(iters[iters.length - 1].hard, u)).toBe(0);
  });

  it('iteration reduces (or holds) bit errors near the waterfall', () => {
    const rng = makeRng(3);
    const u = Array.from({ length: 200 }, () => (rng() < 0.5 ? 0 : 1));
    const perm = makeInterleaver(u.length, makeRng(55));
    const enc = turboEncode(u, perm);
    const ch = turboChannelLLRs(enc, 0.5, makeRng(2024));
    const iters = turboDecode(ch.lcSys, ch.lcPar1, ch.lcPar2, perm, 8);
    const first = berOf(iters[0].hard, u);
    const last = berOf(iters[iters.length - 1].hard, u);
    expect(last).toBeLessThanOrEqual(first);
  });
});
