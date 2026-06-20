// src/lib/dsp/eye.ts — eye-diagram traces and quantitative margins (Proakis §8.3, Fig 8.7).
import { pulseWaveform } from '@/lib/dsp/pulse';
import { convolve } from '@/lib/dsp/matchedfilter';

export interface EyeTrace {
  samples: number[];
  /** Symbol-pattern label for the formation build-up (e.g. "0 1 0"). */
  label?: string;
}

/** Slice a sampled baseband signal into overlapping windows of `spanSymbols` symbols (step = sps). */
export function eyeTraces(signal: number[], sps: number, spanSymbols: number): EyeTrace[] {
  const win = spanSymbols * sps;
  const traces: EyeTrace[] = [];
  for (let start = 0; start + win <= signal.length; start += sps) {
    traces.push({ samples: signal.slice(start, start + win) });
  }
  return traces;
}

export interface EyeMetrics {
  eyeHeight: number;
  noiseMargin: number;
  timingMargin: number;
}

/** Vertical opening at the center column, and how wide (in time) the eye stays open. */
export function eyeMetrics(traces: EyeTrace[], sps: number): EyeMetrics {
  if (traces.length === 0) return { eyeHeight: 0, noiseMargin: 0, timingMargin: 0 };
  const cols = traces[0].samples.length;
  const mid = Math.floor(cols / 2);

  const openingAt = (col: number): number => {
    let minUpper = Infinity;
    let maxLower = -Infinity;
    let sawUpper = false;
    let sawLower = false;
    for (const tr of traces) {
      const v = tr.samples[col];
      if (v >= 0) {
        sawUpper = true;
        if (v < minUpper) minUpper = v;
      } else {
        sawLower = true;
        if (v > maxLower) maxLower = v;
      }
    }
    if (!sawUpper || !sawLower) return 0;
    return minUpper - maxLower;
  };

  const eyeHeight = Math.max(0, openingAt(mid));
  let open = 0;
  for (let c = 0; c < cols; c++) if (openingAt(c) > 0) open++;
  return { eyeHeight, noiseMargin: eyeHeight / 2, timingMargin: Math.min(1, open / sps) };
}

// ── §10.3 Eye-pattern formation & ISI interpretation ────────────────────────

// Roll-off of the raised-cosine base pulse used for the ISI eye demonstration.
const ISI_ROLLOFF = 0.35;

/** M-ary PAM amplitude levels (Proakis §10.3): binary ±1, quaternary ±1, ±3. */
function pamLevelSet(M: 2 | 4): number[] {
  return M === 2 ? [-1, 1] : [-3, -1, 1, 3];
}

/**
 * Eye-pattern realizations for EVERY symbol sequence of length L = 2K+1 (Proakis §10.3,
 * Fig. 10.8). Each trace is the 2-symbol display window of y(t)=Σ_n a_n x(t−nT), where
 * the effective pulse x is a raised cosine passed through a one-symbol echo channel
 * [1, isiGain] — the ISI term of Eq. 10.3.3. isiGain=0 ⇒ Nyquist (eye open); larger
 * isiGain smears each symbol into its neighbour's sampling instant and closes the eye.
 */
export function isiEyePatterns(
  sps: number,
  M: 2 | 4,
  neighborK: number,
  isiGain: number,
): EyeTrace[] {
  const levels = pamLevelSet(M);
  const L = 2 * neighborK + 1;
  const span = neighborK + 1;
  const p = pulseWaveform('rc', ISI_ROLLOFF, sps, span);
  const pCenter = (p.length - 1) / 2;
  // One-symbol echo at symbol spacing: h[0]=1 (main pulse), h[sps]=isiGain (ISI tail).
  const h = new Array<number>(sps + 1).fill(0);
  h[0] = 1;
  h[sps] = isiGain;
  const x = convolve(p, h); // effective ISI pulse

  const win = 2 * sps; // 2-symbol display window (one open eye)
  const symbolName = (a: number): string => (M === 2 ? (a > 0 ? '1' : '0') : String(a));

  const traces: EyeTrace[] = [];
  const seq = new Array<number>(L).fill(levels[0]);
  const total = Math.pow(levels.length, L);

  for (let s = 0; s < total; s++) {
    let rem = s;
    for (let i = 0; i < L; i++) {
      seq[i] = levels[rem % levels.length];
      rem = Math.floor(rem / levels.length);
    }
    // Impulse train: symbol i at sample i*sps, convolved with the effective pulse.
    const impulses = new Array<number>(L * sps).fill(0);
    for (let i = 0; i < L; i++) impulses[i * sps] = seq[i];
    const sig = convolve(impulses, x);
    // Centre symbol (index K) peaks at sample K*sps + pCenter; window = ±1 symbol around it.
    const centerSample = neighborK * sps + pCenter;
    const start = Math.round(centerSample - sps);
    const samples = sig.slice(start, start + win);
    if (samples.length === win) {
      traces.push({ samples, label: seq.map(symbolName).join(' ') });
    }
  }
  return traces;
}

