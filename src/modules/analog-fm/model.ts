import { linspace } from '@/lib/dsp/math';
import { evalSignal, signalPeak, periodicWave, type Tone } from '@/lib/dsp/signals';
import { fft } from '@/lib/dsp/fft';
import type { AngleMode } from '@/lib/dsp/analog';
import {
  angleSignal,
  instantFreq,
  besselJ,
  carsonBandwidth,
  maxFreqDeviation,
  carsonBandwidthArbitrary,
  fmDiscriminate,
  fmPllDemodulate,
} from '@/lib/dsp/analog';
import { addNoiseAtSnr, measuredSnrDb } from '@/lib/dsp/analognoise';

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

// ============================================================================
// Chapter 4 rebuild — per-tab view builders
// ============================================================================

/** Message waveform choices for the Representation tab (the shared "signal sets"). */
export type FmMessageWave = 'sine' | 'square' | 'triangle' | 'sawtooth' | 'twoTone' | 'threeTone';

// Fixed Fourier-series length for square/triangle/sawtooth messages. The
/**
 * Exact message value m(t) for the selected waveform — no Fourier truncation, so
 * square/triangle/sawtooth are perfectly shaped (no Gibbs ringing). Sine and
 * two/three-tone are exact sums of cosines.
 */
function evalFmMessage(wave: FmMessageWave, fm: number, f2: number, f3: number, t: number): number {
  switch (wave) {
    case 'sine':
      return Math.cos(2 * Math.PI * fm * t);
    case 'twoTone':
      return Math.cos(2 * Math.PI * fm * t) + 0.6 * Math.cos(2 * Math.PI * f2 * t);
    case 'threeTone':
      return (
        Math.cos(2 * Math.PI * fm * t) +
        0.6 * Math.cos(2 * Math.PI * f2 * t) +
        0.4 * Math.cos(2 * Math.PI * f3 * t)
      );
    case 'square':
    case 'triangle':
    case 'sawtooth':
      return periodicWave(wave, fm, t);
  }
}

/** Representation tab (§4.1): FM/PM waveform, instantaneous frequency/phase, NBFM overlay. */
export interface FmReprParams {
  mode: AngleMode; // 'fm' | 'pm'
  messageWave: FmMessageWave; // message signal shape
  messageFreq: number; // f_m (Hz) — fundamental / first tone
  tone2Freq: number; // f_2 (Hz) — two/three-tone second tone
  tone3Freq: number; // f_3 (Hz) — three-tone third tone
  carrierFreq: number; // f_c (Hz)
  carrierAmp: number; // A_c (V)
  beta: number; // modulation index β (FM) / phase index β_p (PM)
}

export interface FmReprView {
  time: number[];
  message: number[]; // m(t), unit-amplitude tone
  modulated: number[]; // exact FM/PM u(t)
  nbfm: number[]; // narrowband approximation of u(t)
  instFreq: number[]; // f_i(t) (Hz) — meaningful for FM
  instPhase: number[]; // θ(t) (rad) — meaningful for PM
  deltaF: number; // peak frequency deviation Δf (Hz)
  fiMin: number; // f_c − Δf
  fiMax: number; // f_c + Δf
  isNbfm: boolean; // narrowband regime (β < 0.3)
  mode: AngleMode;
}

/**
 * Build the Representation view. Proakis & Salehi §4.1.
 * The exact message is normalized to max|m| ≈ 1, so k_f = β·f_m gives FM index β and
 * k_p = β gives PM peak phase β — both modes share Δf = β·f_m, f_i ∈ [f_c−Δf, f_c+Δf].
 * The FM phase is the running integral of m(t), computed numerically (cumulative
 * trapezoid) like the MATLAB reference fm1.m/fm2.m — so even discontinuous messages
 * (square, sawtooth) stay perfectly shaped instead of ringing.
 */
