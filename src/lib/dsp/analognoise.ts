// Analog noise & SNR (Proakis & Salehi Ch 5). Pure, framework-free.
// Verify exact FM/threshold/emphasis constants against refs/Book.pdf §5.3 (PDF ~256-260).
import { amEfficiency } from './analog';

export type AnalogScheme = 'dsb' | 'ssb' | 'am' | 'fm';

export interface SnrParams {
  amIndex: number; // a (AM)
  beta: number; // β (FM)
  messagePower: number; // normalized message power P_Mn
  emphasis: boolean; // pre/de-emphasis (FM)
  W: number; // message bandwidth (Hz)
}

/** Linear SNR improvement factor of the output over the channel SNR γ = P_R/(N0 W). */
export function snrImprovement(scheme: AnalogScheme, p: SnrParams): number {
  switch (scheme) {
    case 'dsb':
    case 'ssb':
      return 1; // coherent: output SNR equals baseband SNR (Proakis §5.1)
    case 'am':
      return amEfficiency(p.amIndex, p.messagePower); // η = a²P/(1+a²P) (Proakis §5.1)
    case 'fm': {
      // FM gain ∝ β² (Proakis §5.3, eq. 5.3.24): 3β²·P_Mn (p. 243)
      const base = 3 * p.beta ** 2 * p.messagePower;
      return p.emphasis ? base * emphasisFactor(p.beta) : base;
    }
  }
}

/** Output SNR (dB) for a scheme at channel SNR γ (dB). */
export function outputSnrDb(scheme: AnalogScheme, channelSnrDb: number, p: SnrParams): number {
  return channelSnrDb + 10 * Math.log10(snrImprovement(scheme, p));
}

/** Demodulation gain (dB) = output SNR − channel SNR = 10log10(improvement). */
export function demodulationGainDb(scheme: AnalogScheme, p: SnrParams): number {
  return 10 * Math.log10(snrImprovement(scheme, p));
}

/** Pre/de-emphasis linear improvement factor for FM (placeholder constant >1; see Task 2). */
function emphasisFactor(beta: number): number {
  return 1 + 0.5 * beta; // replaced with the book expression in Task 2
}