export interface EyeAnnotations {
  /** Best sampling instant (t/T) — column of maximum central opening. */
  samplingT: number;
  /** Inner upper / lower envelope of the central eye at the sampling instant. */
  eyeHi: number;
  eyeLo: number;
  /** Nominal decision levels (centre of the upper / lower rail). */
  idealHi: number;
  idealLo: number;
  /** Peak ISI deviation of the rail at the sampling instant. */
  peakDistortion: number;
  /** Half the vertical eye opening = margin against additive noise. */
  noiseMargin: number;
  /** Zero-crossing region (t/T) — its spread is the timing jitter. */
  crossLeftT: number;
  crossRightT: number;
  /** Width (t/T) over which the eye stays open (sampling time-window). */
  openWindow: number;
  /** |dy/dt| of the eye side near the crossing = sensitivity to timing error. */
  slope: number;
}

/**
 * Quantitative eye-diagram interpretation (Proakis Fig. 10.8b): best sampling time,
 * noise margin, peak distortion, zero-crossing jitter, sampling window, and the eye-side
 * slope. Derived from the per-column value distribution of the overlaid traces.
 */
export function eyeAnnotations(traces: EyeTrace[], sps: number): EyeAnnotations {
  const empty: EyeAnnotations = {
    samplingT: 1, eyeHi: 0, eyeLo: 0, idealHi: 0, idealLo: 0,
    peakDistortion: 0, noiseMargin: 0, crossLeftT: 1, crossRightT: 1,
    openWindow: 0, slope: 0,
  };
  if (traces.length === 0) return empty;
  const cols = traces[0].samples.length;

  let peak = 1;
  for (const tr of traces) for (const v of tr.samples) if (Math.abs(v) > peak) peak = Math.abs(v);
  const MIN_GAP = peak * 0.05;

  // Central gap = the value-gap straddling y=0 at a given column (the open eye around 0).
  const centralGap = (col: number): { lo: number; hi: number } | null => {
    const vals = traces.map((tr) => tr.samples[col]).sort((a, b) => a - b);
    let best: { lo: number; hi: number } | null = null;
    for (let j = 1; j < vals.length; j++) {
      const lo = vals[j - 1];
      const hi = vals[j];
      if (hi - lo > MIN_GAP && lo <= 0 && hi >= 0) best = { lo, hi };
    }
    return best;
  };

  // Best sampling column = the widest central opening. A 2-symbol window has open eyes at
  // every symbol centre (t/T = 0, 1, 2), so break ties toward the centre column (t/T = 1).
  const mid = Math.floor(cols / 2);
  const EPS = peak * 1e-3;
  let samplingCol = mid;
  let bestOpen = -1;
  let bestDist = Infinity;
  for (let c = 0; c < cols; c++) {
    const g = centralGap(c);
    const o = g ? g.hi - g.lo : 0;
    const dist = Math.abs(c - mid);
    if (o > bestOpen + EPS || (o > bestOpen - EPS && dist < bestDist)) {
      bestOpen = o;
      bestDist = dist;
      samplingCol = c;
    }
  }

  const g = centralGap(samplingCol) ?? { lo: 0, hi: 0 };
  const eyeHi = g.hi;
  const eyeLo = g.lo;

  // Rail spread at the sampling instant → ideal level + peak distortion.
  const atCol = traces.map((tr) => tr.samples[samplingCol]);
  const upper = atCol.filter((v) => v >= 0);
  const lower = atCol.filter((v) => v < 0);
  const uMax = Math.max(eyeHi, ...upper);
  const uMin = Math.min(eyeHi, ...upper);
  const idealHi = (uMax + uMin) / 2;
  const peakDistortion = (uMax - uMin) / 2;
  const idealLo = lower.length ? (Math.max(...lower) + Math.min(...lower)) / 2 : -idealHi;
  const noiseMargin = (eyeHi - eyeLo) / 2;

  // Zero-crossing window: walk outward from the sampling column until the central eye
  // closes (the gap straddling 0 disappears) — these are the two crossings bounding the eye.
  let crossLeftCol = samplingCol;
  while (crossLeftCol > 0 && centralGap(crossLeftCol - 1)) crossLeftCol--;
  let crossRightCol = samplingCol;
  while (crossRightCol < cols - 1 && centralGap(crossRightCol + 1)) crossRightCol++;
  const toT = (c: number): number => c / sps;
  const samplingT = toT(samplingCol);
  const crossLeftT = toT(crossLeftCol);
  const crossRightT = toT(crossRightCol);
  const openWindow = crossRightT - crossLeftT;
  const slope = samplingT > crossLeftT ? eyeHi / (samplingT - crossLeftT) : 0;

  return {
    samplingT, eyeHi, eyeLo, idealHi, idealLo,
    peakDistortion, noiseMargin, crossLeftT, crossRightT, openWindow, slope,
  };
}
