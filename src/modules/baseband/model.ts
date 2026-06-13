// src/modules/baseband/model.ts — pure derived-data builders for the Baseband tabs (no React).
import { linspace } from '@/lib/dsp/math';
import {
  pulseWaveform,
  raisedCosineSpectrum,
  raisedCosineBandwidth,
  nyquistOffCenterSamples,
  type PulseKind,
} from '@/lib/dsp/pulse';
import { matchedFilter, matchedFilterOutput, correlate, pulseEnergy, peakSnr, convolve } from '@/lib/dsp/matchedfilter';
import { sigmaFromN0 } from '@/lib/dsp/awgn';
import { makeRng } from '@/lib/sim/sources';

export interface PulseParams {
  kind: PulseKind;
  alpha: number;
  sps: number;
  span: number;
}

export interface PulseView {
  t: number[];
  p: number[];
  offCenter: number[];
  freqs: number[];
  spectrum: number[];
  bandwidth: number;
  nyquist: number;
  excess: number;
}

export function buildPulseView(p: PulseParams): PulseView {
  const T = 1;
  const wave = pulseWaveform(p.kind, p.alpha, p.sps, p.span);
  const center = (wave.length - 1) / 2;
  const t = wave.map((_, i) => (i - center) / p.sps);
  const alpha = p.kind === 'sinc' ? 0 : p.alpha;
  const freqs = linspace(-1, 1, 401);
  const spectrum = freqs.map((f) => raisedCosineSpectrum(f, alpha, T));
  return {
    t,
    p: wave,
    offCenter: nyquistOffCenterSamples(wave, p.sps),
    freqs,
    spectrum,
    bandwidth: raisedCosineBandwidth(alpha, T),
    nyquist: 1 / (2 * T),
    excess: alpha,
  };
}

export interface ReceiverParams {
  alpha: number;
  sps: number;
  span: number;
  noise: boolean;
  n0: number;
}

export interface ReceiverView {
  t: number[];
  pulse: number[];
  matched: number[];
  mfOutput: number[];
  mfPeakIndex: number;
  energy: number;
  peakSnr: number;
  correlatorValue: number;
  mfAtT: number;
  rrcCascade: number[];
}

export function buildReceiverView(p: ReceiverParams): ReceiverView {
  const pulse = pulseWaveform('rc', p.alpha, p.sps, p.span);
  const matched = matchedFilter(pulse);
  let received = pulse.slice();
  if (p.noise) {
    const sigma = sigmaFromN0(p.n0);
    const rng = makeRng(7);
    received = received.map((v) => v + sigma * (rng() - 0.5) * 2);
  }
  const mfOutput = matchedFilterOutput(received, pulse);
  const energy = pulseEnergy(pulse);
  const rrc = pulseWaveform('rrc', p.alpha, p.sps, p.span);
  return {
    t: pulse.map((_, i) => (i - (pulse.length - 1) / 2) / p.sps),
    pulse,
    matched,
    mfOutput,
    mfPeakIndex: mfOutput.indexOf(Math.max(...mfOutput)),
    energy,
    peakSnr: peakSnr(energy, p.n0),
    correlatorValue: correlate(received, pulse),
    mfAtT: mfOutput[pulse.length - 1],
    rrcCascade: convolve(rrc, rrc),
  };
}
