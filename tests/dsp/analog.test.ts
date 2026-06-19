import { describe, it, expect } from 'vitest';
import {
  amSignal,
  amEnvelope,
  amEfficiency,
  envelopeDetect,
  vsbFilterMag,
  angleSignal,
  instantFreq,
  besselJ,
  carsonBandwidth,
  pllRecoverPhase,
  heterodyneMix,
  fmModIndex,
  maxFreqDeviation,
  carsonBandwidthArbitrary,
  nbfmSignal,
  fmDiscriminate,
  fmPllDemodulate,
  preEmphasisMagDb,
  deEmphasisMagDb,
  emphasisSnrGainDb,
  stereoMuxSpectrum,
} from '@/lib/dsp/analog';

describe('amEnvelope', () => {
  it('with zero message equals Ac', () => {
    const env = amEnvelope([], 1, 0.5, 0);
    expect(env).toBeCloseTo(1, 12);
  });

  it('with a single tone stays within Ac[1±a]', () => {
    const msg = [{ freq: 1, amp: 1 }];
    const Ac = 2;
    const a = 0.5;
    for (let t = 0; t <= 1; t += 0.1) {
      const env = amEnvelope(msg, Ac, a, t);
      expect(env).toBeGreaterThanOrEqual(Ac * (1 - a) - 1e-10);
      expect(env).toBeLessThanOrEqual(Ac * (1 + a) + 1e-10);
    }
  });
});

describe('envelopeDetect (diode + RC peak detector, Fig 3.28)', () => {
  const fc = 20000;
  const fm = 1000;
  const fs = 40 * fc; // ~40 samples per carrier cycle
  const Ac = 1;
  const a = 0.8;
  const msg = [{ freq: fm, amp: 1 }];
  const N = Math.round(fs * (4 / fm)); // 4 message periods
  const peakEnv = Ac * (1 + a);
  const tAt = (i: number) => i / fs;
  const rx = Array.from({ length: N }, (_, i) => amSignal('conventional', msg, fc, Ac, a, tAt(i)));
  const env = Array.from({ length: N }, (_, i) => amEnvelope(msg, Ac, a, tAt(i)));

  // RC bounds for these params: 1/fc = 50 µs, 1/W = 1/fm = 1000 µs.
  const RC_SMALL = 5e-6; // ≪ 1/fc → ripple
  const RC_GOOD = 200e-6; // 1/fc ≪ RC ≪ 1/W
  const RC_LARGE = 5e-3; // ≫ 1/W → lag

  const maxEnvError = (rc: number) => {
    const out = envelopeDetect(rx, fs, rc);
    let e = 0;
    for (let i = Math.floor(N / 2); i < N; i++) e = Math.max(e, Math.abs(out[i] - env[i]));
    return e;
  };

  it('output is non-negative and the same length as the input', () => {
    const out = envelopeDetect(rx, fs, RC_GOOD);
    expect(out).toHaveLength(N);
    expect(out.every((v) => v >= 0)).toBe(true);
  });

  it('a good RC tracks the AM envelope closely', () => {
    expect(maxEnvError(RC_GOOD)).toBeLessThan(0.3 * peakEnv);
  });

  it('smaller RC ⇒ more inter-peak ripple near an envelope peak', () => {
    const ripple = (rc: number) => {
      const out = envelopeDetect(rx, fs, rc);
      const center = Math.round(fs / fm); // one message period in → an envelope max
      const half = Math.round(fs / fc); // one carrier period
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = center - half; i <= center + half; i++) {
        lo = Math.min(lo, out[i]);
        hi = Math.max(hi, out[i]);
      }
      return hi - lo;
    };
    expect(ripple(RC_SMALL)).toBeGreaterThan(ripple(RC_GOOD));
  });

  it('too-large RC lags: output sits above the true envelope at a trough', () => {
    const outLarge = envelopeDetect(rx, fs, RC_LARGE);
    const outGood = envelopeDetect(rx, fs, RC_GOOD);
    const trough = Math.round(fs / (2 * fm)); // env minimum for a cos message
    expect(outLarge[trough]).toBeGreaterThan(env[trough] + 0.2 * Ac);
    expect(outGood[trough]).toBeLessThan(outLarge[trough]);
    // The lag also shows up as a much larger tracking error overall.
    expect(maxEnvError(RC_GOOD)).toBeLessThan(maxEnvError(RC_LARGE));
  });
});

