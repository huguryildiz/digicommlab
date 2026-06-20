// Digital Audio section utility functions (non-component exports, kept separate for
// React fast-refresh compliance — see da-panels.tsx for panel components).
import { fft } from '@/lib/dsp/fft';

export interface ErrorPsd {
  freqNorm: number[];
  noiseDb: number[];
}

/**
 * Compute one-sided noise PSD of a Σ-Δ quantization-error sequence.
 * Frequency axis is normalized to [0, 0.5] (= DC to Nyquist).
 * Input is the `error` array from sigmaDeltaModulate().
 * Magnitude in dB = 20·log10(|FFT(error)[k]|). (FFT is 1/N-normalized.)
 */
export function computeErrorPsd(error: number[]): ErrorPsd {
  const N = error.length;
  if (N === 0) return { freqNorm: [], noiseDb: [] };
  const X = fft(error); // 1/N-normalized (see fft.ts)
  const half = Math.floor(N / 2) + 1;
  const freqNorm: number[] = [];
  const noiseDb: number[] = [];
  for (let k = 0; k < half; k++) {
    const mag = Math.hypot(X[k].re, X[k].im);
    freqNorm.push(k / N);
    noiseDb.push(20 * Math.log10(Math.max(mag, 1e-9)));
  }
  return { freqNorm, noiseDb };
}
