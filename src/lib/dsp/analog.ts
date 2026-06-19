import type { Tone } from './signals';
import { evalSignal, signalPeak } from './signals';
import { clamp } from './math';

export type AmMode = 'dsb' | 'conventional' | 'ssb-usb' | 'ssb-lsb' | 'vsb';
export type AngleMode = 'fm' | 'pm';

/**
 * AM modulated signal u(t). Proakis §3.2.1–3.2.4
 * - dsb: m(t)·cos(2π fc t)
 * - conventional: Ac[1 + a·mₙ(t)]·cos(2π fc t)
 * - ssb-usb/lsb: Ac[mₙ(t)cos(2π fc t) ∓ m̂ₙ(t)sin(2π fc t)]
 * - vsb: approximate dsb with partial sideband filtering near fc
 */
export function amSignal(
  mode: AmMode,
  msg: Tone[],
  fc: number,
  Ac: number,
  a: number,
  t: number,
): number {
  const mVal = evalSignal(msg, t);
  const mPeak = signalPeak(msg);
  const mNorm = mPeak > 1e-10 ? mVal / mPeak : 0;

  const carrier = Math.cos(2 * Math.PI * fc * t);

  switch (mode) {
    case 'dsb':
      // Proakis §3.2.1: u(t) = m(t)·cos(2π fc t)
      return mVal * carrier;

    case 'conventional':
      // Proakis §3.2.2: u(t) = Ac[1 + a·mₙ(t)]·cos(2π fc t)
      return Ac * (1 + a * mNorm) * carrier;

    case 'ssb-usb': {
      // Proakis §3.2.3: USB = Ac[mₙ(t)cos(2π fc t) − m̂ₙ(t)sin(2π fc t)]
      // For a single tone: approximate by shifting tone to fc + fm
      const sineCarrier = Math.sin(2 * Math.PI * fc * t);
      // Hilbert transform approximation for single tone: insert imaginary part
      // For tones, we can compute the analytic signal directly
      let hilbert = 0;
      for (const tone of msg) {
        // Hilbert of cos(2π fm t) = sin(2π fm t)
        hilbert += tone.amp * Math.sin(2 * Math.PI * tone.freq * t + (tone.phase ?? 0));
      }
      const hilbertNorm = mPeak > 1e-10 ? hilbert / mPeak : 0;
      return Ac * (mNorm * carrier - hilbertNorm * sineCarrier);
    }

    case 'ssb-lsb': {
      // Proakis §3.2.3: LSB = Ac[mₙ(t)cos(2π fc t) + m̂ₙ(t)sin(2π fc t)]
      const sineCarrier = Math.sin(2 * Math.PI * fc * t);
      let hilbert = 0;
      for (const tone of msg) {
        hilbert += tone.amp * Math.sin(2 * Math.PI * tone.freq * t + (tone.phase ?? 0));
      }
      const hilbertNorm = mPeak > 1e-10 ? hilbert / mPeak : 0;
      return Ac * (mNorm * carrier + hilbertNorm * sineCarrier);
    }

    case 'vsb': {
      // Proakis §3.2.4: VSB = DSB shaped by asymmetric filter near fc
      const vestige = (signalPeak(msg) > 0 ? signalPeak(msg) * fc * 0.1 : 0.1 * fc) || 100;
      const filterMag = vsbFilterMag(fc, fc, vestige);
      const dsbVal = mVal * carrier;
      // Apply amplitude shaping (time-domain approximation)
      return filterMag * dsbVal;
    }
  }
}

/**
 * Conventional-AM envelope = Ac[1 + a·mₙ(t)].
 * Proakis §3.2.2
 */
export function amEnvelope(msg: Tone[], Ac: number, a: number, t: number): number {
  const mVal = evalSignal(msg, t);
  const mPeak = signalPeak(msg);
  const mNorm = mPeak > 1e-10 ? mVal / mPeak : 0;
  // Proakis §3.2.2: e(t) = Ac[1 + a·mₙ(t)]
  return Ac * (1 + a * mNorm);
}