describe('amEfficiency', () => {
  it('returns 0 when a=0', () => {
    expect(amEfficiency(0, 0.5)).toBeCloseTo(0, 12);
  });

  it('amEfficiency(1, 0.5) ≈ 1/3 (tone at full scale)', () => {
    const eta = amEfficiency(1, 0.5);
    expect(eta).toBeCloseTo(1 / 3, 3);
  });

  it('increases with modulation index a', () => {
    const Pmn = 0.5;
    const eta0 = amEfficiency(0.5, Pmn);
    const eta1 = amEfficiency(1, Pmn);
    expect(eta1).toBeGreaterThan(eta0);
  });
});

describe('besselJ', () => {
  it('J0(1) ≈ 0.7652 (Proakis Table 3.1)', () => {
    expect(besselJ(0, 1)).toBeCloseTo(0.7652, 3);
  });

  it('J1(1) ≈ 0.4401', () => {
    expect(besselJ(1, 1)).toBeCloseTo(0.4401, 3);
  });

  it('J2(1) ≈ 0.1149', () => {
    expect(besselJ(2, 1)).toBeCloseTo(0.1149, 3);
  });

  it('J0(0) = 1', () => {
    expect(besselJ(0, 0)).toBeCloseTo(1, 12);
  });

  it('Jn values for β=2 are reasonable (from tables)', () => {
    // J0(2) ≈ 0.2239, J1(2) ≈ 0.3540, J2(2) ≈ 0.1289
    const j0 = besselJ(0, 2);
    const j1 = besselJ(1, 2);
    const j2 = besselJ(2, 2);
    // All should be real and within reasonable range
    expect(j0).toBeGreaterThan(0);
    expect(j0).toBeLessThan(1);
    expect(j1).toBeGreaterThan(0);
    expect(j1).toBeLessThan(1);
    expect(j2).toBeGreaterThan(0);
    expect(j2).toBeLessThan(1);
  });
});

describe('carsonBandwidth', () => {
  it('carsonBandwidth(2, 5) = 30', () => {
    expect(carsonBandwidth(2, 5)).toBeCloseTo(30, 12);
  });

  it('B = 2(β+1)fm', () => {
    const beta = 3;
    const fm = 4;
    const B = carsonBandwidth(beta, fm);
    expect(B).toBeCloseTo(2 * (beta + 1) * fm, 12);
  });
});

describe('instantFreq', () => {
  it('at message zero equals fc', () => {
    const freq = instantFreq([], 1000, 100, 0);
    expect(freq).toBeCloseTo(1000, 12);
  });

  it('at message peak = fc + kf*peak', () => {
    const msg = [{ freq: 1, amp: 2 }]; // peak = 2
    const fc = 1000;
    const kf = 50;
    const freq = instantFreq(msg, fc, kf, 0); // at t=0, msg = 2
    expect(freq).toBeCloseTo(fc + kf * 2, 12);
  });
});

describe('vsbFilterMag', () => {
  it('at carrier frequency equals 0.5', () => {
    const mag = vsbFilterMag(1000, 1000, 100);
    expect(mag).toBeCloseTo(0.5, 2);
  });

  it('magnitude clamps to [0, 1]', () => {
    const mag1 = vsbFilterMag(500, 1000, 100);
    const mag2 = vsbFilterMag(1500, 1000, 100);
    expect(mag1).toBeGreaterThanOrEqual(0);
    expect(mag1).toBeLessThanOrEqual(1);
    expect(mag2).toBeGreaterThanOrEqual(0);
    expect(mag2).toBeLessThanOrEqual(1);
  });
});

describe('amSignal', () => {
  it('dsb with zero message = 0', () => {
    const sig = amSignal('dsb', [], 1000, 1, 0.5, 0);
    expect(sig).toBeCloseTo(0, 12);
  });

  it('conventional with zero message = Ac*cos(2πfct)', () => {
    const sig = amSignal('conventional', [], 1000, 1, 0.5, 0);
    expect(sig).toBeCloseTo(1, 12);
  });

  it('conventional modulated signal is bounded by envelope', () => {
    const msg = [{ freq: 100, amp: 1 }];
    const Ac = 1;
    const a = 0.5;
    let maxSig = 0;
    for (let t = 0; t <= 0.01; t += 0.0001) {
      const sig = Math.abs(amSignal('conventional', msg, 10000, Ac, a, t));
      maxSig = Math.max(maxSig, sig);
    }
    expect(maxSig).toBeLessThanOrEqual(Ac * (1 + a) + 1e-10);
  });
});

