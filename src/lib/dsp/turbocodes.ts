// Ref: Proakis & Salehi §13.5 (Turbo Codes and Iterative Decoding). A turbo encoder (Fig. 13.22)
// is a parallel concatenation of two identical rate-1/2 recursive systematic convolutional (RSC)
// encoders, the second preceded by a pseudorandom interleaver Π; nominal rate 1/3. Decoding
// (§13.5.2) iterates two BCJR/MAP component decoders (§13.5.1) exchanging extrinsic LLRs.
//
// Constituent code: 4-state RSC, feedback poly 1+D+D², parity (feedforward) 1+D².
// State s = (d1<<1)|d2; feedback a = u ⊕ d1 ⊕ d2; parity = a ⊕ d2; next state = (a<<1)|d1.

import { gaussian } from './awgn';

/** Next RSC state for input bit u from state s∈{0..3}. */
export function rscNextState(s: number, u: number): number {
  const d1 = (s >> 1) & 1;
  const d2 = s & 1;
  const a = u ^ d1 ^ d2;
  return ((a << 1) | d1) & 3;
}

/** RSC parity bit for input u from state s. (Systematic output is u itself.) */
export function rscParity(s: number, u: number): number {
  const d1 = (s >> 1) & 1;
  const d2 = s & 1;
  const a = u ^ d1 ^ d2;
  return a ^ d2;
}

/** Encode an RSC parity stream for input bits u (encoder starts in state 0). */
export function rscEncodeParity(u: number[]): number[] {
  let s = 0;
  const par: number[] = [];
  for (const b of u) {
    par.push(rscParity(s, b));
    s = rscNextState(s, b);
  }
  return par;
}

/** Identity-seeded pseudorandom block interleaver Π (Fisher–Yates), length N. perm[i] = source idx. */
export function makeInterleaver(n: number, rng: () => number): number[] {
  const perm = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  return perm;
}

const apply = (x: number[], perm: number[]): number[] => perm.map((src) => x[src]);
const invert = (perm: number[]): number[] => {
  const inv = new Array<number>(perm.length);
  perm.forEach((src, i) => (inv[src] = i));
  return inv;
};

export interface TurboEncoded {
  sys: number[]; // systematic bits = u
  par1: number[]; // RSC-1 parity on u
  par2: number[]; // RSC-2 parity on Π(u)
}

/** Parallel-concatenated turbo encode (rate 1/3, no puncturing). §13.5, Fig. 13.22. */
export function turboEncode(u: number[], perm: number[]): TurboEncoded {
  return { sys: u.slice(), par1: rscEncodeParity(u), par2: rscEncodeParity(apply(u, perm)) };
}

/** Jacobian logarithm max*(a,b) = max(a,b) + ln(1+e^{−|a−b|}). Exact log-MAP combiner. */
function maxstar(a: number, b: number): number {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  return Math.max(a, b) + Math.log1p(Math.exp(-Math.abs(a - b)));
}

/**
 * Log-MAP (BCJR) decode of one rate-1/2 RSC component. §13.5.1.
 * Inputs are LLRs (log P(0)/P(1)): systematic channel `lcSys`, parity channel `lcPar`, a-priori
 * `la`. Returns the a-posteriori LLR `app` and the extrinsic LLR `ext = app − la − lcSys`.
 * Trellis starts in state 0; the tail is left open (uniform β boundary).
 */
