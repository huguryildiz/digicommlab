// Regenerative vs analog repeaters over a K-hop link.
// Proakis & Salehi, Fundamentals of Communication Systems, §8.10.

import { qfunc, qfuncInv } from './math';
import { ebN0Linear } from './awgn';

/**
 * K cascaded REGENERATIVE repeaters (Eq. 8.10.1): each hop detects and re-transmits,
 * so bit errors add over the hops — P_b ≈ K · Q(√(2·Eb/N0)).
 */
export function regenerativeBer(K: number, ebN0Db: number): number {
  const g = ebN0Linear(ebN0Db);
  return Math.min(1, K * qfunc(Math.sqrt(2 * g)));
}

/**
 * K cascaded ANALOG repeaters (Eq. 8.10.2): each hop amplifies signal AND noise,
 * so noise accumulates and the effective SNR is divided by K —
 * P_b = Q(√(2·Eb/(K·N0))).
 */
export function analogBer(K: number, ebN0Db: number): number {
  const g = ebN0Linear(ebN0Db);
  return qfunc(Math.sqrt((2 * g) / K));
}

/** Eb/N0 (dB) the regenerative link needs to reach `targetBer`: solve K·Q(√(2g)) = target. */
export function requiredEbN0DbRegen(K: number, targetBer: number): number {
  const x = qfuncInv(targetBer / K); // √(2g)
  const g = (x * x) / 2;
  return 10 * Math.log10(g);
}

/** Eb/N0 (dB) the analog link needs to reach `targetBer`: solve Q(√(2g/K)) = target. */
export function requiredEbN0DbAnalog(K: number, targetBer: number): number {
  const x = qfuncInv(targetBer); // √(2g/K)
  const g = (K * x * x) / 2;
  return 10 * Math.log10(g);
}
