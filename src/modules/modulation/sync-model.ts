import { simulatePll } from '@/lib/dsp/pll';
import { raisedCosineAutocorr, earlyLateError, timingSCurve } from '@/lib/dsp/timing';

export interface PllParams {
  zeta: number;
  omegaN: number;
  phi0Deg: number;
}

export interface PllView {
  trace: { t: number; err: number }[];
  finalErrDeg: number;
  regime: 'under' | 'critical' | 'over';
}

const DT = 0.02;
const STEPS = 700;

/** Build the PLL lock-in trajectory (phase error vs time) for a step phase offset. */
export function buildPllView(p: PllParams): PllView {
  const { zeta, omegaN, phi0Deg } = p;
  const phi0 = (phi0Deg * Math.PI) / 180;
  const r = simulatePll({ zeta, omegaN, dt: DT, steps: STEPS, phi0 });
  const trace = r.phaseError.map((err, i) => ({ t: i * DT, err }));
  const regime = zeta < 0.95 ? 'under' : zeta > 1.05 ? 'over' : 'critical';
  return {
    trace,
    finalErrDeg: (r.phaseError[r.phaseError.length - 1] * 180) / Math.PI,
    regime,
  };
}

export interface TimingParams {
  tau: number;
  delta: number;
}

export interface TimingView {
  autocorr: { x: number; y: number }[];
  early: { x: number; y: number };
  late: { x: number; y: number };
  peak: { x: number; y: number };
  sCurve: { tau: number; error: number }[];
  errorNow: number;
}

/** Build the early-late gate view: autocorrelation, the two gate samples, and the S-curve. */
export function buildTimingView(p: TimingParams): TimingView {
  const { tau, delta } = p;
  // Autocorrelation peak sits at the true symbol instant (x = 0); the receiver's
  // early/late gates straddle its offset clock at x = τ.
  const autocorr: { x: number; y: number }[] = [];
  for (let i = 0; i <= 120; i++) {
    const x = -1.2 + (2.4 * i) / 120;
    autocorr.push({ x, y: raisedCosineAutocorr(x) });
  }
  return {
    autocorr,
    early: { x: tau - delta, y: raisedCosineAutocorr(tau - delta) },
    late: { x: tau + delta, y: raisedCosineAutocorr(tau + delta) },
    peak: { x: 0, y: 1 },
    sCurve: timingSCurve(delta, 81),
    errorNow: earlyLateError(tau, delta),
  };
}