/**
 * Ideal diode + RC peak (envelope) detector — Proakis §3.3, Figs 3.27–3.28
 * (Book p.142–143). Models a half-wave rectifier feeding an RC lowpass: on each
 * sample the capacitor charges instantly to the (rectified) input while the diode
 * conducts (input ≥ the decayed capacitor voltage), otherwise it discharges
 * through the load resistor R:
 *
 *   v[n] = max( max(r[n], 0),  v[n-1]·e^(−Δt / RC) ),   Δt = 1/fs
 *
 * Faithful tracking needs 1/f_c ≪ RC ≪ 1/W: too small → the output ripples (LPF
 * bandwidth too wide); too large → the discharge is too slow and the output lags
 * the envelope on its falling edges (LPF bandwidth too narrow).
 *
 * @param rx received band-pass signal r(t) (the AM waveform seen by the diode)
 * @param fs sampling rate (Hz)
 * @param rc RC time constant (s); rc ≤ 0 → pure rectifier (no charge storage)
 * @returns  capacitor-voltage trace v_C(t), same length as `rx`
 */
export function envelopeDetect(rx: number[], fs: number, rc: number): number[] {
  const n = rx.length;
  const out = new Array<number>(n);
  if (n === 0) return out;
  // Per-sample discharge factor; rc ≤ 0 means the capacitor cannot hold charge.
  const decay = rc > 0 && fs > 0 ? Math.exp(-1 / (fs * rc)) : 0;
  let v = Math.max(rx[0], 0);
  out[0] = v;
  for (let i = 1; i < n; i++) {
    const charged = rx[i] > 0 ? rx[i] : 0; // diode conducts only on positive input
    const discharged = v * decay; // capacitor bleeds through R between peaks
    v = charged > discharged ? charged : discharged;
    out[i] = v;
  }
  return out;
}

/**
 * Modulation efficiency η = a²Pmn/(1+a²Pmn).
 * Proakis §3.2.2: ratio of sideband power to total power.
 * For single tone Pmn = 1/2, so η = a²/(2+a²); at a=1 → 1/3.
 */
export function amEfficiency(a: number, Pmn: number): number {
  if (Pmn <= 0) return 0;
  // Proakis §3.2.2: η = a²Pmn/(1+a²Pmn)
  const num = a * a * Pmn;
  return num / (1 + num);
}

/**
 * VSB sideband filter magnitude |H(f)|.
 * Proakis §3.2.4 s.85: vestige transition from 0 to 1 centered at fc.
 * Represents a linear slope through the carrier frequency.
 */
export function vsbFilterMag(f: number, fc: number, vestige: number): number {
  // Create a smooth transition centered at fc
  // At f=fc, returns 0.5 (half-amplitude point)
  // Vestige band defines the transition width
  const normalized = (f - (fc - vestige)) / (2 * vestige);
  return clamp(normalized, 0, 1);
}

/**
 * Real vestigial-sideband filter applied to a magnitude spectrum.
 * Proakis §3.2.4, Example 3.2.7 / Fig 3.21: the VSB filter has unity gain in the
 * passband, a linear vestige ramp across [f_c - vestige, f_c + vestige] with
 * H(f_c) = 1/2, and complementary symmetry H(f_c+δ) + H(f_c-δ) = 1, so the
 * vestige of the lower sideband exactly compensates the rolled-off upper edge.
 *
 * @param mag      magnitude values to filter
 * @param freq     frequency (Hz) for each magnitude bin (same length as `mag`)
 * @param fc       carrier frequency (Hz)
 * @param vestige  half-width (Hz) of the vestige transition band
 * @returns        filtered magnitudes, |H(f)|·mag
 */
export function vsbFilter(
  mag: number[],
  freq: number[],
  fc: number,
  vestige: number,
): number[] {
  return mag.map((m, i) => {
    const d = freq[i] - fc; // offset from carrier
    let h: number;
    if (d <= -vestige) h = 0;
    else if (d >= vestige) h = 1;
    else h = 0.5 + d / (2 * vestige); // linear ramp: H(fc)=0.5, complementary
    return m * h;
  });
}

/**
 * Angle-modulated signal. Proakis §3.3.1
 * FM: Ac·cos(2π fc t + 2π kf ∫m dτ)
 * PM: Ac·cos(2π fc t + kp·m(t))
 */
