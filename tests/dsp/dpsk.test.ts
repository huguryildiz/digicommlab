import { describe, it, expect } from 'vitest';
import {
  differentialEncode,
  differentialDecode,
  dpskBitErrorProb,
  dpskSymbolErrorProb,
  simulateDpsk,
} from '@/lib/dsp/dpsk';

describe('differential encode/decode', () => {
  it('encodes as a running modulo-M sum of phase increments', () => {
    // ref=0: cumulative [1, 1+1, 2+0, 2+3] mod 4
    expect(differentialEncode([1, 1, 0, 3], 4)).toEqual([1, 2, 2, 1]);
  });
  it('decode is the exact inverse of encode (round-trips)', () => {
    const info = [0, 3, 2, 1, 1, 0, 3, 3, 2];
    expect(differentialDecode(differentialEncode(info, 4), 4)).toEqual(info);
  });
  it('binary: a 1 flips phase, a 0 holds it', () => {
    expect(differentialEncode([1, 0, 1, 1, 0], 2)).toEqual([1, 1, 0, 1, 1]);
  });
});

describe('DPSK error probability', () => {
  it('binary DPSK P_b = 1/2 e^{-Eb/N0} (Eq. 8.6.42)', () => {
    const g = 10 ** (8 / 10);
    expect(dpskBitErrorProb(8)).toBeCloseTo(0.5 * Math.exp(-g), 12);
  });
  it('M=2 symbol error equals the binary closed form (integral reduces to it)', () => {
    expect(dpskSymbolErrorProb(2, 8)).toBeCloseTo(dpskBitErrorProb(8), 6);
  });
  it('Pe decreases monotonically with SNR for M=4', () => {
    expect(dpskSymbolErrorProb(4, 10)).toBeLessThan(dpskSymbolErrorProb(4, 4));
  });
  it('binary DPSK sits within ~1 dB of BPSK at 1e-4 (penalty is small for M=2)', () => {
    // BPSK reaches 1e-4 near 8.4 dB; binary DPSK crosses it near ~9.31 dB → < 1 dB gap.
    expect(dpskBitErrorProb(9.4)).toBeLessThan(1e-4);
    expect(dpskBitErrorProb(8.4)).toBeGreaterThan(1e-4);
  });
});

describe('simulateDpsk (noncoherent differential detection)', () => {
  it('binary BER tracks ½ e^{-Eb/N0} within Monte-Carlo tolerance', () => {
    const r = simulateDpsk({ M: 2, ebN0Db: 6, numSymbols: 200000, seed: 7 });
    const theory = dpskBitErrorProb(6);
    expect(r.ber).toBeGreaterThan(theory * 0.8);
    expect(r.ber).toBeLessThan(theory * 1.2);
  });
  it('is (near) error-free at very high SNR despite the unknown carrier phase', () => {
    const r = simulateDpsk({ M: 4, ebN0Db: 20, numSymbols: 5000, seed: 1 });
    expect(r.ser).toBeLessThan(0.01); // φ cancels via the differential product
  });
  it('reports consistent counts', () => {
    const r = simulateDpsk({ M: 4, ebN0Db: 8, numSymbols: 3000, seed: 3 });
    expect(r.totalSymbols).toBe(3000);
    expect(r.totalBits).toBe(3000 * 2);
    expect(r.ser).toBeCloseTo(r.symErrors / r.totalSymbols, 12);
  });
});