describe('angleSignal', () => {
  it('FM with zero message has zero modulation phase', () => {
    // At t=0 with zero message, phase deviation should be 0
    const fc = 10000;
    const sig = angleSignal('fm', [], fc, 1, 100, 0);
    expect(sig).toBeCloseTo(1, 6); // cos(2π*fc*0 + 0) = 1
  });

  it('FM maintains constant envelope', () => {
    const msg = [{ freq: 100, amp: 1 }];
    const Ac = 2;
    let maxSig = 0;
    for (let t = 0; t <= 0.01; t += 0.001) {
      const sig = Math.abs(angleSignal('fm', msg, 10000, Ac, 100, t));
      maxSig = Math.max(maxSig, sig);
    }
    expect(maxSig).toBeCloseTo(Ac, 1);
  });
});

describe('pllRecoverPhase', () => {
  it('returns array of same length as input', () => {
    const input = new Array(100).fill(0);
    const theta = pllRecoverPhase(input, 1000, 10000);
    expect(theta).toHaveLength(100);
  });

  it('locks: recovered carrier cos(θ̂) tracks the reference (no phase slip)', () => {
    const fc = 2000;
    const fs = 20 * fc; // 20 samples/carrier cycle, as the demod model uses
    const duration = 0.01; // 10 ms
    const N = Math.ceil(fs * duration);
    const input = new Array(N);
    for (let n = 0; n < N; n++) {
      input[n] = Math.cos((2 * Math.PI * fc * n) / fs);
    }
    const theta = pllRecoverPhase(input, fc, fs);
    // Normalized correlation over the tail ≈ 1 when locked. A sign error in the
    // phase detector makes the loop slip phase, dropping this well below 1.
    const tail = 20;
    let dot = 0;
    let e2 = 0;
    let r2 = 0;
    for (let i = N - tail; i < N; i++) {
      const c = Math.cos(theta[i]);
      dot += c * input[i];
      e2 += c * c;
      r2 += input[i] * input[i];
    }
    const correlation = dot / Math.sqrt(e2 * r2);
    // Locked → ≈1. A sign error in the phase detector drives this to ~0 or
    // negative (the estimate slips/inverts), so 0.9 is a meaningful guard.
    expect(correlation).toBeGreaterThan(0.9);
  });
});

describe('fmModIndex (Ch4 §4.2.1)', () => {
  it('β = kf·Am/fm', () => {
    expect(fmModIndex(1000, 1, 1000)).toBeCloseTo(1, 12);
    expect(fmModIndex(5000, 1, 1000)).toBeCloseTo(5, 12);
    expect(fmModIndex(2000, 2, 1000)).toBeCloseTo(4, 12);
  });
});

describe('maxFreqDeviation (Ch4 §4.1)', () => {
  it('FM: Δf = kf·Am', () => {
    expect(maxFreqDeviation('fm', 5000, 1, 1000)).toBeCloseTo(5000, 12);
  });
  it('PM: Δf = kp·Am·fm', () => {
    expect(maxFreqDeviation('pm', 3, 1, 1000)).toBeCloseTo(3000, 12);
  });
});

describe('carsonBandwidthArbitrary (Ch4 §4.2.2, Eq. 4.2.19)', () => {
  it('B = 2(β+1)W', () => {
    expect(carsonBandwidthArbitrary(2, 5000)).toBeCloseTo(30000, 12);
  });
  it('reduces to the tone form carsonBandwidth(β, fm) when W = fm', () => {
    const beta = 3;
    const fm = 4000;
    expect(carsonBandwidthArbitrary(beta, fm)).toBeCloseTo(carsonBandwidth(beta, fm), 9);
  });
});

