/**
 * Bandwidth measures on a magnitude spectrum (Proakis & Salehi §2.7).
 * "Bandwidth" depends on its definition; we expose null-to-null and 3-dB.
 */

export interface Bandwidth {
  fLo: number;
  fHi: number;
  W: number;
}

/** Frequency-bin index of the spectral peak. */
function peakIndex(mag: number[]): number {
  let k = 0;
  for (let i = 1; i < mag.length; i++) if (mag[i] > mag[k]) k = i;
  return k;
}

/** Null-to-null: widen left/right from the peak to the first near-zero crossings. */
export function nullToNullBandwidth(freq: number[], mag: number[]): Bandwidth {
  const p = peakIndex(mag);
  const thresh = mag[p] * 1e-3;
  let lo = p;
  while (lo > 0 && mag[lo] > thresh) lo--;
  let hi = p;
  while (hi < mag.length - 1 && mag[hi] > thresh) hi++;
  const fLo = freq[lo];
  const fHi = freq[hi];
  return { fLo, fHi, W: fHi - fLo };
}

/**
 * Occupied (fractional-energy) bandwidth: the band [fLo, fHi] holding the central
 * `fraction` of the total spectral energy, trimming (1−fraction)/2 from each tail
 * of the cumulative energy. Unlike a null-to-null threshold walk this is integral-
 * based, so it never jumps on deep/near-zero nulls and is invariant to a time shift
 * (which leaves |X(f)| unchanged). Proakis & Salehi §2.7 (essential bandwidth).
 */
export function occupiedBandwidth(freq: number[], mag: number[], fraction = 0.99): Bandwidth {
  const n = mag.length;
  if (n === 0) return { fLo: 0, fHi: 0, W: 0 };
  const total = mag.reduce((s, m) => s + m * m, 0);
  if (total <= 0) return { fLo: freq[0], fHi: freq[0], W: 0 };
  const tail = ((1 - fraction) / 2) * total;

  let cum = 0;
  let lo = 0;
  for (let i = 0; i < n; i++) {
    cum += mag[i] * mag[i];
    if (cum >= tail) { lo = i; break; }
  }
  cum = 0;
  let hi = n - 1;
  for (let i = n - 1; i >= 0; i--) {
    cum += mag[i] * mag[i];
    if (cum >= tail) { hi = i; break; }
  }
  if (hi < lo) hi = lo;
  return { fLo: freq[lo], fHi: freq[hi], W: freq[hi] - freq[lo] };
}

/** Half-power (−3 dB): crossings at 1/√2 of the peak around the peak. */
export function halfPowerBandwidth(freq: number[], mag: number[]): Bandwidth {
  const p = peakIndex(mag);
  const level = mag[p] / Math.SQRT2;
  let lo = p;
  while (lo > 0 && mag[lo] >= level) lo--;
  let hi = p;
  while (hi < mag.length - 1 && mag[hi] >= level) hi++;
  const fLo = freq[lo];
  const fHi = freq[hi];
  return { fLo, fHi, W: fHi - fLo };
}