export function angleSignal(
  mode: AngleMode,
  msg: Tone[],
  fc: number,
  Ac: number,
  k: number,
  t: number,
): number {
  const basePhase = 2 * Math.PI * fc * t;

  if (mode === 'fm') {
    // FM: phase deviation = 2π kf ∫m(τ)dτ
    // For tones, ∫cos(2π fm τ) dτ = sin(2π fm τ)/(2π fm)
    let phaseDeviation = 0;
    for (const tone of msg) {
      // Integral of amp*cos(2π f τ + φ) is amp*sin(2π f τ + φ)/(2π f)
      const integral =
        (tone.amp * Math.sin(2 * Math.PI * tone.freq * t + (tone.phase ?? 0))) /
        (2 * Math.PI * tone.freq || 1e-10);
      phaseDeviation += 2 * Math.PI * k * integral;
    }
    // Proakis §3.3.1: u(t) = Ac·cos(2π fc t + Δφ)
    return Ac * Math.cos(basePhase + phaseDeviation);
  } else {
    // PM: phase modulation = kp·m(t)
    const mVal = evalSignal(msg, t);
    // Proakis §3.3.1: u(t) = Ac·cos(2π fc t + kp·m(t))
    return Ac * Math.cos(basePhase + k * mVal);
  }
}

/**
 * Instantaneous frequency f_i(t) = f_c + k_f·m(t) (FM).
 * Proakis §3.3.1
 */
export function instantFreq(msg: Tone[], fc: number, kf: number, t: number): number {
  const mVal = evalSignal(msg, t);
  // Proakis §3.3.1: f_i(t) = f_c + k_f·m(t)
  return fc + kf * mVal;
}

/**
 * First-kind Bessel function J_n(β) via series expansion.
 * Used for tone-FM line amplitudes (sidebands).
 * Proakis §3.3.2, Table 3.1
 * Series: J_n(β) = (β/2)^n · Σ_{m=0}^{∞} (-1)^m / (m!(m+n)!) · (β/2)^{2m}
 */
export function besselJ(n: number, beta: number): number {
  const absN = Math.abs(n);
  const halfBeta = beta / 2;

  // Compute (β/2)^n
  let power = 1;
  for (let i = 0; i < absN; i++) {
    power *= halfBeta;
  }

  // Factorial lookup
  const factorial = (k: number): number => {
    let f = 1;
    for (let i = 2; i <= k; i++) f *= i;
    return f;
  };

  // Sum series: Σ_{m=0}^{∞} (-1)^m / (m!(m+n)!) · (β/2)^{2m}
  let sum = 0;
  const x2 = halfBeta * halfBeta;
  for (let m = 0; m < 50; m++) {
    const term = (Math.pow(-1, m) / (factorial(m) * factorial(m + absN))) * Math.pow(x2, m);
    sum += term;
    if (Math.abs(term) < 1e-14) break;
  }

  return n >= 0 ? power * sum : Math.pow(-1, absN) * power * sum;
}

/**
 * Carson bandwidth B = 2(β+1)f_m for FM.
 * Proakis §3.3.2 s.103
 * β = modulation index = Δf / f_m = kf·A_m / f_m
 */
export function carsonBandwidth(beta: number, fm: number): number {
  // Proakis §3.3.2: B = 2(β+1)·f_m
  return 2 * (beta + 1) * fm;
}

/**
 * PLL carrier recovery: phase estimate θ̂(t).
 * Proakis §3.3.3 s.107
 * Simplified discrete-time loop: phase detector + integrator.
 */
export function pllRecoverPhase(u: number[], fc: number, fs: number): number[] {
  const theta = new Array<number>(u.length);
  let thetaEst = 0;
  const loopGain = 0.01; // Small integration step for convergence
  const omega = (2 * Math.PI * fc) / fs; // Digital frequency

  for (let n = 0; n < u.length; n++) {
    // Phase detector: error = u[n]·(−sin θ̂). The −sin gives NEGATIVE feedback:
    // after the loop filter averages out the 2·fc term, the control law is
    // Δ(θ̂−ψ) ≈ −½·loopGain·sin(θ̂−ψ), which drives θ̂ toward the carrier phase ψ.
    // (A +sin here is positive feedback — the estimate slips phase and the
    // recovered message rolls off/inverts over time.)
    const phaseError = -u[n] * Math.sin(thetaEst);
    // Integrator: update phase estimate
    thetaEst += omega + loopGain * phaseError;
    // Wrap to [-π, π]
    while (thetaEst > Math.PI) thetaEst -= 2 * Math.PI;
    while (thetaEst < -Math.PI) thetaEst += 2 * Math.PI;
    theta[n] = thetaEst;
  }

  return theta;
}

/**
 * Superheterodyne mixer: RF → IF + image.
 * Proakis §3.4 s.115
 * Mix rf[n] by local oscillator cos(2π fLo n/fs);
 * result has sum (≈2fc+fIf) and difference (fIf) components.
 */
