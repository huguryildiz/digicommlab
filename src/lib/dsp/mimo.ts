/**
 * MIMO: Alamouti space-time diversity BER and ergodic spatial-multiplexing
 * capacity. Proakis & Salehi §10.1.6.
 */
import type { Complex } from '@/lib/dsp/fft';
import { mrcBerAntipodal } from '@/lib/dsp/diversity';
import { makeRng } from '@/lib/dsp/random';
import { gaussian } from '@/lib/dsp/awgn';

/**
 * Alamouti 2×N_r BER (antipodal). Space-time coding with two transmit antennas
 * achieves diversity order 2·N_r, but splitting the transmit power across the two
 * antennas costs 3 dB — so it behaves as a (2·N_r)-branch MRC at half the average
 * SNR. N_r = 1 ⇒ order-2 diversity. Proakis §10.1.6.
 */
export function alamoutiBerAntipodal(ebN0Db: number, nr: number): number {
  const halfSnrDb = ebN0Db - 10 * Math.log10(2); // 3 dB transmit power split
  return mrcBerAntipodal(halfSnrDb, 2 * nr);
}

// Minimal complex helpers (local; the small matrices here don't warrant a library).
const cAdd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
const cSub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im });
const cMul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
const cDiv = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
};
const cConj = (a: Complex): Complex => ({ re: a.re, im: -a.im });

/**
 * Natural log of det(A) for a Hermitian positive-definite complex matrix via LU
 * without pivoting (a PD matrix has positive leading minors, so pivots never
 * vanish). The determinant is real and positive; the imaginary parts cancel.
 */
function logDetHermitianPd(A: Complex[][]): number {
  const n = A.length;
  const M = A.map((row) => row.map((c) => ({ ...c })));
  let logDet = 0;
  for (let k = 0; k < n; k++) {
    const piv = M[k][k];
    logDet += Math.log(piv.re); // PD ⇒ real positive pivot (imag ≈ 0)
    for (let i = k + 1; i < n; i++) {
      const factor = cDiv(M[i][k], piv);
      for (let j = k; j < n; j++) {
        M[i][j] = cSub(M[i][j], cMul(factor, M[k][j]));
      }
    }
  }
  return logDet;
}

/**
 * Ergodic MIMO capacity C = E[log₂ det(I_{N_r} + (ρ/N_t)·H·Hᴴ)] over seeded
 * Monte-Carlo, H i.i.d. CN(0,1). ρ is the linear SNR. The same seed reuses the
 * same channel realizations across SNR points, giving smooth, reproducible
 * curves. Proakis §10.1.6.
 */
export function mimoCapacity(snrDb: number, nt: number, nr: number, trials: number, seed: number): number {
  const rho = 10 ** (snrDb / 10);
  const rng = makeRng(seed);
  const LN2 = Math.log(2);
  let sum = 0;
  for (let t = 0; t < trials; t++) {
    // Draw H (N_r × N_t), entries CN(0,1): real & imag each N(0, 1/2).
    const H: Complex[][] = [];
    for (let i = 0; i < nr; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < nt; j++) {
        row.push({ re: gaussian(rng) / Math.SQRT2, im: gaussian(rng) / Math.SQRT2 });
      }
      H.push(row);
    }
    // A = I_{N_r} + (ρ/N_t)·H·Hᴴ  (Hermitian PD, N_r × N_r).
    const A: Complex[][] = [];
    for (let i = 0; i < nr; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < nr; j++) {
        let acc: Complex = { re: 0, im: 0 };
        for (let k = 0; k < nt; k++) acc = cAdd(acc, cMul(H[i][k], cConj(H[j][k])));
        const scaled: Complex = { re: (rho / nt) * acc.re, im: (rho / nt) * acc.im };
        row.push(i === j ? cAdd({ re: 1, im: 0 }, scaled) : scaled);
      }
      A.push(row);
    }
    sum += logDetHermitianPd(A) / LN2;
  }
  return sum / trials;
}

/** Receiver type for spatial-multiplexing detection. */
export type MimoDetector = 'zf' | 'mmse';

/**
 * Invert a square complex matrix by Gauss–Jordan elimination with partial
 * pivoting. Used for the small N_t × N_t Gram matrices in linear MIMO detection.
 */
