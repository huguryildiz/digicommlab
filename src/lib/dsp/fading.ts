/**
 * Time-variant multipath fading channel models.
 * Proakis & Salehi §10.1.1 (Channel Models for Time-Variant Multipath Channels).
 */

export interface Tap {
  /** Path delay in seconds. */
  delay: number;
  /** Average path power (linear, relative). */
  power: number;
}

/**
 * Exponential power-delay profile: p_k = exp(-tau_k / tauRms), normalized to unit
 * total power. Taps are equally spaced by `tapSpacing` seconds starting at delay 0.
 */
export function exponentialPdp(nTaps: number, tauRms: number, tapSpacing: number): Tap[] {
  const taps: Tap[] = [];
  let total = 0;
  for (let k = 0; k < nTaps; k++) {
    const delay = k * tapSpacing;
    const power = Math.exp(-delay / tauRms);
    taps.push({ delay, power });
    total += power;
  }
  for (const t of taps) t.power /= total; // normalize to unit total power
  return taps;
}

/** RMS delay spread sigma_tau = sqrt(E[tau^2] - E[tau]^2), power-weighted. */
export function rmsDelaySpread(taps: Tap[]): number {
  const p = taps.reduce((s, t) => s + t.power, 0);
  if (p === 0) return 0;
  const mean = taps.reduce((s, t) => s + t.power * t.delay, 0) / p;
  const meanSq = taps.reduce((s, t) => s + t.power * t.delay * t.delay, 0) / p;
  return Math.sqrt(Math.max(0, meanSq - mean * mean));
}

/** Coherence bandwidth B_c ≈ 1/(2π·sigma_tau). Proakis §10.1.1. */
export function coherenceBandwidth(sigmaTau: number): number {
  if (sigmaTau <= 0) return Infinity;
  return 1 / (2 * Math.PI * sigmaTau);
}

/** Coherence time T_c ≈ 1/(2π·f_D), with f_D the maximum Doppler shift (Hz). */
export function coherenceTime(fD: number): number {
  if (fD <= 0) return Infinity;
  return 1 / (2 * Math.PI * fD);
}
