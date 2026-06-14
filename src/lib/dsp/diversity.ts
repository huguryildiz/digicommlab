/**
 * Error performance of binary modulation on a frequency-nonselective Rayleigh
 * fading channel, and improvement through diversity (MRC).
 * Proakis & Salehi §10.1.3–§10.1.4.
 */
import { qfunc } from '@/lib/dsp/math';

/** dB → linear power ratio. */
function lin(db: number): number {
  return 10 ** (db / 10);
}

/** AWGN antipodal (BPSK) bit-error probability: P_b = Q(sqrt(2 γ_b)). */
export function awgnBerAntipodal(gammaBdB: number): number {
  return qfunc(Math.sqrt(2 * lin(gammaBdB)));
}

/**
 * Rayleigh-fading antipodal bit-error probability averaged over the fading:
 * P_b = ½[1 − √(γ̄_b/(1+γ̄_b))]. Proakis Eq. (10.1.24).
 */
export function rayleighBerAntipodal(gammaBarBdB: number): number {
  const g = lin(gammaBarBdB);
  return 0.5 * (1 - Math.sqrt(g / (1 + g)));
}

/**
 * Rayleigh-fading orthogonal (BFSK) bit-error probability:
 * P_b = ½[1 − √(γ̄_b/(2+γ̄_b))]. Proakis Eq. (10.1.29).
 */
export function rayleighBerOrthogonal(gammaBarBdB: number): number {
  const g = lin(gammaBarBdB);
  return 0.5 * (1 - Math.sqrt(g / (2 + g)));
}