export function heterodyneMix(
  rf: number[],
  fLo: number,
  fIf: number,
  fs: number,
): { if: number[]; image: number } {
  const ifSignal = new Array<number>(rf.length);
  const omega = (2 * Math.PI * fLo) / fs;

  for (let n = 0; n < rf.length; n++) {
    // Proakis §3.4: Multiply by cos(2π fLo n/fs)
    const lo = Math.cos(omega * n);
    const mixed = rf[n] * lo;
    // After lowpass filtering to extract difference component at fIf
    ifSignal[n] = mixed; // Conceptually after LPF, keep only fIf band
  }

  // Image frequency location (sum component would be at fLo + fIf when fLo=fc+fIf)
  const imageFreq = fLo + fIf;

  return { if: ifSignal, image: imageFreq };
}

// --- Chapter 4: Angle Modulation (FM/PM) ---

/**
 * FM modulation index for a sinusoidal message. Proakis & Salehi §4.2.1.
 * β = Δf / f_m = k_f·A_m / f_m  (FM).
 */
export function fmModIndex(kf: number, Am: number, fm: number): number {
  return (kf * Am) / (fm || 1e-12);
}

/**
 * Peak (instantaneous) frequency deviation Δf. Proakis & Salehi §4.1.
 * FM: Δf = k_f·max|m(t)| = k_f·A_m.
 * PM: the instantaneous-frequency deviation of a tone is Δf = k_p·A_m·f_m,
 *     since f_i − f_c = (1/2π)·dφ/dt and φ(t) = k_p·A_m·cos(2π f_m t).
 */
export function maxFreqDeviation(mode: AngleMode, k: number, Am: number, fm: number): number {
  return mode === 'fm' ? k * Am : k * Am * fm;
}

/**
 * Carson's-rule bandwidth for an arbitrary message. Proakis & Salehi §4.2.2, Eq. (4.2.19):
 * B = 2(β + 1)·W, where W is the message bandwidth and β = Δf/W. For a single tone this
 * reduces to `carsonBandwidth(β, f_m)` with W = f_m.
 */
export function carsonBandwidthArbitrary(beta: number, W: number): number {
  return 2 * (beta + 1) * W;
}

/**
 * Narrowband FM/PM approximation (β ≪ 1). Proakis & Salehi §4.1, Eq. (4.1.19):
 *   u(t) ≈ A_c·cos(2π f_c t) − A_c·φ(t)·sin(2π f_c t),
 * where φ(t) = 2π k_f ∫ m(τ)dτ is the same phase deviation `angleSignal` uses for FM.
 * Exact FM and this approximation diverge visibly as β grows past ~0.3.
 */
export function nbfmSignal(msg: Tone[], fc: number, Ac: number, kf: number, t: number): number {
  const basePhase = 2 * Math.PI * fc * t;
  let phi = 0;
  for (const tone of msg) {
    // ∫ amp·cos(2π f τ + φ) dτ = amp·sin(2π f τ + φ)/(2π f)
    const integral =
      (tone.amp * Math.sin(2 * Math.PI * tone.freq * t + (tone.phase ?? 0))) /
      (2 * Math.PI * tone.freq || 1e-10);
    phi += 2 * Math.PI * kf * integral;
  }
  return Ac * Math.cos(basePhase) - Ac * phi * Math.sin(basePhase);
}

/**
 * FM discriminator (§4.3.2, Eq. 4.3.12): recovers m(t) from an FM signal.
 * Steps: central-difference derivative → |·| (envelope) → moving-average LPF → DC removal.
 *
 * L = round(fs / (2·fc)) places the MA sinc null at 2·fc, suppressing the dominant
 * carrier-frequency ripple that appears in |du/dt| after the differentiator.
 */
