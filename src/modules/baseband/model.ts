// src/modules/baseband/model.ts — pure derived-data builders for the Baseband tabs (no React).
import { linspace } from '@/lib/dsp/math';
import {
  pulseWaveform,
  raisedCosineSpectrum,
  raisedCosineBandwidth,
  nyquistOffCenterSamples,
  type PulseKind,
} from '@/lib/dsp/pulse';

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
