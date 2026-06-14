/**
 * Live "instrument" model for the hero oscilloscope.
 *
 * One slowly-breathing parameter — the bit SNR Eb/N0 — drives both the HUD
 * readouts and the visible trace noise, so the number on screen and the noise
 * you actually see always agree (an honest instrument, not decorative digits).
 *
 * Formula — Proakis & Salehi, *Fundamentals of Communication Systems*:
 *   • BPSK bit-error probability:  P_b = Q(√(2·Eb/N0))   (§8.6, p. ~404)
 */
import { qfunc } from '@/lib/dsp/math';

/** Line-code spec shown on the hero scope (fixed). Manchester @ 10 Mb/s ≈ 10BASE-T. */
export const LINE_RATE_MBPS = 10;
export const LINE_CODE = 'MANCHESTER';
/** One full breathing cycle of Eb/N0, in ms. */
export const BREATH_PERIOD_MS = 16000;

const EBN0_LO_DB = 7;
const EBN0_HI_DB = 11;

export interface ScopeMetrics {
  /** Bit SNR Eb/N0, in dB. */
  ebn0Db: number;
  /** BPSK bit-error probability at this Eb/N0. */
  ber: number;
  /** Trace-noise standard deviation, in CSS px (tied to Eb/N0). */
  noisePx: number;
  /** Measured line rate, in Mb/s (wanders around the nominal spec). */
  dataRateMbps: number;
}

/** Sample the live model at wall-clock time `nowMs`. */
export function scopeMetrics(now: number): ScopeMetrics {
  // Raised-cosine breathing: Eb/N0 glides LO → HI → LO, dwelling at the ends.
  const phase = (now % BREATH_PERIOD_MS) / BREATH_PERIOD_MS; // 0..1
  const s = 0.5 - 0.5 * Math.cos(phase * 2 * Math.PI); // 0..1..0
  const ebn0Db = EBN0_LO_DB + (EBN0_HI_DB - EBN0_LO_DB) * s;
  const gamma = 10 ** (ebn0Db / 10);
  const ber = qfunc(Math.sqrt(2 * gamma)); // BPSK: P_b = Q(√(2·Eb/N0))
  const noisePx = Math.min(5, Math.max(1.5, 9 / Math.sqrt(gamma)));
  // Two detuned sines → organic "measured throughput" wander, ±~0.8 Mb/s.
  const dataRateMbps = LINE_RATE_MBPS + 0.5 * Math.sin(now / 1430) + 0.3 * Math.sin(now / 610);
  return { ebn0Db, ber, noisePx, dataRateMbps };
}

/** Wall clock with a safe fallback for non-browser contexts. */
export function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : 0;
}

/* ───────────────────────── Manchester line code ─────────────────────────
 * One shared pseudo-random bit ring feeds both the scrolling square-wave trace
 * and the HUD's bit feed, so the waveform on screen and the bits in the corner
 * are literally the same sequence.
 */

/** Bits in the repeating ring. */
const BIT_RING_LEN = 32;
const BIT_RING: number[] = Array.from({ length: BIT_RING_LEN }, () =>
  Math.random() < 0.5 ? 0 : 1,
);

/** Manchester bit cells visible across the scope at once. */
export const BITS_ON_SCREEN = 8;
/** Scroll speed of the line code, in bits per second. */
const BIT_RATE = 2.4;

/** Bit value at ring index `i` (wraps both directions). */
export function bitAt(i: number): number {
  return BIT_RING[((i % BIT_RING_LEN) + BIT_RING_LEN) % BIT_RING_LEN];
}

/** Fractional bit position scrolled past the left edge at time `now` (ms). */
export function bitScroll(now: number): number {
  return (now / 1000) * BIT_RATE;
}

/**
 * Manchester (IEEE 802.3) level at fractional bit position `pos`.
 * Convention: logic 1 = low→high transition at mid-bit, logic 0 = high→low.
 * Returns +1 (high) or −1 (low).
 */
export function manchesterLevel(pos: number): number {
  const secondHalf = pos - Math.floor(pos) >= 0.5;
  const high = bitAt(Math.floor(pos)) === 1 ? secondHalf : !secondHalf;
  return high ? 1 : -1;
}
