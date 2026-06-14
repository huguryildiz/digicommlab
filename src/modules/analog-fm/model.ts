import { linspace } from '@/lib/dsp/math';
import { evalSignal } from '@/lib/dsp/signals';
import type { AngleMode } from '@/lib/dsp/analog';
import { angleSignal, instantFreq, besselJ, carsonBandwidth } from '@/lib/dsp/analog';

/** FM/PM modulation view parameters. */
export interface AnalogFmParams {
  mode: AngleMode;
  messageFreq: number; // Hz
  carrierFreq: number; // Hz
  carrierAmp: number; // V
  modIndex: number; // β (FM) or kp (PM)
}

/** Demodulation view parameters (FM discriminator). */
export interface AnalogDemodParams {
  fmParams: AnalogFmParams;
}

/** Result from FM modulation view computation. */
export interface AnalogFmView {
  time: number[];
  message: number[];
  modulated: number[]; // constant-envelope FM/PM signal
  instantFreq: number[]; // f_i(t)
  sidebandFreqs: number[]; // carrier ± n·fm
  sidebandMags: number[]; // |Jn(β)|
  carsonBw: number; // B = 2(β+1)fm
}

/** Result from the demodulation view. */
export interface AnalogDemodView {
  time: number[];
  original: number[]; // original message m(t) (normalized)
  recovered: number[]; // recovered message after the discriminator
  faithful: boolean;
}

/**
 * Build FM modulation view: constant-envelope waveform + Bessel spectrum.
 * Proakis & Salehi Ch 4 (Angle Modulation).
 */
export function buildAnalogFmView(p: AnalogFmParams, tStart = 0): AnalogFmView {
  const msg = [{ freq: p.messageFreq, amp: 1 }];
  const fm = p.messageFreq;
  const Ac = p.carrierAmp;
  const beta = p.modIndex;

  const duration = 5 / fm;
  const fs = Math.max(20 * p.carrierFreq, 50 * fm);
  const N = Math.ceil(fs * duration);
  const time = linspace(0, duration, N);

  const message = time.map((t) => evalSignal(msg, tStart + t));
  const modulated = time.map((t) => angleSignal(p.mode, msg, p.carrierFreq, Ac, beta, tStart + t));
  const instFreq = time.map((t) => (p.mode === 'fm' ? instantFreq(msg, p.carrierFreq, beta, tStart + t) : p.carrierFreq));

  const sidebandFreqs: number[] = [];
  const sidebandMags: number[] = [];
  const maxN = Math.ceil(beta + 2);
  for (let n = -maxN; n <= maxN; n++) {
    const freq = p.carrierFreq + n * fm;
    if (freq > 0) {
      const mag = Math.abs(besselJ(Math.abs(n), beta));
      sidebandFreqs.push(freq);
      sidebandMags.push(mag);
    }
  }

  const carsonBw = carsonBandwidth(beta, fm);

  return {
    time,
    message,
    modulated,
    instantFreq: instFreq,
    sidebandFreqs,
    sidebandMags,
    carsonBw,
  };
}

/**
 * Build demodulation view: discriminator output ∝ f_i(t) − f_c ∝ m(t).
 * Proakis & Salehi §3.3.3 / Ch 4 (FM discriminator).
 */
export function buildAnalogDemodView(p: AnalogDemodParams, tStart = 0): AnalogDemodView {
  const fp = p.fmParams;
  const fm = fp.messageFreq;
  const duration = 3 / fm;
  const fs = Math.max(20 * fp.carrierFreq, 100 * fm);
  const N = Math.ceil(fs * duration);
  const time = linspace(0, duration, N);
  const msg = [{ freq: fm, amp: 1 }];
  const original = time.map((tt) => evalSignal(msg, tStart + tt));

  const fi = time.map((tt) => instantFreq(msg, fp.carrierFreq, fp.modIndex, tStart + tt));
  const recovered = fi.map((f) => (f - fp.carrierFreq) / fp.modIndex);

  return { time, original, recovered, faithful: true };
}
