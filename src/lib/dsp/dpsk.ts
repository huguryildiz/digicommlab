// DPSK — differential phase modulation & detection.
// Proakis & Salehi, Fundamentals of Communication Systems, §8.6.4–8.6.5.

import { ebN0Linear, n0FromEbN0Db, sigmaFromN0, addAwgn } from './awgn';
import { makeRng } from '@/lib/sim/sources';
import { toGray } from './pcm';

/** Non-negative modulo. */
function mod(a: number, m: number): number {
  return ((a % m) + m) % m;
}

/**
 * Differential phase encoding (Proakis §8.6.4): the information symbol carries
 * the phase *increment*. Transmitted phase index θ_k = (θ_{k-1} + d_k) mod M,
 * with θ_{-1} = ref. Returns the transmitted phase-index sequence.
 */
export function differentialEncode(info: number[], M: number, ref = 0): number[] {
  const tx: number[] = [];
  let prev = mod(ref, M);
  for (const d of info) {
    prev = mod(prev + d, M);
    tx.push(prev);
  }
  return tx;
}

/**
 * Differential decoding: recover the information increments from transmitted /
 * detected phase indices. d_k = (θ_k − θ_{k-1}) mod M, with θ_{-1} = ref.
 * Exact inverse of differentialEncode.
 */
export function differentialDecode(phases: number[], M: number, ref = 0): number[] {
  const info: number[] = [];
  let prev = mod(ref, M);
  for (const p of phases) {
    info.push(mod(p - prev, M));
    prev = p;
  }
  return info;
}

/** Binary DPSK bit-error probability (Proakis §8.6.5 Eq. 8.6.42): ½ e^{-Eb/N0}. */
export function dpskBitErrorProb(ebN0Db: number): number {
  return 0.5 * Math.exp(-ebN0Linear(ebN0Db));
}

/**
 * M-ary DPSK symbol-error probability (Proakis §8.6.5 Eq. 8.6.37):
 *   P_M = (1/π) ∫_0^{π−π/M} exp[ −P_s sin²(π/M) / (1 − cos(π/M) cosθ) ] dθ,
 *   P_s = E_s/N0 = log2(M)·Eb/N0.
 * For M=2 the integral reduces analytically to ½ e^{-Eb/N0}; returned directly.
 */
export function dpskSymbolErrorProb(M: number, ebN0Db: number): number {
  if (M === 2) return dpskBitErrorProb(ebN0Db);
  const k = Math.log2(M);
  const ps = k * ebN0Linear(ebN0Db);
  const a = Math.sin(Math.PI / M) ** 2;
  const c = Math.cos(Math.PI / M);
  const upper = Math.PI - Math.PI / M;
  // Composite trapezoid; N even, fine enough for a smooth bounded integrand.
  const N = 4000;
  const h = upper / N;
  let sum = 0;
  for (let i = 0; i <= N; i++) {
    const theta = i * h;
    const f = Math.exp((-ps * a) / (1 - c * Math.cos(theta)));
    sum += i === 0 || i === N ? f / 2 : f;
  }
  return (sum * h) / Math.PI;
}

export interface DpskSimResult {
  symErrors: number;
  bitErrors: number;
  totalSymbols: number;
  totalBits: number;
  ser: number;
  ber: number;
}

/** Hamming distance between the Gray codes of two phase-increment indices. */
function grayBitErrors(a: number, b: number): number {
  let x = toGray(a) ^ toGray(b);
  let n = 0;
  while (x) {
    n += x & 1;
    x >>= 1;
  }
  return n;
}

/**
 * Monte-Carlo DPSK over AWGN with a noncoherent differential detector
 * (Proakis §8.6.5). Eb = 1, so Es = log2(M). A constant unknown carrier phase φ
 * is added to every symbol; the differential product D_k = Y_k·conj(Y_{k-1})
 * cancels it. Decision: nearest multiple of 2π/M to arg(D_k).
 */
export function simulateDpsk(opts: {
  M: number;
  ebN0Db: number;
  numSymbols: number;
  seed?: number;
}): DpskSimResult {
  const { M, ebN0Db, numSymbols, seed = 12345 } = opts;
  const k = Math.log2(M);
  const eb = 1;
  const es = k * eb;
  const amp = Math.sqrt(es);
  const sigma = sigmaFromN0(n0FromEbN0Db(ebN0Db, eb));
  const step = (2 * Math.PI) / M;
  const rng = makeRng(seed);
  const phi = rng() * 2 * Math.PI; // unknown but constant carrier phase

  // Random information increments, then differential encoding (ref symbol = 0).
  const info: number[] = [];
  for (let i = 0; i < numSymbols; i++) info.push(Math.floor(rng() * M));
  const tx = differentialEncode(info, M, 0);

  // Reference (ref=0) symbol precedes the stream so symbol 0 is decodable.
  let prevI = amp * Math.cos(phi);
  let prevQ = amp * Math.sin(phi);
  {
    const r = addAwgn([prevI, prevQ], sigma, rng);
    prevI = r[0];
    prevQ = r[1];
  }

  let symErrors = 0;
  let bitErrors = 0;
  for (let i = 0; i < numSymbols; i++) {
    const theta = step * tx[i] + phi;
    const r = addAwgn([amp * Math.cos(theta), amp * Math.sin(theta)], sigma, rng);
    const [yi, yq] = r;
    // D_k = Y_k · conj(Y_{k-1})
    const dRe = yi * prevI + yq * prevQ;
    const dIm = yq * prevI - yi * prevQ;
    let idx = Math.round(Math.atan2(dIm, dRe) / step) % M;
    if (idx < 0) idx += M;
    if (idx !== info[i]) symErrors++;
    bitErrors += grayBitErrors(idx, info[i]);
    prevI = yi;
    prevQ = yq;
  }

  const totalBits = numSymbols * k;
  return {
    symErrors,
    bitErrors,
    totalSymbols: numSymbols,
    totalBits,
    ser: symErrors / numSymbols,
    ber: bitErrors / totalBits,
  };
}
