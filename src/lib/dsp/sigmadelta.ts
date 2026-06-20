// Proakis §7.6 — Oversampling first-order sigma-delta (Σ-Δ) modulation, the 1-bit
// converter used in the CD-player D/A chain (Fig. 7.21–7.22): a digital interpolator
// up-samples the signal, then a first-order Σ-Δ modulator produces a 1-bit/sample
// stream whose quantization noise is shaped out of the signal band, and a simple
// analog lowpass recovers the waveform.
//
// The book is descriptive here; the modulator math is the standard first-order Σ-Δ
// loop (cited to Fig. 7.22). First-order noise shaping gives the well-known
// 9 dB-per-octave (1.5 bit/octave) SNR improvement with oversampling ratio.

/** Linear-interpolation up-sampling by an integer ratio (the digital interpolator). */
export function oversample(x: number[], ratio: number): number[] {
  if (ratio <= 1 || x.length === 0) return x.slice();
  const out: number[] = [];
  for (let n = 0; n < x.length - 1; n++) {
    for (let r = 0; r < ratio; r++) {
      const f = r / ratio;
      out.push(x[n] * (1 - f) + x[n + 1] * f);
    }
  }
  out.push(x[x.length - 1]);
  return out;
}

export interface SigmaDeltaResult {
  /** 1-bit output stream, values ±1. */
  bits: number[];
  /** Integrator state v[n] before the comparator (for the loop-trace plot). */
  integrator: number[];
  /** Quantization error e[n] = v[n] − y[n] (high-pass shaped). */
  error: number[];
}

/**
 * First-order sigma-delta modulator (Fig. 7.22). The loop integrates the difference
 * between the input and the fed-back 1-bit output, then the comparator slices:
 *     v[n] = v[n-1] + (x[n] − y[n-1]),   y[n] = sign(v[n]) ∈ {−1, +1}.
 * Input should lie within [−1, 1]. The shaped quantization noise NTF = (1 − z⁻¹).
 */
export function sigmaDeltaModulate(x: number[]): SigmaDeltaResult {
  const bits = new Array<number>(x.length);
  const integrator = new Array<number>(x.length);
  const error = new Array<number>(x.length);
  let v = 0;
  let yPrev = 0;
  for (let n = 0; n < x.length; n++) {
    v = v + (x[n] - yPrev);
    const y = v >= 0 ? 1 : -1;
    bits[n] = y;
    integrator[n] = v;
    error[n] = v - y;
    yPrev = y;
  }
  return { bits, integrator, error };
}

/**
 * Decode/decimate a Σ-Δ bit stream back to a multi-bit waveform with a moving-average
 * lowpass of length `window` (the in-band averaging done by the smoothing filter).
 * Returns one averaged sample per input bit (no decimation), suitable for overlaying
 * the reconstruction on the original.
 */
export function sigmaDeltaDecode(bits: number[], window: number): number[] {
  const w = Math.max(1, Math.floor(window));
  const out = new Array<number>(bits.length).fill(0);
  let acc = 0;
  for (let n = 0; n < bits.length; n++) {
    acc += bits[n];
    if (n >= w) acc -= bits[n - w];
    out[n] = acc / Math.min(n + 1, w);
  }
  return out;
}

/**
 * Ideal in-band SNR (dB) of a first-order Σ-Δ modulator versus oversampling ratio:
 *     SNR ≈ 6.02·B + 1.76 − 5.17 + 30·log10(OSR),
 * with B = 1 bit. Each doubling of OSR adds ≈ 9 dB (1.5 bits) of resolution — the
 * hallmark of first-order noise shaping.
 */
export function sigmaDeltaSnrDb(osr: number, bits = 1): number {
  if (osr < 1) return 0;
  return 6.02 * bits + 1.76 - 5.17 + 30 * Math.log10(osr);
}