describe('nbfmSignal (Ch4 §4.1, Eq. 4.1.19)', () => {
  const fc = 20000;
  const fm = 1000;
  const Ac = 1;
  const msg = [{ freq: fm, amp: 1 }];

  it('approximates exact FM closely for small β (kf = β·fm, β = 0.1)', () => {
    const kf = 0.1 * fm; // β = 0.1
    let maxErr = 0;
    for (let i = 0; i < 200; i++) {
      const t = i / (40 * fc);
      const err = Math.abs(nbfmSignal(msg, fc, Ac, kf, t) - angleSignal('fm', msg, fc, Ac, kf, t));
      maxErr = Math.max(maxErr, err);
    }
    expect(maxErr).toBeLessThan(0.02 * Ac);
  });

  it('diverges from exact FM at large β (β = 5)', () => {
    const kf = 5 * fm; // β = 5
    let maxErr = 0;
    for (let i = 0; i < 400; i++) {
      const t = i / (40 * fc);
      const err = Math.abs(nbfmSignal(msg, fc, Ac, kf, t) - angleSignal('fm', msg, fc, Ac, kf, t));
      maxErr = Math.max(maxErr, err);
    }
    expect(maxErr).toBeGreaterThan(0.5 * Ac);
  });

  it('with zero message reduces to the unmodulated carrier', () => {
    expect(nbfmSignal([], fc, Ac, 1000, 0)).toBeCloseTo(Ac, 9);
  });
});

describe('heterodyneMix', () => {
  it('returns if and image fields', () => {
    const input = new Array(100).fill(0);
    const result = heterodyneMix(input, 10000, 455000, 1000000);
    expect(result).toHaveProperty('if');
    expect(result).toHaveProperty('image');
    expect(result.if).toHaveLength(100);
  });

  it('image frequency = fLo + fIf', () => {
    const fLo = 10000;
    const fIf = 455;
    const fs = 100000;
    const input = new Array(100).fill(0);
    const result = heterodyneMix(input, fLo, fIf, fs);
    expect(result.image).toBeCloseTo(fLo + fIf, 1);
  });
});

describe('fmDiscriminate', () => {
  // Build a clean FM signal: cos(2π·fc·t + 2π·kf·∫m dτ), m(t) = cos(2π·fm·t).
  const fs = 100_000;
  const fc = 5_000;
  const fm = 500;
  const beta = 3;
  const kf = beta * fm;
  const N = 4000;
  const dt = 1 / fs;
  const time = Array.from({ length: N }, (_, i) => i * dt);
  const original = time.map((t) => Math.cos(2 * Math.PI * fm * t));
  const integral: number[] = [0];
  for (let i = 1; i < N; i++) {
    integral.push(integral[i - 1] + 0.5 * (original[i] + original[i - 1]) * dt);
  }
  const fmSig = time.map((t, i) => Math.cos(2 * Math.PI * fc * t + 2 * Math.PI * kf * integral[i]));
  const recovered = fmDiscriminate(fmSig, fs, fc);

  it('returns same length as input', () => {
    expect(recovered).toHaveLength(N);
  });

  it('output is zero-mean (DC removed)', () => {
    const mean = recovered.reduce((a, b) => a + b, 0) / N;
    expect(Math.abs(mean)).toBeLessThan(0.05);
  });

  it('recovers m(t) with Pearson correlation >= 0.95', () => {
    const n = Math.min(original.length, recovered.length);
    let sumXY = 0, sumX2 = 0, sumY2 = 0;
    const peak = Math.max(...recovered.map(Math.abs));
    const norm = recovered.map((v) => (peak > 1e-10 ? v / peak : v));
    for (let i = 0; i < n; i++) {
      sumXY += original[i] * norm[i];
      sumX2 += original[i] ** 2;
      sumY2 += norm[i] ** 2;
    }
    const r = sumXY / Math.sqrt(sumX2 * sumY2);
    expect(r).toBeGreaterThanOrEqual(0.95);
  });

  it('does not throw on short or empty signals', () => {
    expect(() => fmDiscriminate([1, -1], fs, fc)).not.toThrow();
    expect(() => fmDiscriminate([], fs, fc)).not.toThrow();
  });
});

// ── FM Radio Broadcasting DSP helpers (§4.4 / §6.2.2) ──────────────────────

