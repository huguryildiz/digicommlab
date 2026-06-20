// Proakis §7.7 — The JPEG image-coding standard (transform coding via the DCT).
// An image is split into 8×8 blocks; each block is DCT-transformed (Eq. 7.7.1–7.7.2),
// the coefficients are quantized with a perceptual table (Table 7.5) at a chosen
// quality, then reconstructed by dequantize + inverse DCT (Fig. 7.26). The DCT's
// energy-compaction property packs most block energy into a few low-frequency
// coefficients, which is what makes the quantized block highly compressible.
//
// Implemented with the standard orthonormal separable DCT-II / DCT-III pair (the
// transform JPEG actually uses and for which Table 7.5 is calibrated), giving exact
// reconstruction in the absence of quantization.

const N = 8;

/** Precomputed cosine basis C[u][k] = α(u)·cos((2k+1)uπ/2N) for the 1-D DCT-II. */
const COS: number[][] = (() => {
  const c: number[][] = [];
  for (let u = 0; u < N; u++) {
    const alpha = u === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
    const row: number[] = [];
    for (let k = 0; k < N; k++) {
      row.push(alpha * Math.cos(((2 * k + 1) * u * Math.PI) / (2 * N)));
    }
    c.push(row);
  }
  return c;
})();

/** Orthonormal 1-D DCT-II of an 8-sample vector. */
export function dct1d(x: number[]): number[] {
  const X = new Array<number>(N).fill(0);
  for (let u = 0; u < N; u++) {
    let s = 0;
    for (let k = 0; k < N; k++) s += x[k] * COS[u][k];
    X[u] = s;
  }
  return X;
}

/** Inverse (orthonormal 1-D DCT-III) of an 8-coefficient vector. */
export function idct1d(X: number[]): number[] {
  const x = new Array<number>(N).fill(0);
  for (let k = 0; k < N; k++) {
    let s = 0;
    for (let u = 0; u < N; u++) s += X[u] * COS[u][k];
    x[k] = s;
  }
  return x;
}

/** Separable 2-D DCT of an 8×8 block (rows then columns). (Eq. 7.7.1–7.7.2) */
export function dct2d(block: number[][]): number[][] {
  const rows = block.map((r) => dct1d(r));
  const out: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  for (let c = 0; c < N; c++) {
    const col = rows.map((r) => r[c]);
    const X = dct1d(col);
    for (let r = 0; r < N; r++) out[r][c] = X[r];
  }
  return out;
}

/** Inverse separable 2-D DCT of an 8×8 coefficient block. */
export function idct2d(coeffs: number[][]): number[][] {
  const cols: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  for (let c = 0; c < N; c++) {
    const col = coeffs.map((r) => r[c]);
    const x = idct1d(col);
    for (let r = 0; r < N; r++) cols[r][c] = x[r];
  }
  return cols.map((r) => idct1d(r));
}

/** Standard JPEG luminance quantization table (Proakis Table 7.5). */
export const JPEG_LUMA_Q: number[][] = [
  [16, 11, 10, 16, 24, 40, 51, 61],
  [12, 12, 14, 19, 26, 58, 60, 55],
  [14, 13, 16, 24, 40, 57, 69, 56],
  [14, 17, 22, 29, 51, 87, 80, 62],
  [18, 22, 37, 56, 68, 109, 103, 77],
  [24, 35, 55, 64, 81, 104, 113, 92],
  [49, 64, 78, 87, 103, 121, 120, 101],
  [72, 92, 95, 98, 112, 100, 103, 99],
];

/**
 * Scale the base quantization table for a JPEG quality factor in [1, 100] (libjpeg
 * convention): higher quality → smaller divisors → finer quantization. Entries are
 * clamped to [1, 255].
 */
export function scaleQuantTable(base: number[][], quality: number): number[][] {
  const q = Math.min(100, Math.max(1, quality));
  const scale = q < 50 ? 5000 / q : 200 - 2 * q;
  return base.map((row) =>
    row.map((v) => {
      const s = Math.floor((v * scale + 50) / 100);
      return Math.min(255, Math.max(1, s));
    }),
  );
}

/** Quantize a coefficient block: round(coeff / Q). */
export function quantizeBlock(coeffs: number[][], qTable: number[][]): number[][] {
  return coeffs.map((row, r) => row.map((v, c) => Math.round(v / qTable[r][c])));
}

/** Dequantize: qLevel × Q. */
export function dequantizeBlock(quantized: number[][], qTable: number[][]): number[][] {
  return quantized.map((row, r) => row.map((v, c) => v * qTable[r][c]));
}

/** Zig-zag scan order of an 8×8 block as a list of [row, col] pairs (Fig. 7.27 ordering). */
export function zigzagOrder(): [number, number][] {
  const order: [number, number][] = [];
  for (let s = 0; s < 2 * N - 1; s++) {
    if (s % 2 === 0) {
      for (let r = Math.min(s, N - 1); r >= Math.max(0, s - N + 1); r--) order.push([r, s - r]);
    } else {
      for (let r = Math.max(0, s - N + 1); r <= Math.min(s, N - 1); r++) order.push([r, s - r]);
    }
  }
  return order;
}

export interface JpegBlockResult {
  /** Forward-DCT coefficients. */
  coeffs: number[][];
  /** Quantized integer levels. */
  quantized: number[][];
  /** Dequantized coefficients. */
  dequantized: number[][];
  /** Reconstructed 8×8 block after inverse DCT. */
  reconstructed: number[][];
  /** Scaled quantization table used. */
  qTable: number[][];
  /** Number of non-zero quantized coefficients (≤ 64). */
  nonZero: number;
  /** Mean-squared reconstruction error vs the input block. */
  mse: number;
}

/** Full single-block JPEG pipeline: DCT → quantize → dequantize → IDCT. */
export function compressBlock(block: number[][], quality: number): JpegBlockResult {
  const qTable = scaleQuantTable(JPEG_LUMA_Q, quality);
  const coeffs = dct2d(block);
  const quantized = quantizeBlock(coeffs, qTable);
  const dequantized = dequantizeBlock(quantized, qTable);
  const reconstructed = idct2d(dequantized);
  let nonZero = 0;
  let se = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (quantized[r][c] !== 0) nonZero++;
      const d = block[r][c] - reconstructed[r][c];
      se += d * d;
    }
  }
  return { coeffs, quantized, dequantized, reconstructed, qTable, nonZero, mse: se / (N * N) };
}

/**
 * Energy compaction: fraction of total AC+DC coefficient energy captured by the `k`
 * largest-magnitude coefficients. Near 1 for small k demonstrates the DCT packing
 * block energy into a few coefficients (§7.7).
 */
export function energyCompaction(coeffs: number[][], k: number): number {
  const flat = coeffs.flat().map((v) => v * v);
  const total = flat.reduce((s, v) => s + v, 0);
  if (total <= 0) return 0;
  const sorted = flat.slice().sort((a, b) => b - a);
  let top = 0;
  for (let i = 0; i < Math.min(k, sorted.length); i++) top += sorted[i];
  return top / total;
}