export function buildFmReprView(p: FmReprParams, tStart = 0): FmReprView {
  const fm = p.messageFreq;
  const Ac = p.carrierAmp;
  const beta = p.beta;
  const kf = beta * fm; // FM frequency sensitivity (Hz)
  const kp = beta; // PM phase sensitivity (rad)

  const duration = 4 / fm; // 4 message periods
  const fs = Math.max(24 * p.carrierFreq, 80 * fm);
  const N = Math.min(3000, Math.max(600, Math.ceil(fs * duration)));
  const time = linspace(0, duration, N);
  const dt = duration / (N - 1);

  // Exact message samples, normalized to max|m| ≈ 1 (keeps Δf = β·f_m for every shape).
  const raw = time.map((t) => evalFmMessage(p.messageWave, fm, p.tone2Freq, p.tone3Freq, tStart + t));
  let peak = 0;
  for (const v of raw) peak = Math.max(peak, Math.abs(v));
  const norm = peak || 1;
  const message = raw.map((v) => v / norm);

  // Running integral ∫m dτ (cumulative trapezoid) → FM phase deviation 2π·k_f·∫m.
  const integral = new Array<number>(N);
  integral[0] = 0;
  for (let i = 1; i < N; i++) integral[i] = integral[i - 1] + 0.5 * (message[i] + message[i - 1]) * dt;

  const modulated = new Array<number>(N);
  const nbfm = new Array<number>(N);
  const instFreq = new Array<number>(N);
  const instPhase = new Array<number>(N);
  for (let i = 0; i < N; i++) {
    const base = 2 * Math.PI * p.carrierFreq * time[i];
    const phi = p.mode === 'fm' ? 2 * Math.PI * kf * integral[i] : kp * message[i];
    modulated[i] = Ac * Math.cos(base + phi);
    nbfm[i] = Ac * Math.cos(base) - Ac * phi * Math.sin(base); // small-angle NBFM/NBPM
    instFreq[i] = p.carrierFreq + kf * message[i]; // FM: f_i(t) = f_c + k_f·m(t)
    instPhase[i] = kp * message[i]; // PM phase deviation θ(t) = k_p·m(t)
  }

  const deltaF = maxFreqDeviation(p.mode, p.mode === 'fm' ? kf : kp, 1, fm); // β·f_m in both modes
  return {
    time,
    message,
    modulated,
    nbfm,
    instFreq,
    instPhase,
    deltaF,
    fiMin: p.carrierFreq - deltaF,
    fiMax: p.carrierFreq + deltaF,
    isNbfm: beta < 0.3,
    mode: p.mode,
  };
}

/** Spectrum tab (§4.2): tone Bessel line spectrum or arbitrary-message magnitude spectrum. */
export interface FmSpectrumParams {
  messageType: 'tone' | 'arbitrary';
  carrierFreq: number; // f_c (Hz)
  carrierAmp: number; // A_c (V)
  messageFreq: number; // tone f_m (Hz)
  beta: number; // tone modulation index β
  bandwidth: number; // arbitrary message bandwidth W (Hz)
  deltaF: number; // arbitrary peak deviation Δf (Hz)
}

export interface FmSpectrumView {
  isTone: boolean;
  fc: number;
  beta: number;
  carsonBw: number; // Carson bandwidth B_c (Hz)
  carsonLo: number; // f_c − B_c/2
  carsonHi: number; // f_c + B_c/2
  // Tone (line spectrum):
  sidebandFreqs: number[];
  sidebandMags: number[]; // A_c·|J_n(β)|
  nSignificant: number; // count of |J_n(β)| ≥ 0.01
  // Arbitrary (continuous magnitude spectrum, fftshifted to f_c):
  fftFreqs: number[];
  fftMags: number[];
}

const FFT_N = 2048;

/**
 * Build the Spectrum view. Proakis & Salehi §4.2.
 * Tone: u(t) = A_c Σ J_n(β) cos(2π(f_c + n f_m)t) → lines at f_c + n f_m (Eq. 4.2.4–4.2.5).
 * Arbitrary: FFT of the complex baseband FM signal exp(jφ(t)) for a band-limited
 * message, shifted to f_c; Carson bandwidth B_c = 2(β+1)W (Eq. 4.2.19).
 */