describe('preEmphasisMagDb', () => {
  it('returns 0 dB at f=0', () => {
    const [v] = preEmphasisMagDb([0], 2120);
    expect(v).toBeCloseTo(0, 10);
  });

  it('returns +3 dB at f = f1 (corner frequency)', () => {
    const f1 = 2120;
    const [v] = preEmphasisMagDb([f1], f1);
    expect(v).toBeCloseTo(10 * Math.log10(2), 5);
  });

  it('increases monotonically with frequency', () => {
    const freqs = [100, 500, 1000, 2000, 5000, 10000, 15000];
    const mags = preEmphasisMagDb(freqs, 2120);
    for (let i = 1; i < mags.length; i++) {
      expect(mags[i]).toBeGreaterThan(mags[i - 1]);
    }
  });
});

describe('deEmphasisMagDb', () => {
  it('returns 0 dB at f=0', () => {
    const [v] = deEmphasisMagDb([0], 2120);
    expect(v).toBeCloseTo(0, 10);
  });

  it('returns −3 dB at f = f1', () => {
    const f1 = 2120;
    const [v] = deEmphasisMagDb([f1], f1);
    expect(v).toBeCloseTo(-10 * Math.log10(2), 5);
  });

  it('is the exact negative of preEmphasisMagDb at every frequency', () => {
    const f1 = 2120;
    const freqs = [200, 1000, 2120, 5000, 15000];
    const pe = preEmphasisMagDb(freqs, f1);
    const de = deEmphasisMagDb(freqs, f1);
    for (let i = 0; i < freqs.length; i++) {
      expect(pe[i] + de[i]).toBeCloseTo(0, 10);
    }
  });
});

describe('emphasisSnrGainDb', () => {
  it('returns positive gain for W > f1', () => {
    expect(emphasisSnrGainDb(2120, 15000)).toBeGreaterThan(0);
  });

  it('returns ~13 dB at standard FM parameters (f1≈2.12 kHz, W=15 kHz)', () => {
    const gain = emphasisSnrGainDb(2120, 15000);
    // Typical value from Proakis §6.2.2 is approximately 13 dB
    expect(gain).toBeGreaterThan(12);
    expect(gain).toBeLessThan(15);
  });

  it('gain increases as f1 decreases (wider emphasis band)', () => {
    const W = 15000;
    const gain1 = emphasisSnrGainDb(3000, W);
    const gain2 = emphasisSnrGainDb(1000, W);
    expect(gain2).toBeGreaterThan(gain1);
  });
});