function invertComplex(A: Complex[][]): Complex[][] {
  const n = A.length;
  const M = A.map((row, i) =>
    row
      .map((c) => ({ ...c }))
      .concat(Array.from({ length: n }, (_, j): Complex => ({ re: i === j ? 1 : 0, im: 0 }))),
  );
  for (let col = 0; col < n; col++) {
    let piv = col;
    let best = M[col][col].re ** 2 + M[col][col].im ** 2;
    for (let r = col + 1; r < n; r++) {
      const mag = M[r][col].re ** 2 + M[r][col].im ** 2;
      if (mag > best) {
        best = mag;
        piv = r;
      }
    }
    if (piv !== col) [M[col], M[piv]] = [M[piv], M[col]];
    const diag = M[col][col];
    for (let j = 0; j < 2 * n; j++) M[col][j] = cDiv(M[col][j], diag);
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let j = 0; j < 2 * n; j++) M[r][j] = cSub(M[r][j], cMul(factor, M[col][j]));
    }
  }
  return M.map((row) => row.slice(n));
}

/**
 * BER of an uncoded BPSK spatial-multiplexing MIMO link with a linear (ZF or MMSE)
 * receiver, over seeded Monte-Carlo with H i.i.d. CN(0,1). N_t independent BPSK
 * streams; ZF uses W = (HᴴH)⁻¹Hᴴ, MMSE adds N₀·I to the Gram matrix (Es = 1).
 * Requires N_r ≥ N_t. Proakis & Salehi §14.4.4 (Error Rate Performance), p.800.
 */
export function mimoSpatialMuxBer(
  snrDb: number,
  nt: number,
  nr: number,
  detector: MimoDetector,
  trials: number,
  seed: number,
): number {
  const rho = 10 ** (snrDb / 10);
  const n0 = nt / rho; // total transmit power split across N_t streams
  const noiseSd = Math.sqrt(n0 / 2); // per complex dimension
  const rng = makeRng(seed);
  let errors = 0;
  let bits = 0;
  for (let t = 0; t < trials; t++) {
    // H (N_r × N_t), entries CN(0,1).
    const H: Complex[][] = [];
    for (let i = 0; i < nr; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < nt; j++)
        row.push({ re: gaussian(rng) / Math.SQRT2, im: gaussian(rng) / Math.SQRT2 });
      H.push(row);
    }
    // BPSK symbol vector x ∈ {±1}^{N_t} and received y = H x + n.
    const x = Array.from({ length: nt }, () => (rng() < 0.5 ? -1 : 1));
    const y: Complex[] = [];
    for (let i = 0; i < nr; i++) {
      let acc: Complex = { re: noiseSd * gaussian(rng), im: noiseSd * gaussian(rng) };
      for (let j = 0; j < nt; j++) acc = cAdd(acc, cMul(H[i][j], { re: x[j], im: 0 }));
      y.push(acc);
    }
    // Gram G = HᴴH (N_t × N_t); MMSE adds N₀·I. Also matched-filter output Hᴴy.
    const G: Complex[][] = [];
    const hy: Complex[] = [];
    for (let a = 0; a < nt; a++) {
      const row: Complex[] = [];
      for (let b = 0; b < nt; b++) {
        let acc: Complex = { re: 0, im: 0 };
        for (let i = 0; i < nr; i++) acc = cAdd(acc, cMul(cConj(H[i][a]), H[i][b]));
        if (detector === 'mmse' && a === b) acc = cAdd(acc, { re: n0, im: 0 });
        row.push(acc);
      }
      G.push(row);
      let mf: Complex = { re: 0, im: 0 };
      for (let i = 0; i < nr; i++) mf = cAdd(mf, cMul(cConj(H[i][a]), y[i]));
      hy.push(mf);
    }
    // xhat = G⁻¹ · (Hᴴy); decide each stream by the sign of the real part.
    const Ginv = invertComplex(G);
    for (let a = 0; a < nt; a++) {
      let est: Complex = { re: 0, im: 0 };
      for (let b = 0; b < nt; b++) est = cAdd(est, cMul(Ginv[a][b], hy[b]));
      const decided = est.re >= 0 ? 1 : -1;
      if (decided !== x[a]) errors++;
      bits++;
    }
  }
  return errors / bits;
}