export function buildFmSpectrumView(p: FmSpectrumParams): FmSpectrumView {
  const fc = p.carrierFreq;

  if (p.messageType === 'tone') {
    const fm = p.messageFreq;
    const beta = p.beta;
    const M = Math.max(1, Math.ceil(beta) + 4);
    const sidebandFreqs: number[] = [];
    const sidebandMags: number[] = [];
    let nSignificant = 0;
    for (let n = -M; n <= M; n++) {
      const mag = Math.abs(besselJ(n, beta));
      if (mag >= 0.01) nSignificant++;
      const f = fc + n * fm;
      if (f > 0) {
        sidebandFreqs.push(f);
        sidebandMags.push(p.carrierAmp * mag);
      }
    }
    const carsonBw = carsonBandwidth(beta, fm);
    return {
      isTone: true,
      fc,
      beta,
      carsonBw,
      carsonLo: fc - carsonBw / 2,
      carsonHi: fc + carsonBw / 2,
      sidebandFreqs,
      sidebandMags,
      nSignificant,
      fftFreqs: [],
      fftMags: [],
    };
  }

  // Arbitrary message: 3-tone signal with golden-ratio spaced frequencies so that
  // no two tones are harmonically related (f2/f1 = f3/f2 = φ ≈ 1.618, irrational).
  // Harmonic spacing (e.g. W/3, 2W/3, W) causes sideband aliasing that makes the
  // baseband spectrum asymmetric — golden-ratio spacing avoids this entirely.
  const W = p.bandwidth;
  const PHI = (1 + Math.sqrt(5)) / 2; // golden ratio φ ≈ 1.618
  const raw: Tone[] = [
    { freq: W / (PHI * PHI), amp: 1 },   // ≈ 0.382 W
    { freq: W / PHI,          amp: 0.6 }, // ≈ 0.618 W
    { freq: W,                amp: 0.4 },
  ];
  const peak = signalPeak(raw) || 1;
  const msg: Tone[] = raw.map((tone) => ({ ...tone, amp: tone.amp / peak }));
  const kf = p.deltaF; // Δf = k_f·max|m| with max|m| ≈ 1
  const beta = p.deltaF / (W || 1e-12);
  const carsonBw = carsonBandwidthArbitrary(beta, W);
  const fsBb = Math.max(4 * carsonBw, 8 * W); // baseband sample rate
  const dt = 1 / fsBb;

  // Complex baseband FM s(t) = exp(j·2π k_f ∫m), windowed (Hann) to limit leakage.
  const sig: { re: number; im: number }[] = new Array(FFT_N);
  for (let n = 0; n < FFT_N; n++) {
    const t = n * dt;
    let phi = 0;
    for (const tone of msg) {
      phi +=
        (2 * Math.PI * kf * (tone.amp * Math.sin(2 * Math.PI * tone.freq * t))) /
        (2 * Math.PI * tone.freq || 1e-10);
    }
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (FFT_N - 1)));
    sig[n] = { re: w * Math.cos(phi), im: w * Math.sin(phi) };
  }

  const X = fft(sig);
  const half = FFT_N / 2;
  const fftFreqs: number[] = new Array(FFT_N);
  const fftMags: number[] = new Array(FFT_N);
  for (let k = 0; k < FFT_N; k++) {
    const src = (k + half) % FFT_N; // fftshift so axis runs −fs/2 … fs/2
    fftFreqs[k] = fc + ((k - half) * fsBb) / FFT_N;
    fftMags[k] = Math.hypot(X[src].re, X[src].im) / FFT_N;
  }

  return {
    isTone: false,
    fc,
    beta,
    carsonBw,
    carsonLo: fc - carsonBw / 2,
    carsonHi: fc + carsonBw / 2,
    sidebandFreqs: [],
    sidebandMags: [],
    nSignificant: 0,
    fftFreqs,
    fftMags,
  };
}

// ============================================================================
// Mod/Demod tab — Phase 2 (§4.3)
// ============================================================================

/** Parameters for the FM discriminator simulation panel (§4.3.2). */
export interface FmDemodParams {
  carrierFreq: number;  // f_c (Hz)
  beta: number;         // β = Δf / f_m
  msgFreq: number;      // f_m (Hz)
  noiseEnabled: boolean;
  snrDb: number;        // input SNR (dB)
}

/** Computed data for the discriminator simulation panel. */
export interface FmDemodView {
  time: number[];
  original: number[];   // m(t) normalized to ±1
  recovered: number[];  // discriminator output, normalized to ±1
  measuredSnr: number;  // output SNR (dB)
  deltaF: number;       // peak frequency deviation Δf = β·f_m (Hz)
  beta: number;
}

/**
 * Build the FM demodulator simulation view. (§4.3.2, Eq. 4.3.12)
 * Generates a single-tone FM signal, optionally adds AWGN, then runs the
 * FM discriminator (central-diff derivative → |·| → MA-LPF → DC removal).
 */