describe('stereoMuxSpectrum', () => {
  it('returns same length freq and mag arrays', () => {
    const { freqs, mag } = stereoMuxSpectrum(0.8);
    expect(freqs.length).toBe(mag.length);
    expect(freqs.length).toBeGreaterThan(0);
  });

  it('mag values are all in [0, 1]', () => {
    const { mag } = stereoMuxSpectrum(1.0);
    for (const v of mag) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('has near-zero L-R component when balance = 0', () => {
    const { freqs, mag } = stereoMuxSpectrum(0);
    // At 38 kHz (L-R DSB-SC band) magnitude should be 0
    const idx = freqs.findIndex((f) => Math.abs(f - 38000) < 200);
    expect(mag[idx]).toBeCloseTo(0, 5);
  });

  it('has nonzero L-R component when balance ≠ 0', () => {
    const { freqs, mag } = stereoMuxSpectrum(1.0);
    const idx38 = freqs.findIndex((f) => Math.abs(f - 38000) < 200);
    expect(mag[idx38]).toBeGreaterThan(0.1);
  });

  it('frequency axis starts at 0 and ends at 60 kHz', () => {
    const { freqs } = stereoMuxSpectrum(0.5);
    expect(freqs[0]).toBe(0);
    expect(freqs[freqs.length - 1]).toBeCloseTo(60000, 0);
  });
});

// ── fmPllDemodulate (§4.3.3, 2nd-order PLL) ────────────────────────────────
// Test parameters are chosen so Bn >> fm (loop bandwidth well above message
// frequency) — the PLL can only track FM when its noise bandwidth exceeds fm.
describe('fmPllDemodulate', () => {
  const fc = 10_000;
  const fm = 300;    // message freq: Bn/fm = 10 → clean tracking
  const beta = 1;    // modulation index: peak phase = 1 rad, within PLL linear range
  const kf = beta * fm;  // = 300 Hz
  const Bn = 3_000;  // loop bandwidth: 10× fm
  const zeta = 0.707;
  const fs = 20 * fc;  // = 200,000 Hz
  const duration = 6 / fm;  // 6 message periods ≈ 20 ms
  const N = Math.ceil(fs * duration);
  const dt = duration / (N - 1);

  // Build a simple FM signal: u(t) = cos(2π fc t + 2π kf ∫m(τ)dτ), m(t)=cos(2π fm t)
  const time = Array.from({ length: N }, (_, i) => i * dt);
  const original = time.map((tv) => Math.cos(2 * Math.PI * fm * tv));
  const integral: number[] = new Array(N);
  integral[0] = 0;
  for (let i = 1; i < N; i++) {
    integral[i] = integral[i - 1] + 0.5 * (original[i] + original[i - 1]) * dt;
  }
  const fmSig = integral.map((v, i) =>
    Math.cos(2 * Math.PI * fc * time[i] + 2 * Math.PI * kf * v),
  );

  // Helper: Pearson correlation between two arrays over [start, end)
  function correlation(a: number[], b: number[], start: number, end: number): number {
    let num = 0, da = 0, db = 0;
    for (let i = start; i < end; i++) {
      num += a[i] * b[i];
      da += a[i] * a[i];
      db += b[i] * b[i];
    }
    return num / Math.sqrt(da * db + 1e-20);
  }

  it('returns arrays of the same length as input', () => {
    const { recovered, phaseError } = fmPllDemodulate(fmSig, fc, fs, Bn, zeta);
    expect(recovered).toHaveLength(N);
    expect(phaseError).toHaveLength(N);
  });

  it('recovers a sine-wave message with correlation > 0.9 after transient', () => {
    const { recovered } = fmPllDemodulate(fmSig, fc, fs, Bn, zeta);
    const peak = Math.max(...recovered.map(Math.abs));
    const norm = peak > 1e-10 ? recovered.map((v) => v / peak) : recovered;
    // Skip first 25 % (transient), measure over remainder
    const start = Math.floor(N * 0.25);
    const corr = correlation(norm, original, start, N);
    expect(corr).toBeGreaterThan(0.9);
  });

  it('outputs near-zero when no FM modulation (pure carrier)', () => {
    const pureTone = time.map((tv) => Math.cos(2 * Math.PI * fc * tv));
    const { recovered } = fmPllDemodulate(pureTone, fc, fs, Bn, zeta);
    // After lock-on the VCO tracks the carrier, so control voltage → 0
    const start = Math.floor(N * 0.4);
    const rms = Math.sqrt(recovered.slice(start).reduce((s, v) => s + v * v, 0) / (N - start));
    expect(rms).toBeLessThan(0.05);
  });

  it('phase error decays — RMS in second half < RMS in first half', () => {
    const { phaseError } = fmPllDemodulate(fmSig, fc, fs, Bn, zeta);
    const mid = Math.floor(N / 2);
    const rmsFirst = Math.sqrt(phaseError.slice(0, mid).reduce((s, v) => s + v * v, 0) / mid);
    const rmsSecond = Math.sqrt(phaseError.slice(mid).reduce((s, v) => s + v * v, 0) / (N - mid));
    expect(rmsSecond).toBeLessThan(rmsFirst);
  });

  it('wider Bn converges faster — error RMS in first 15 % is smaller', () => {
    // Narrow loop (Bn=200) converges in ~4/(ζωn) ≈ 4.5 ms >> first 15 %
    // Wide loop (Bn=1500) converges in ~0.6 ms << first 15 %
    const { phaseError: peLow } = fmPllDemodulate(fmSig, fc, fs, 200, zeta);
    const { phaseError: peHigh } = fmPllDemodulate(fmSig, fc, fs, 1500, zeta);
    const end = Math.floor(N * 0.15);
    const rmsLow = Math.sqrt(peLow.slice(0, end).reduce((s, v) => s + v * v, 0) / end);
    const rmsHigh = Math.sqrt(peHigh.slice(0, end).reduce((s, v) => s + v * v, 0) / end);
    expect(rmsHigh).toBeLessThan(rmsLow);
  });
});