export function bcjrDecode(
  lcSys: number[],
  lcPar: number[],
  la: number[],
): { app: number[]; ext: number[] } {
  const N = lcSys.length;
  const NS = 4;
  const NEG = -Infinity;
  // branch metric γ_i(s,u) in the log domain
  const gamma = (i: number, s: number, u: number): number => {
    const p = rscParity(s, u);
    return 0.5 * ((1 - 2 * u) * (la[i] + lcSys[i]) + (1 - 2 * p) * lcPar[i]);
  };
  // forward α
  const alpha: number[][] = Array.from({ length: N + 1 }, () => new Array<number>(NS).fill(NEG));
  alpha[0][0] = 0;
  for (let i = 0; i < N; i++) {
    for (let s = 0; s < NS; s++) {
      if (alpha[i][s] === NEG) continue;
      for (let u = 0; u < 2; u++) {
        const ns = rscNextState(s, u);
        alpha[i + 1][ns] = maxstar(alpha[i + 1][ns], alpha[i][s] + gamma(i, s, u));
      }
    }
  }
  // backward β (uniform terminal boundary)
  const beta: number[][] = Array.from({ length: N + 1 }, () => new Array<number>(NS).fill(NEG));
  for (let s = 0; s < NS; s++) beta[N][s] = 0;
  for (let i = N - 1; i >= 0; i--) {
    for (let s = 0; s < NS; s++) {
      for (let u = 0; u < 2; u++) {
        const ns = rscNextState(s, u);
        beta[i][s] = maxstar(beta[i][s], beta[i + 1][ns] + gamma(i, s, u));
      }
    }
  }
  // APP + extrinsic
  const app = new Array<number>(N).fill(0);
  const ext = new Array<number>(N).fill(0);
  for (let i = 0; i < N; i++) {
    let l0 = NEG;
    let l1 = NEG;
    for (let s = 0; s < NS; s++) {
      for (let u = 0; u < 2; u++) {
        const ns = rscNextState(s, u);
        const m = alpha[i][s] + gamma(i, s, u) + beta[i + 1][ns];
        if (u === 0) l0 = maxstar(l0, m);
        else l1 = maxstar(l1, m);
      }
    }
    app[i] = l0 - l1;
    ext[i] = app[i] - la[i] - lcSys[i];
  }
  return { app, ext };
}

export interface TurboDecodeIter {
  iter: number;
  hard: number[]; // hard decisions after this iteration
  app: number[]; // a-posteriori LLRs (decoder-1 frame order)
}

/**
 * Iterative turbo decode (§13.5.2). Exchanges extrinsic LLRs between the two BCJR decoders through
 * the interleaver, `iterations` times. Returns the per-iteration hard decisions and APP LLRs.
 */
export function turboDecode(
  lcSys: number[],
  lcPar1: number[],
  lcPar2: number[],
  perm: number[],
  iterations: number,
): TurboDecodeIter[] {
  const N = lcSys.length;
  const inv = invert(perm);
  const lcSysIl = apply(lcSys, perm);
  let la1 = new Array<number>(N).fill(0);
  const out: TurboDecodeIter[] = [];
  for (let it = 1; it <= iterations; it++) {
    const d1 = bcjrDecode(lcSys, lcPar1, la1); // decoder 1
    const la2 = apply(d1.ext, perm); // interleave extrinsic → decoder 2 a-priori
    const d2 = bcjrDecode(lcSysIl, lcPar2, la2); // decoder 2
    la1 = apply(d2.ext, inv); // deinterleave extrinsic → decoder 1 a-priori
    // final APP combines channel + both extrinsics (decoder-1 order)
    const app = lcSys.map((ls, i) => ls + d1.ext[i] + la1[i]);
    out.push({ iter: it, hard: app.map((v) => (v < 0 ? 1 : 0)), app });
  }
  return out;
}

/** Map bit b∈{0,1} to BPSK symbol x = 1−2b ∈ {+1,−1}. */
const bpsk = (b: number): number => 1 - 2 * b;

export interface TurboChannel {
  lcSys: number[];
  lcPar1: number[];
  lcPar2: number[];
}

/**
 * Transmit a turbo codeword over BPSK+AWGN and return channel LLRs (2y/σ²) for each stream.
 * Rate R = 1/3 → Es/N0 = R·Eb/N0, σ² = 1/(2·Es/N0). §13.5.3 operating point.
 */
export function turboChannelLLRs(
  enc: TurboEncoded,
  ebN0Db: number,
  rng: () => number,
): TurboChannel {
  const R = 1 / 3;
  const gammaB = 10 ** (ebN0Db / 10);
  const sigma2 = 1 / (2 * R * gammaB);
  const sigma = Math.sqrt(sigma2);
  const llr = (bits: number[]): number[] =>
    bits.map((b) => (2 * (bpsk(b) + sigma * gaussian(rng))) / sigma2);
  return { lcSys: llr(enc.sys), lcPar1: llr(enc.par1), lcPar2: llr(enc.par2) };
}