export function buildFmDemodView(p: FmDemodParams): FmDemodView {
  const { carrierFreq: fc, beta, msgFreq: fm, noiseEnabled, snrDb } = p;
  const kf = beta * fm;
  const duration = 4 / fm;
  const fs = Math.max(20 * fc, 100 * fm);
  const N = Math.min(6000, Math.ceil(fs * duration));
  const dt = duration / (N - 1);
  const time = linspace(0, duration, N);

  const original = time.map((tv) => Math.cos(2 * Math.PI * fm * tv));

  // Cumulative trapezoid integral of m(t) for FM phase.
  const integral = new Array<number>(N);
  integral[0] = 0;
  for (let i = 1; i < N; i++) {
    integral[i] = integral[i - 1] + 0.5 * (original[i] + original[i - 1]) * dt;
  }

  const fmSig = integral.map((v, i) =>
    Math.cos(2 * Math.PI * fc * time[i] + 2 * Math.PI * kf * v),
  );

  let noisy: number[];
  if (noiseEnabled) {
    const noisyF64 = addNoiseAtSnr(new Float64Array(fmSig), snrDb, () => Math.random());
    noisy = Array.from(noisyF64);
  } else {
    noisy = fmSig;
  }

  const raw = fmDiscriminate(noisy, fs, fc);

  // Normalize to ±1 to match the original.
  let peak = 0;
  for (const v of raw) peak = Math.max(peak, Math.abs(v));
  const recovered = peak > 1e-10 ? raw.map((v) => v / peak) : raw.slice();

  const measuredSnr = measuredSnrDb(new Float64Array(recovered), new Float64Array(original));

  return { time, original, recovered, measuredSnr, deltaF: kf, beta };
}

// ============================================================================
// PLL FM Demodulator — §4.3.3, Fig. 4.14
// ============================================================================

/** Parameters for the PLL FM demodulator simulation panel (§4.3.3). */
export interface FmPllParams {
  carrierFreq: number;   // f_c (Hz)
  beta: number;          // β = Δf / f_m
  msgFreq: number;       // f_m (Hz)
  noiseEnabled: boolean;
  snrDb: number;         // input SNR (dB)
  loopBn: number;        // loop noise bandwidth B_n (Hz)
  damping: number;       // damping ratio ζ
}

/** Computed data for the PLL demodulator simulation panel. */
export interface FmPllView {
  time: number[];
  original: number[];    // m(t) normalized to ±1
  recovered: number[];   // PLL VCO control v(t), normalized to ±1
  phaseError: number[];  // smoothed phase comparator output, normalized to initial peak
  measuredSnr: number;
  deltaF: number;
  beta: number;
  loopBn: number;
}

/**
 * Build the PLL FM demodulator simulation view. (§4.3.3, Fig. 4.14)
 * Generates the same FM signal as buildFmDemodView, then feeds it to the
 * discrete-time 2nd-order PLL. The VCO control v[n] ∝ k_f·m(t)/k_v at lock.
 */
export function buildFmPllView(p: FmPllParams): FmPllView {
  const { carrierFreq: fc, beta, msgFreq: fm, noiseEnabled, snrDb, loopBn, damping } = p;
  const kf = beta * fm;
  const duration = 4 / fm;
  const fs = Math.max(20 * fc, 100 * fm);
  const N = Math.min(6000, Math.ceil(fs * duration));
  const dt = duration / (N - 1);
  const time = linspace(0, duration, N);

  const original = time.map((tv) => Math.cos(2 * Math.PI * fm * tv));

  const integral = new Array<number>(N);
  integral[0] = 0;
  for (let i = 1; i < N; i++) {
    integral[i] = integral[i - 1] + 0.5 * (original[i] + original[i - 1]) * dt;
  }

  const fmSig = integral.map((v, i) =>
    Math.cos(2 * Math.PI * fc * time[i] + 2 * Math.PI * kf * v),
  );

  let noisy: number[];
  if (noiseEnabled) {
    const noisyF64 = addNoiseAtSnr(new Float64Array(fmSig), snrDb, () => Math.random());
    noisy = Array.from(noisyF64);
  } else {
    noisy = fmSig;
  }

  const { recovered: raw, phaseError: rawPe } = fmPllDemodulate(noisy, fc, fs, loopBn, damping);

  let peak = 0;
  for (const v of raw) peak = Math.max(peak, Math.abs(v));
  const recovered = peak > 1e-10 ? raw.map((v) => v / peak) : raw.slice();

  let pePeak = 0;
  for (const v of rawPe) pePeak = Math.max(pePeak, Math.abs(v));
  const phaseError = pePeak > 1e-10 ? rawPe.map((v) => v / pePeak) : rawPe.slice();

  const measuredSnr = measuredSnrDb(new Float64Array(recovered), new Float64Array(original));

  return { time, original, recovered, phaseError, measuredSnr, deltaF: kf, beta, loopBn };
}