export function fmDiscriminate(signal: number[], fs: number, fc: number): number[] {
  const N = signal.length;
  if (N < 3) return signal.slice();

  // Central-difference derivative ≈ du/dt (differentiator stage of §4.3.2).
  const diff = new Array<number>(N);
  diff[0] = (signal[1] - signal[0]) * fs;
  for (let i = 1; i < N - 1; i++) {
    diff[i] = (signal[i + 1] - signal[i - 1]) * (fs / 2);
  }
  diff[N - 1] = (signal[N - 1] - signal[N - 2]) * fs;

  // 4-pass zero-phase MA LPF (two forward-backward sweeps):
  // |H(f)|^4 attenuation with zero phase lag.
  // Null at fs/L = 2·fc suppresses dominant carrier ripple; two F-B sweeps
  // are needed because for high-β FM the ripple frequency 2·fi(t) drifts
  // significantly away from 2·fc, and a single causal pass both introduces a
  // 24° phase lag and leaves ~37% residual at the lowest ripple frequency.
  const L = Math.max(3, Math.round(fs / (2 * fc)));

  const fwdMA = (inp: number[], init: number): number[] => {
    const M = inp.length;
    const buf = new Float64Array(L);
    buf.fill(init);
    let s = init * L;
    const res = new Array<number>(M);
    for (let i = 0; i < M; i++) {
      const v = inp[i];
      const old = buf[i % L];
      buf[i % L] = v;
      s += v - old;
      res[i] = s / L;
    }
    return res;
  };

  // Backward pass = forward MA applied to a reversed copy, then re-reversed.
  const bwdMA = (a: number[]): number[] => {
    const rev = a.slice().reverse();
    return fwdMA(rev, rev[0]).reverse();
  };

  // Pass 1: rectify + forward MA
  const absD = diff.map(Math.abs);
  let stage = fwdMA(absD, absD[0]);
  // Passes 2–4: one backward + one forward + one backward (zero-phase net)
  stage = bwdMA(stage);
  stage = fwdMA(stage, stage[0]);
  const env = bwdMA(stage);

  // Remove DC: the envelope contains A_c·2π·f_c from f_i(t) = f_c + k_f·m(t).
  let mean = 0;
  for (let i = 0; i < N; i++) mean += env[i];
  mean /= N;
  const out = new Array<number>(N);
  for (let i = 0; i < N; i++) out[i] = env[i] - mean;
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLL FM Demodulator — Proakis & Salehi §4.3.3, Fig. 4.14
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FM PLL demodulator (§4.3.3, Fig. 4.14): recovers m(t) from an FM signal via
 * a 2nd-order Phase-Locked Loop (phase comparator → PI loop filter → VCO).
 *
 * At lock the VCO control voltage v(t) = k_f · m(t) / k_v (Eq. 4.3.20–4.3.23).
 * The 2nd-order PI loop filter with natural frequency ωn = 2π·Bn and damping ζ
 * gives the closed-loop phase TF H(f) = (j2πf·2ζωn + ωn²) / ((j2πf)² + j2πf·2ζωn + ωn²).
 *
 * A 1-carrier-period moving-average post-filter removes the 2·fc product ripple
 * that appears in the time-domain phase comparator output u[n]·(−sin θv[n]).
 *
 * @param signal FM signal samples u[n] = Ac·cos(ωc·n + φ[n])
 * @param fc     carrier frequency (Hz)
 * @param fs     sample rate (Hz)
 * @param Bn     loop noise bandwidth (Hz) — controls lock speed vs noise rejection
 * @param zeta   damping ratio ζ (0.707 = maximally-flat / Butterworth)
 * @returns recovered: smoothed VCO control ∝ m(t); phaseError: smoothed comparator output
 */
export function fmPllDemodulate(
  signal: number[],
  fc: number,
  fs: number,
  Bn: number,
  zeta: number,
): { recovered: number[]; phaseError: number[] } {
  const N = signal.length;
  if (N < 2) return { recovered: signal.slice(), phaseError: signal.slice() };

  const omegaC = (2 * Math.PI * fc) / fs;         // carrier frequency (rad/sample)
  const omegaN = (2 * Math.PI * Bn) / fs;          // natural frequency (rad/sample)
  const K1 = 2 * zeta * omegaN;                    // proportional gain
  const K2 = omegaN * omegaN;                      // integral gain

  const vcoCtrl = new Array<number>(N);
  const phaseErr = new Array<number>(N);

  let theta = 0;   // VCO phase accumulator
  let q = 0;       // PI integrator state

  for (let n = 0; n < N; n++) {
    // Phase comparator: u[n] × (−sin θv[n])
    // At lock → low-freq part ≈ (Ac/2)·sin(φ − φv) ≈ (Ac/2)·φe  (Eq. 4.3.19)
    const e = signal[n] * (-Math.sin(theta));
    // PI loop filter: v[n] = K1·e[n] + q[n], q[n+1] = q[n] + K2·e[n]
    const v = K1 * e + q;
    q += K2 * e;
    // VCO: θv[n+1] = θv[n] + ωc + v[n]  (Eq. 4.3.18)
    theta += omegaC + v;
    vcoCtrl[n] = v;
    phaseErr[n] = e;
  }

  // Post-filter: 1-carrier-period forward MA removes 2·fc product ripple.
  // Null placed at fs/L ≈ fc; minimal distortion to message at fm << fc.
  const L = Math.max(3, Math.round(fs / fc));
  const maFilter = (arr: number[]): number[] => {
    const out = new Array<number>(N);
    const buf = new Float64Array(L).fill(arr[0]);
    let s = arr[0] * L;
    for (let i = 0; i < N; i++) {
      s += arr[i] - buf[i % L];
      buf[i % L] = arr[i];
      out[i] = s / L;
    }
    return out;
  };

  return { recovered: maFilter(vcoCtrl), phaseError: maFilter(phaseErr) };
}

// ─────────────────────────────────────────────────────────────────────────────
// FM Radio Broadcasting helpers — Proakis & Salehi §4.4
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-emphasis magnitude response in dB for an array of frequencies.
 * H_pe(f) = 1 + j·f/f₁  →  |H_pe(f)|_dB = 10·log₁₀(1 + (f/f₁)²)
 * Proakis §6.2.2; τ = 75 µs → f₁ = 1/(2π·75µs) ≈ 2120 Hz for commercial FM.
 */
export function preEmphasisMagDb(freqs: number[], f1: number): number[] {
  return freqs.map((f) => 10 * Math.log10(1 + (f / f1) ** 2));
}

/**
 * De-emphasis magnitude response in dB for an array of frequencies.
 * H_de(f) = 1/(1 + j·f/f₁)  →  |H_de(f)|_dB = −10·log₁₀(1 + (f/f₁)²)
 * Proakis §6.2.2.
 */
export function deEmphasisMagDb(freqs: number[], f1: number): number[] {
  return freqs.map((f) => -10 * Math.log10(1 + (f / f1) ** 2));
}

/**
 * SNR improvement (dB) achieved by the pre/de-emphasis pair.
 * Derived from Proakis §6.2.2: ratio of noise power without to with de-emphasis,
 * integrated over [0, W].  gain = (W/f₁)³ / (3·(W/f₁ − arctan(W/f₁)))
 * Returns result in dB; W is the audio bandwidth (e.g. 15000 Hz for FM radio).
 */
export function emphasisSnrGainDb(f1: number, W: number): number {
  const r = W / f1;
  const linear = r ** 3 / (3 * (r - Math.atan(r)));
  return 10 * Math.log10(Math.max(linear, 1e-30));
}

/**
 * Stereo composite baseband spectrum magnitude (normalized) for display.
 * Returns parallel arrays: freqs (Hz) and mag (0–1).
 *
 * Composite signal (Proakis §4.4.2, Fig. 4.17):
 *   - L+R baseband: 0–15 kHz
 *   - 19 kHz pilot tone (narrow)
 *   - L-R DSB-SC: 23–53 kHz (centred at 38 kHz)
 *
 * balance ∈ [−1, 1]: +1 = full left, −1 = full right; affects L-R amplitude.
 */
export function stereoMuxSpectrum(balance: number): { freqs: number[]; mag: number[] } {
  const N = 600;
  const fMax = 60_000;
  const freqs: number[] = [];
  const mag: number[] = [];

  const lrAmp = Math.abs(balance);

  for (let i = 0; i <= N; i++) {
    const f = (i / N) * fMax;
    freqs.push(f);

    let v = 0;
    // L+R baseband: 0–15 kHz
    if (f <= 15_000) {
      v = Math.max(0, 1 - (f / 15_000) ** 4) * 0.9;
    }
    // 19 kHz pilot tone — narrow Gaussian
    const dPilot = f - 19_000;
    v = Math.max(v, 0.7 * Math.exp(-((dPilot / 400) ** 2)));
    // L-R DSB-SC: 23–53 kHz centred at 38 kHz — raised cosine envelope
    if (f >= 23_000 && f <= 53_000) {
      const norm = (f - 38_000) / 15_000;
      const envelope = 0.5 * (1 + Math.cos(Math.PI * norm));
      v = Math.max(v, lrAmp * envelope * 0.85);
    }
    mag.push(v);
  }

  return { freqs, mag };
}
