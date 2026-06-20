// Carrier-phase recovery — phase-locked loop & ML phase estimation.
// Proakis & Salehi, Fundamentals of Communication Systems, §8.8.

export interface PllResult {
  /** Phase error φ − φ̂ at each step. */
  phaseError: number[];
  /** VCO phase estimate φ̂ at each step. */
  vco: number[];
}

/**
 * Discrete-time second-order PLL (Proakis §8.8.1). A proportional-plus-integral
 * loop filter on the phase detector drives the VCO; with unit loop gain the
 * closed loop matches ωn²/(s²+2ζωn·s+ωn²), so Kp = 2ζωn and Ki = ωn².
 * Input phase is a constant step φ0; returns the phase-error trajectory.
 */
export function simulatePll(opts: {
  zeta: number;
  omegaN: number;
  dt: number;
  steps: number;
  phi0: number;
}): PllResult {
  const { zeta, omegaN, dt, steps, phi0 } = opts;
  const Kp = 2 * zeta * omegaN;
  const Ki = omegaN * omegaN;
  let vco = 0; // φ̂
  let integ = 0; // loop-filter integrator state
  const phaseError: number[] = [];
  const vcoTrace: number[] = [];
  for (let n = 0; n < steps; n++) {
    const e = phi0 - vco; // phase detector (linearized)
    phaseError.push(e);
    vcoTrace.push(vco);
    integ += e * dt;
    const v = Kp * e + Ki * integ; // PI loop filter
    vco += v * dt; // VCO integrates the control voltage
  }
  return { phaseError, vco: vcoTrace };
}

/** Linearized PLL phase-error variance σ_φ² = 1/ρ_L (Proakis §8.8.1 Eq. 8.8.21). */
export function phaseErrorVariance(rhoL: number): number {
  return 1 / rhoL;
}

/**
 * Maximum-likelihood carrier-phase estimate from quadrature correlator outputs
 * (Proakis §8.8.4): φ̂ = arctan(Σ y_s / Σ y_c).
 */
export function mlPhaseEstimate(yc: number[], ys: number[]): number {
  let sc = 0;
  let ss = 0;
  for (let i = 0; i < yc.length; i++) {
    sc += yc[i];
    ss += ys[i];
  }
  return Math.atan2(ss, sc);
}
