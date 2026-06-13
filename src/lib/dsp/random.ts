// Random-process DSP (Proakis & Salehi §4.2–4.4). Pure, framework-free.

import { gaussian, sigmaFromN0 } from './awgn';

/** Deterministic small PRNG (mulberry32). Returns a function yielding [0,1). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ProcessKind = 'randphase-sine' | 'white-gaussian' | 'colored' | 'binary-nrz';

export interface ProcessParams {
  kind: ProcessKind;
  amplitude: number; // A
  f0: number; // Hz — sine carrier / NRZ symbol rate basis (T = 1/f0)
  n0: number; // white-noise PSD level N0 (white & colored input)
  fs: number; // Hz — sample rate of the discrete realization
  M: number; // ensemble size
  N: number; // samples per realization
  seed: number; // RNG seed
  filterKind: 'rc' | 'ideal-lpf'; // colored only
  cutoff: number; // Hz — filter cutoff fc (colored only)
}

/** σ for the discrete white process from N0 (continuous PSD N0/2 sampled at fs).
 *  Verify exact scaling against Proakis §4.4 when wiring absolute PSD readouts. */
function whiteSigma(p: ProcessParams): number {
  return sigmaFromN0(p.n0); // σ = sqrt(N0/2)
}

function genSine(p: ProcessParams, rng: () => number): Float64Array[] {
  const out: Float64Array[] = [];
  for (let m = 0; m < p.M; m++) {
    const theta = 2 * Math.PI * rng(); // Θ ~ U[0,2π)
    const x = new Float64Array(p.N);
    for (let n = 0; n < p.N; n++) {
      x[n] = p.amplitude * Math.cos((2 * Math.PI * p.f0 * n) / p.fs + theta);
    }
    out.push(x);
  }
  return out;
}

function genWhite(p: ProcessParams, rng: () => number): Float64Array[] {
  const sigma = whiteSigma(p);
  const out: Float64Array[] = [];
  for (let m = 0; m < p.M; m++) {
    const x = new Float64Array(p.N);
    for (let n = 0; n < p.N; n++) x[n] = sigma * gaussian(rng);
    out.push(x);
  }
  return out;
}

/** Build the ensemble of M sample functions, each length N. */
export function generateEnsemble(p: ProcessParams): Float64Array[] {
  const rng = makeRng(p.seed);
  switch (p.kind) {
    case 'randphase-sine':
      return genSine(p, rng);
    case 'white-gaussian':
      return genWhite(p, rng);
    case 'colored':
      return genColored(p, rng);
    case 'binary-nrz':
      return genNrz(p, rng);
  }
}

// Temporary stubs (implemented in Task 3)
function genColored(p: ProcessParams, rng: () => number): Float64Array[] {
  return genWhite(p, rng);
}

function genNrz(p: ProcessParams, rng: () => number): Float64Array[] {
  return genWhite(p, rng);
}
